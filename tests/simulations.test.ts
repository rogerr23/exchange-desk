import { afterEach, describe, expect, it, vi } from "vitest";
import { convertAmount } from "@/domain/conversion";
import { simulationInputSchema } from "@/schemas/simulation";
import { createQuoteProvider, QUOTE_CACHE_MS } from "@/server/quotes/frankfurter";
import { signSimulation, verifySimulation, SIMULATION_TTL_MS } from "@/server/quotes/simulation-token";

const now = Date.parse("2026-10-31T12:00:00.000Z");
const payload = {
  version: 1 as const, actorId: "employee-1", sourceCurrency: "USD" as const,
  targetCurrency: "BRL" as const, sourceAmount: "100.00", targetAmount: "512.35",
  exchangeRate: "5.12345678", quoteProvider: "Frankfurter / ECB" as const,
  quoteReferenceDate: "2026-10-30", quoteTimestamp: new Date(now).toISOString(),
  quoteTimestampKind: "FETCHED_AT" as const, quoteFetchedAt: new Date(now).toISOString(),
  issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + SIMULATION_TTL_MS).toISOString(),
};
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

it("arredonda a taxa antes do produto e preserva precisão até o limite das colunas", () => {
  expect(convertAmount("100", "5.12345678")).toEqual({ sourceAmount: "100.00", exchangeRate: "5.12345678", targetAmount: "512.35" });
  expect(convertAmount("1", "1.005").targetAmount).toBe("1.01");
  expect(convertAmount("1000000", "1.000000005").targetAmount).toBe("1000000.01");
  expect(convertAmount("9999999999999999.99", "1").targetAmount).toBe("9999999999999999.99");
  expect(() => convertAmount("0.01", "0.00000001")).toThrow(RangeError);
  expect(() => convertAmount("9999999999999999.99", "2")).toThrow(RangeError);
});

it("recusa moedas iguais, valores inválidos, excesso de casas e campos arbitrários", () => {
  for (const patch of [
    { sourceCurrency: "GBP" }, { targetCurrency: "USD" }, { sourceAmount: "0" },
    { sourceAmount: "-1" }, { sourceAmount: "1.001" }, { sourceAmount: 10 },
    { sourceAmount: "1,00" }, { sourceAmount: "10000000000000000" }, { exchangeRate: "2" },
  ]) {
    expect(simulationInputSchema.safeParse({ sourceCurrency: "USD", targetCurrency: "BRL", sourceAmount: "1.00", ...patch }).success).toBe(false);
  }
});

describe("adaptador de cotações", () => {
  it.each([
    ["BRL", "USD"], ["BRL", "EUR"], ["USD", "BRL"],
    ["USD", "EUR"], ["EUR", "BRL"], ["EUR", "USD"],
  ] as const)("normaliza %s → %s e mantém referência diária separada da consulta", async (base, quote) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json([{ date: "2026-10-30", base, quote, rate: 1.234567895 }]));
    const result = await createQuoteProvider(fetcher, () => now)(base, quote);
    expect(result).toMatchObject({ sourceCurrency: base, targetCurrency: quote, exchangeRate: "1.23456790", quoteReferenceDate: "2026-10-30", quoteTimestampKind: "FETCHED_AT", quoteFetchedAt: new Date(now).toISOString() });
    const url = fetcher.mock.calls[0][0] as URL;
    expect(url.searchParams.get("base")).toBe(base);
    expect(url.searchParams.get("quotes")).toBe(quote);
  });

  it("reutiliza o cache até a expiração e não usa nem renova uma entrada vencida após falha", async () => {
    let clock = now;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json([{ date: "2026-10-30", base: "USD", quote: "BRL", rate: 5 }]));
    const provider = createQuoteProvider(fetcher, () => clock);
    const first = await provider("USD", "BRL");
    clock += QUOTE_CACHE_MS - 1;
    expect(await provider("USD", "BRL")).toEqual(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
    clock++;
    fetcher.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await expect(provider("USD", "BRL")).rejects.toMatchObject({ status: 503, code: "QUOTE_UNAVAILABLE" });
    expect((await provider("USD", "BRL")).quoteFetchedAt).toBe(new Date(clock).toISOString());
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("recusa respostas inválidas sem produzir cotação substituta", async () => {
    for (const body of [[], [{ date: "2026-10-30", base: "USD", quote: "EUR", rate: 5 }],
      [{ date: "2026-11-01", base: "USD", quote: "BRL", rate: 5 }],
      [{ date: "2026-02-30", base: "USD", quote: "BRL", rate: 5 }],
      [{ date: "2026-10-30", base: "USD", quote: "BRL", rate: 0 }],
    ]) {
      await expect(createQuoteProvider(vi.fn<typeof fetch>().mockResolvedValue(Response.json(body)), () => now)("USD", "BRL")).rejects.toMatchObject({ status: 503 });
    }
  });

  it("aborta uma consulta pendente em 5 segundos sem repetir a chamada", async () => {
    // AbortSignal.timeout usa o relógio nativo do Node; substituir somente sua criação.
    vi.useFakeTimers();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    });
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }));
    try {
      const pending = expect(createQuoteProvider(fetcher, () => now)("USD", "BRL")).rejects.toMatchObject({ code: "QUOTE_UNAVAILABLE" });
      await vi.advanceTimersByTimeAsync(5000);
      await pending;
      expect(timeout).toHaveBeenCalledWith(5000);
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally { timeout.mockRestore(); }
  });
});

it("preserva a simulação assinada e recusa adulteração, expiração e outro funcionário", () => {
  vi.stubEnv("AUTH_SECRET", "segredo exclusivo do teste de simulação");
  const token = signSimulation(payload);
  expect(verifySimulation(token, payload.actorId, now)).toEqual(payload);
  const [content, signature] = token.split(".");
  const modified = Buffer.from(JSON.stringify({ ...payload, targetAmount: "999.00" })).toString("base64url");
  for (const candidate of [`${modified}.${signature}`, `${content}.abc`, "invalid"]) {
    expect(() => verifySimulation(candidate, payload.actorId, now)).toThrow(/inválida/);
  }
  expect(() => verifySimulation(token, "other", now)).toThrow(/inválida/);
  expect(() => verifySimulation(token, payload.actorId, now + SIMULATION_TTL_MS)).toThrow(/expirou/);
  expect(() => verifySimulation(signSimulation({ ...payload, targetAmount: "999.00" }), payload.actorId, now)).toThrow(/inválida/);
});

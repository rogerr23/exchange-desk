import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/server/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/server/db/client", () => ({ getDb: vi.fn() }));
vi.mock("@/server/quotes/frankfurter", () => ({ getQuote: vi.fn() }));

import { auth } from "@/server/auth/config";
import { getDb } from "@/server/db/client";
import { getQuote } from "@/server/quotes/frankfurter";
import { verifySimulation } from "@/server/quotes/simulation-token";
import { AppError } from "@/server/errors";
import { POST } from "@/app/api/simulacoes/route";

afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });

it("protege a simulação e salva histórico e retorna resultado verificável sem gravar operações", async () => {
  vi.stubEnv("AUTH_SECRET", "segredo exclusivo do teste da rota");
  const request = () => new Request("http://localhost:3000/api/simulacoes", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceCurrency: "USD", targetCurrency: "BRL", sourceAmount: "100" }),
  });
  vi.mocked(auth).mockResolvedValue(null as never);
  expect((await POST(request())).status).toBe(401);
  expect(getQuote).not.toHaveBeenCalled();

  vi.mocked(auth).mockResolvedValue({ user: { id: "operator" } } as never);
  const saveSimulation = vi.fn().mockResolvedValue({});
  // O histórico é independente: não há método para criar uma operação neste mock.
  vi.mocked(getDb).mockReturnValue({ simulation: { create: saveSimulation }, user: { findUnique: vi.fn().mockResolvedValue({ id: "operator", role: "CONSULTANT" }) } } as unknown as ReturnType<typeof getDb>);
  const timestamp = new Date().toISOString();
  vi.mocked(getQuote).mockResolvedValue({ sourceCurrency: "USD", targetCurrency: "BRL", exchangeRate: "5.12345678", quoteProvider: "Frankfurter / ECB", quoteReferenceDate: timestamp.slice(0, 10), quoteFetchedAt: timestamp, quoteTimestamp: timestamp, quoteTimestampKind: "FETCHED_AT" });
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const { data } = await response.json();
  expect(data.targetAmount).toBe("512.35");
  expect(saveSimulation).toHaveBeenCalledTimes(1);
  expect(saveSimulation.mock.calls[0][0].data).toMatchObject({ createdById: "operator", sourceAmount: "100.00", targetAmount: "512.35" });
  expect(saveSimulation.mock.calls[0][0].data).not.toHaveProperty("simulationToken");
  expect(verifySimulation(data.simulationToken, "operator")).toMatchObject({ sourceAmount: "100.00", targetAmount: "512.35" });

  vi.mocked(getQuote).mockRejectedValue(new AppError(503, "QUOTE_UNAVAILABLE", "Não foi possível consultar a cotação agora. Tente novamente em instantes."));
  const unavailable = await POST(request());
  expect(unavailable.status).toBe(503);
  expect(saveSimulation).toHaveBeenCalledTimes(1);
  expect(await unavailable.json()).toEqual({ error: { code: "QUOTE_UNAVAILABLE", message: "Não foi possível consultar a cotação agora. Tente novamente em instantes." } });
});

it("não entrega uma simulação confirmável quando o histórico não pode ser salvo", async () => {
  vi.stubEnv("AUTH_SECRET", "segredo exclusivo do teste da rota");
  vi.mocked(auth).mockResolvedValue({ user: { id: "operator" } } as never);
  vi.mocked(getDb).mockReturnValue({
    user: { findUnique: vi.fn().mockResolvedValue({ id: "operator", role: "CONSULTANT" }) },
    simulation: { create: vi.fn().mockRejectedValue(new Error("database unavailable")) },
  } as unknown as ReturnType<typeof getDb>);
  const timestamp = new Date().toISOString();
  vi.mocked(getQuote).mockResolvedValue({ sourceCurrency: "USD", targetCurrency: "BRL", exchangeRate: "5.12345678", quoteProvider: "Frankfurter / ECB", quoteReferenceDate: timestamp.slice(0, 10), quoteFetchedAt: timestamp, quoteTimestamp: timestamp, quoteTimestampKind: "FETCHED_AT" });
  const response = await POST(new Request("http://localhost:3000/api/simulacoes", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceCurrency: "USD", targetCurrency: "BRL", sourceAmount: "100" }),
  }));
  expect(response.status).toBe(500);
  expect(await response.json()).not.toHaveProperty("data");
});

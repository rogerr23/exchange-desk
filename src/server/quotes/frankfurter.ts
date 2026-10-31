import "server-only";
import { z } from "zod";
import { normalizeRate } from "@/domain/conversion";
import { currencySchema, type Currency, type Quote } from "@/schemas/simulation";
import { AppError } from "@/server/errors";

export const QUOTE_CACHE_MS = 15 * 60 * 1000;
const rowSchema = z.object({
  date: z.iso.date(), base: currencySchema, quote: currencySchema,
  rate: z.number().finite().positive(),
});

// Uma instância por processo, limitada aos seis pares aceitos pelo schema.
export function createQuoteProvider(fetcher: typeof fetch = fetch, now = Date.now) {
  const cache = new Map<string, { quote: Quote; expiresAt: number }>();
  return async function getQuote(source: Currency, target: Currency): Promise<Quote> {
    // Também protege chamadas diretas do serviço, fora do schema HTTP.
    currencySchema.parse(source);
    currencySchema.parse(target);
    if (source === target) throw new AppError(400, "INVALID_PAIR", "Escolha moedas diferentes.");
    const key = `${source}:${target}`;
    const cached = cache.get(key);
    if (cached && now() < cached.expiresAt) return { ...cached.quote };
    cache.delete(key);
    try {
      const url = new URL("https://api.frankfurter.dev/v2/providers/ecb/rates");
      url.searchParams.set("base", source);
      url.searchParams.set("quotes", target);
      const response = await fetcher(url, {
        signal: AbortSignal.timeout(5000), cache: "no-store", headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Provider HTTP error");
      const rows = z.array(rowSchema).length(1).parse(await response.json());
      const row = rows[0];
      const fetchedAt = now();
      const timestamp = new Date(fetchedAt).toISOString();
      if (row.base !== source || row.quote !== target || row.date > timestamp.slice(0, 10)) {
        throw new Error("Invalid quote reference");
      }
      const quote: Quote = {
        sourceCurrency: source, targetCurrency: target, exchangeRate: normalizeRate(String(row.rate)),
        quoteProvider: "Frankfurter / ECB", quoteReferenceDate: row.date,
        quoteTimestamp: timestamp, quoteTimestampKind: "FETCHED_AT", quoteFetchedAt: timestamp,
      };
      cache.set(key, { quote, expiresAt: fetchedAt + QUOTE_CACHE_MS });
      return { ...quote };
    } catch {
      throw new AppError(503, "QUOTE_UNAVAILABLE", "Não foi possível consultar a cotação agora. Tente novamente em instantes.");
    }
  };
}

export const getQuote = createQuoteProvider();

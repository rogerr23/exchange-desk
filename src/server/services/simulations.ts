import "server-only";
import { randomUUID } from "node:crypto";
import { convertAmount } from "@/domain/conversion";
import { simulationInputSchema } from "@/schemas/simulation";
import { requirePermission } from "@/server/auth/authorize";
import { AppError } from "@/server/errors";
import { getQuote } from "@/server/quotes/frankfurter";
import { signSimulation, SIMULATION_TTL_MS } from "@/server/quotes/simulation-token";

export async function simulateConversion(input: unknown) {
  const actor = await requirePermission("quotes:simulate");
  const data = simulationInputSchema.parse(input);
  const quote = await getQuote(data.sourceCurrency, data.targetCurrency);
  let values;
  try {
    values = convertAmount(data.sourceAmount, quote.exchangeRate);
  } catch (error) {
    if (error instanceof RangeError) throw new AppError(400, "AMOUNT_OUT_OF_RANGE", error.message);
    throw error;
  }
  const issuedAt = Date.now();
  const result = {
    ...quote, ...values,
    issuedAt: new Date(issuedAt).toISOString(),
    expiresAt: new Date(issuedAt + SIMULATION_TTL_MS).toISOString(),
  };
  return { ...result, simulationToken: signSimulation({ ...result, simulationId: randomUUID(), version: 1, actorId: actor.id }) };
}

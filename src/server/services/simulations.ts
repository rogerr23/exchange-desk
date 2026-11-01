import "server-only";
import { randomUUID } from "node:crypto";
import { convertAmount } from "@/domain/conversion";
import { simulationInputSchema } from "@/schemas/simulation";
import { requirePermission } from "@/server/auth/authorize";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { getQuote } from "@/server/quotes/frankfurter";
import { signSimulation, simulationConfirmationKey, SIMULATION_TTL_MS } from "@/server/quotes/simulation-token";

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
  const payload = { ...result, simulationId: randomUUID(), version: 1 as const, actorId: actor.id };
  const simulationToken = signSimulation(payload);
  await getDb().simulation.create({
    data: {
      id: payload.simulationId, confirmationKey: simulationConfirmationKey(payload), createdById: actor.id,
      sourceCurrency: result.sourceCurrency, targetCurrency: result.targetCurrency,
      sourceAmount: result.sourceAmount, targetAmount: result.targetAmount, exchangeRate: result.exchangeRate,
      quoteProvider: result.quoteProvider, quoteReferenceDate: new Date(`${result.quoteReferenceDate}T00:00:00.000Z`),
      quoteFetchedAt: new Date(result.quoteFetchedAt), issuedAt: new Date(result.issuedAt), expiresAt: new Date(result.expiresAt),
    },
  });
  return { ...result, simulationToken };
}

export async function listSimulations(limit = 50) {
  const actor = await requirePermission("simulations:read");
  const scope = { createdById: actor.id };
  const db = getDb();
  const rows = await db.simulation.findMany({
    where: scope, orderBy: [{ issuedAt: "desc" }, { id: "asc" }], take: Math.min(limit, 50),
    include: { createdBy: { select: { id: true, name: true } } },
  });
  const operations = rows.length ? await db.exchangeOperation.findMany({
    where: { ...scope, confirmationKey: { in: rows.map((row) => row.confirmationKey) } },
    select: { id: true, confirmationKey: true },
  }) : [];
  const proposals = rows.length ? await db.proposal.findMany({
    where: { ...scope, confirmationKey: { in: rows.map((row) => row.confirmationKey) } },
    select: { id: true, confirmationKey: true },
  }) : [];
  const proposalIds = new Map(proposals.map((proposal) => [proposal.confirmationKey, proposal.id]));
  const operationIds = new Map(operations.map((operation) => [operation.confirmationKey, operation.id]));
  return rows.map(({ confirmationKey, ...row }) => ({
    ...row, sourceAmount: row.sourceAmount.toFixed(2), targetAmount: row.targetAmount.toFixed(2),
    exchangeRate: row.exchangeRate.toFixed(8), quoteReferenceDate: row.quoteReferenceDate.toISOString().slice(0, 10),
    operationId: operationIds.get(confirmationKey) ?? null,
    proposalId: proposalIds.get(confirmationKey) ?? null,
  }));
}

export async function getSimulationCount() {
  const actor = await requirePermission("simulations:read");
  return getDb().simulation.count({ where: { createdById: actor.id } });
}

import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { startProcessingSchema, finishProcessingSchema, operationIdSchema } from "@/schemas/operation";
import { requirePermission } from "@/server/auth/authorize";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { operationDetailSelect, serializeOperation } from "./operations";

export const PROCESSING_DELAY_MS = 2000;
export const SIMULATED_FAILURE_REASON = "Falha simulada. Nenhum pagamento foi executado. Uma nova tentativa pode ser iniciada.";
function conflict() {
  return new AppError(409, "PROCESSING_CONFLICT", "O processamento foi alterado. Atualize os dados para conferir a tentativa atual.");
}
async function currentOperation(tx: Prisma.TransactionClient, id: string, actorId: string) {
  const operation = await tx.exchangeOperation.findUnique({ where: { id }, select: operationDetailSelect });
  if (!operation) throw new AppError(404, "NOT_FOUND", "Operação não encontrada.");
  if (operation.createdById === actorId) throw new AppError(403, "SELF_REVIEW_FORBIDDEN", "Você não pode processar uma operação de sua autoria, mesmo após mudança de perfil.");
  const request = await tx.exchangeRequest.findUnique({ where: { operationId: id }, select: { status: true } });
  if (request?.status !== "APPROVED") throw new AppError(409, "APPROVED_REQUEST_REQUIRED", "O processamento simulado exige uma operação vinculada a uma solicitação aprovada.");
  return operation;
}

export async function startOperationProcessing(inputId: string, input: unknown) {
  const actor = await requirePermission("operations:process");
  const id = operationIdSchema.parse(inputId);
  const { expectedAttemptCount, scenario } = startProcessingSchema.parse(input);
  const row = await getDb().$transaction(async (tx) => {
    const current = await currentOperation(tx, id, actor.id);
    function repeated(latest: typeof current) {
      const attempt = latest.processingAttempts[0];
      if (latest.processingAttemptCount === expectedAttemptCount + 1 && attempt?.number === expectedAttemptCount + 1 && attempt.scenario === scenario) return latest;
      throw conflict();
    }
    // Um reenvio, inclusive após conclusão, não inicia outra tentativa.
    if (current.processingAttemptCount !== expectedAttemptCount) return repeated(current);
    if (current.status !== "PENDING" && current.status !== "FAILED") throw conflict();
    const updated = await tx.exchangeOperation.updateMany({
      where: { id, status: current.status, processingAttemptCount: expectedAttemptCount },
      data: { status: "PROCESSING", processingAttemptCount: { increment: 1 } },
    });
    if (!updated.count) return repeated(await tx.exchangeOperation.findUniqueOrThrow({ where: { id }, select: operationDetailSelect }));
    const now = new Date();
    await tx.operationProcessingAttempt.create({ data: {
      operationId: id, number: expectedAttemptCount + 1, scenario, startedById: actor.id,
      startedAt: now, readyAt: new Date(now.getTime() + PROCESSING_DELAY_MS),
    } });
    await tx.operationAuditEvent.create({ data: {
      operationId: id, actorId: actor.id, action: "STATUS_CHANGED", previousStatus: current.status, newStatus: "PROCESSING", occurredAt: now,
    } });
    return tx.exchangeOperation.findUniqueOrThrow({ where: { id }, select: operationDetailSelect });
  });
  return serializeOperation(row);
}

export async function finishOperationProcessing(inputId: string, input: unknown) {
  const actor = await requirePermission("operations:process");
  const id = operationIdSchema.parse(inputId);
  const { attemptId } = finishProcessingSchema.parse(input);
  const row = await getDb().$transaction(async (tx) => {
    const current = await currentOperation(tx, id, actor.id);
    const attempt = current.processingAttempts[0];
    if (!attempt || attempt.id !== attemptId) throw conflict();
    if (attempt.finishedAt) return current;
    if (current.status !== "PROCESSING") throw conflict();
    const now = new Date();
    if (now < attempt.readyAt) throw new AppError(409, "PROCESSING_NOT_READY", "A tentativa ainda está processando. Aguarde alguns instantes.");
    const status = attempt.scenario === "SUCCESS" ? "COMPLETED" : "FAILED";
    const updated = await tx.exchangeOperation.updateMany({
      where: { id, status: "PROCESSING", processingAttemptCount: attempt.number }, data: { status },
    });
    if (!updated.count) {
      const latest = await tx.exchangeOperation.findUniqueOrThrow({ where: { id }, select: operationDetailSelect });
      if (latest.processingAttempts[0]?.id === attemptId && latest.processingAttempts[0].finishedAt) return latest;
      throw conflict();
    }
    await tx.operationProcessingAttempt.update({ where: { id: attemptId }, data: {
      finishedAt: now, failureReason: status === "FAILED" ? SIMULATED_FAILURE_REASON : null,
    } });
    await tx.operationAuditEvent.create({ data: {
      operationId: id, actorId: actor.id, action: "STATUS_CHANGED", previousStatus: "PROCESSING", newStatus: status, occurredAt: now,
    } });
    return tx.exchangeOperation.findUniqueOrThrow({ where: { id }, select: operationDetailSelect });
  });
  return serializeOperation(row);
}

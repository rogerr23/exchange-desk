import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { operationScope } from "@/domain/permissions";
import { canChangeStatus } from "@/domain/operation-status";
import { changeOperationStatusSchema, operationIdSchema } from "@/schemas/operation";
import { requirePermission } from "@/server/auth/authorize";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";

const operationSelect = {
  id: true, customerId: true, createdById: true,
  sourceCurrency: true, targetCurrency: true, sourceAmount: true, targetAmount: true,
  exchangeRate: true, quoteProvider: true, quoteReferenceDate: true,
  quoteTimestamp: true, quoteTimestampKind: true, quoteFetchedAt: true,
  status: true, createdAt: true, updatedAt: true,
  customer: { select: { id: true, name: true, fictionalCpf: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.ExchangeOperationSelect;
const detailSelect = {
  ...operationSelect,
  auditEvents: {
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
    select: {
      id: true, operationId: true, actorId: true, occurredAt: true, action: true,
      previousStatus: true, newStatus: true, actor: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.ExchangeOperationSelect;

type OperationRow = Prisma.ExchangeOperationGetPayload<{ select: typeof operationSelect }>;
function serializeOperation<T extends OperationRow>(operation: T) {
  return {
    ...operation,
    sourceAmount: operation.sourceAmount.toFixed(2),
    targetAmount: operation.targetAmount.toFixed(2),
    exchangeRate: operation.exchangeRate.toFixed(8),
    quoteReferenceDate: operation.quoteReferenceDate?.toISOString().slice(0, 10) ?? null,
  };
}

function statusConflict() {
  return new AppError(409, "STATUS_CONFLICT", "Esta operação foi alterada. Atualize os dados antes de tentar novamente.");
}

export async function listOperations(limit?: number) {
  const actor = await requirePermission("operations:read");
  const operations = await getDb().exchangeOperation.findMany({
    where: operationScope(actor),
    take: limit, select: operationSelect, orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
  return operations.map(serializeOperation);
}

export async function getOperationSummary() {
  const actor = await requirePermission("operations:read");
  const groups = await getDb().exchangeOperation.groupBy({ where: operationScope(actor), by: ["status"], _count: { _all: true } });
  const counts = { PENDING: 0, UNDER_REVIEW: 0, COMPLETED: 0, CANCELED: 0 };
  for (const group of groups) counts[group.status] = group._count._all;
  return counts;
}

export async function getOperation(inputId: string) {
  const actor = await requirePermission("operations:read");
  await requirePermission("audit:read");
  const id = operationIdSchema.parse(inputId);
  const operation = await getDb().exchangeOperation.findFirst({ where: { id, ...operationScope(actor) }, select: detailSelect });
  if (!operation) throw new AppError(404, "NOT_FOUND", "Operação não encontrada.");
  return serializeOperation(operation);
}

export async function changeOperationStatus(inputId: string, input: unknown) {
  const actor = await requirePermission("operations:change-status");
  const id = operationIdSchema.parse(inputId);
  const { expectedStatus, status } = changeOperationStatusSchema.parse(input);
  if (!canChangeStatus(expectedStatus, status)) {
    throw new AppError(409, "INVALID_TRANSITION", "Essa mudança de status não é permitida.");
  }
  const operation = await getDb().$transaction(async (tx) => {
    const scope = operationScope(actor);
    const current = await tx.exchangeOperation.findFirst({ where: { id, ...scope }, select: { status: true, createdById: true } });
    if (!current) throw new AppError(404, "NOT_FOUND", "Operação não encontrada.");
    if (current.createdById === actor.id) {
      throw new AppError(403, "SELF_REVIEW_FORBIDDEN", "Você não pode conduzir a análise de uma operação que criou.");
    }
    if (current.status !== expectedStatus) throw statusConflict();
    const updated = await tx.exchangeOperation.updateMany({
      where: { id, ...scope, status: expectedStatus }, data: { status },
    });
    if (updated.count !== 1) throw statusConflict();
    await tx.operationAuditEvent.create({
      data: { operationId: id, actorId: actor.id, action: "STATUS_CHANGED", previousStatus: expectedStatus, newStatus: status },
    });
    return tx.exchangeOperation.findUniqueOrThrow({ where: { id }, select: detailSelect });
  });
  return serializeOperation(operation);
}

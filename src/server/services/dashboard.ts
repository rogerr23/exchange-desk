import "server-only";
import { can, operationScope } from "@/domain/permissions";
import { requirePermission } from "@/server/auth/authorize";
import { getDb } from "@/server/db/client";

export async function getDashboardOverview() {
  const actor = await requirePermission("operations:read");
  const scope = operationScope(actor);
  return getDb().$transaction(async (tx) => {
    // Os contadores usam a mesma fotografia do banco, sem carregar históricos completos.
    const operationGroups = await tx.exchangeOperation.groupBy({ where: scope, by: ["status"], _count: { _all: true } });
    const operations = { PENDING: 0, UNDER_REVIEW: 0, PROCESSING: 0, FAILED: 0, COMPLETED: 0, CANCELED: 0 };
    for (const group of operationGroups) operations[group.status] = group._count._all;
    const requestGroups = await tx.exchangeRequest.groupBy({ where: scope, by: ["status"], _count: { _all: true } });
    const requests = { PENDING_REVIEW: 0, APPROVED: 0, REJECTED: 0 };
    for (const group of requestGroups) requests[group.status] = group._count._all;
    // O analista só consulta propostas com solicitação; não carregar dados de propostas sem aceite.
    let proposals = null;
    if (actor.role !== "OPERATIONS_ANALYST") {
      const now = new Date();
      const awaitingAcceptance = await tx.proposal.count({ where: { ...scope, acceptedAt: null, expiresAt: { gt: now } } });
      const expired = await tx.proposal.count({ where: { ...scope, acceptedAt: null, expiresAt: { lte: now } } });
      const accepted = await tx.proposal.count({ where: { ...scope, acceptedAt: { not: null } } });
      proposals = { awaitingAcceptance, expired, accepted };
    }
    let employees = null;
    if (can(actor.role, "employees:read")) {
      const active = await tx.user.count({ where: { isActive: true } });
      const inactive = await tx.user.count({ where: { isActive: false } });
      employees = { active, inactive };
    }
    const queue = await tx.exchangeRequest.findMany({
      where: { ...scope, status: "PENDING_REVIEW" }, take: 5,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true, createdAt: true, createdById: true, createdBy: { select: { name: true } },
        proposal: { select: { sourceCurrency: true, targetCurrency: true, sourceAmount: true, targetAmount: true, customer: { select: { name: true } } } },
      },
    });
    return {
      operations, requests, proposals, employees,
      pendingRequests: queue.map(row => ({
        id: row.id, createdAt: row.createdAt, customerName: row.proposal.customer.name, consultantName: row.createdBy.name,
        sourceCurrency: row.proposal.sourceCurrency, targetCurrency: row.proposal.targetCurrency,
        sourceAmount: row.proposal.sourceAmount.toFixed(2), targetAmount: row.proposal.targetAmount.toFixed(2),
        selfReviewBlocked: actor.role === "OPERATIONS_ANALYST" && row.createdById === actor.id,
      })),
    };
  }, { isolationLevel: "RepeatableRead" });
}

// A página inicial carrega apenas filas curtas; os contadores ficam em Indicadores.
export async function getWorkspaceOverview() {
  const actor = await requirePermission("operations:read");
  const scope = operationScope(actor);
  const db = getDb();
  const [requests, proposals, operations] = await Promise.all([
    db.exchangeRequest.findMany({
      where: { ...scope, status: "PENDING_REVIEW" }, take: 5,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, createdAt: true, createdById: true,
        proposal: { select: { customer: { select: { name: true } }, sourceAmount: true, sourceCurrency: true, targetAmount: true, targetCurrency: true } } },
    }),
    can(actor.role, "proposals:accept") ? db.proposal.findMany({
      where: { ...scope, acceptedAt: null, expiresAt: { gt: new Date() } }, take: 5,
      orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
      select: { id: true, expiresAt: true, customer: { select: { name: true } }, sourceAmount: true, sourceCurrency: true, targetAmount: true, targetCurrency: true },
    }) : Promise.resolve([]),
    db.exchangeOperation.findMany({
      where: { ...scope, status: { in: ["FAILED", "PENDING", "UNDER_REVIEW", "PROCESSING"] } }, take: 5,
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      select: { id: true, status: true, customer: { select: { name: true } }, sourceAmount: true, sourceCurrency: true, targetAmount: true, targetCurrency: true },
    }),
  ]);
  return {
    requests: requests.map(row => ({ id: row.id, createdAt: row.createdAt, customerName: row.proposal.customer.name,
      sourceAmount: row.proposal.sourceAmount.toFixed(2), sourceCurrency: row.proposal.sourceCurrency,
      targetAmount: row.proposal.targetAmount.toFixed(2), targetCurrency: row.proposal.targetCurrency,
      selfReviewBlocked: actor.role === "OPERATIONS_ANALYST" && row.createdById === actor.id })),
    proposals: proposals.map(row => ({ ...row, sourceAmount: row.sourceAmount.toFixed(2), targetAmount: row.targetAmount.toFixed(2) })),
    operations: operations.map(row => ({ ...row, sourceAmount: row.sourceAmount.toFixed(2), targetAmount: row.targetAmount.toFixed(2) })),
  };
}

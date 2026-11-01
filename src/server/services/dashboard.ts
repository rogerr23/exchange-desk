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

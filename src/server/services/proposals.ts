import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/domain/permissions";
import { proposalStatus } from "@/domain/proposal-status";
import { createProposalSchema, acceptProposalSchema, decideRequestSchema } from "@/schemas/proposal";
import { operationIdSchema } from "@/schemas/operation";
import { requirePermission } from "@/server/auth/authorize";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { simulationConfirmationKey, verifySimulation } from "@/server/quotes/simulation-token";

const publicFields = {
  id: true, customerId: true, createdById: true, sourceCurrency: true, targetCurrency: true,
  sourceAmount: true, targetAmount: true, exchangeRate: true, quoteProvider: true,
  quoteReferenceDate: true, quoteTimestamp: true, quoteTimestampKind: true, quoteFetchedAt: true,
  issuedAt: true, expiresAt: true, acceptedAt: true, createdAt: true,
  customer: { select: { id: true, name: true, fictionalCpf: true } },
  createdBy: { select: { id: true, name: true } },
  request: { select: { id: true, status: true, createdAt: true } },
} satisfies Prisma.ProposalSelect;
const detailFields = {
  ...publicFields,
  auditEvents: {
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
    select: { id: true, action: true, occurredAt: true, actor: { select: { id: true, name: true } } },
  },
} satisfies Prisma.ProposalSelect;

type ProposalRow = Prisma.ProposalGetPayload<{ select: typeof publicFields }>;
function serialize<T extends ProposalRow>(row: T) {
  return {
    ...row, status: proposalStatus(row), sourceAmount: row.sourceAmount.toFixed(2),
    targetAmount: row.targetAmount.toFixed(2), exchangeRate: row.exchangeRate.toFixed(8),
    quoteReferenceDate: row.quoteReferenceDate.toISOString().slice(0, 10),
  };
}

function scope(actor: { id: string; role: Role }): Prisma.ProposalWhereInput {
  if (actor.role === "CONSULTANT") return { createdById: actor.id };
  if (actor.role === "OPERATIONS_ANALYST") return { request: { isNot: null } };
  return {};
}

export async function createProposal(input: unknown) {
  const actor = await requirePermission("proposals:create");
  const data = createProposalSchema.parse(input);
  const simulation = verifySimulation(data.simulationToken, actor.id);
  const confirmationKey = simulationConfirmationKey(simulation);
  const db = getDb();
  async function existing() {
    const row = await db.proposal.findUnique({ where: { confirmationKey }, select: detailFields });
    if (!row) return null;
    if (row.customerId !== data.customerId) throw new AppError(409, "SIMULATION_ALREADY_USED", "Esta simulação já tem uma proposta para outro cliente. Faça uma nova simulação.");
    return { proposal: serialize(row), created: false };
  }
  const repeated = await existing();
  if (repeated) return repeated;
  try {
    const row = await db.$transaction(async (tx) => {
      if (await tx.exchangeOperation.findUnique({ where: { confirmationKey }, select: { id: true } })) {
        throw new AppError(409, "SIMULATION_ALREADY_USED", "Esta simulação já foi usada em uma operação. Faça uma nova simulação.");
      }
      if (!await tx.customer.findUnique({ where: { id: data.customerId }, select: { id: true } })) {
        throw new AppError(404, "NOT_FOUND", "Cliente não encontrado.");
      }
      return tx.proposal.create({
        data: {
          confirmationKey, customerId: data.customerId, createdById: actor.id,
          sourceCurrency: simulation.sourceCurrency, targetCurrency: simulation.targetCurrency,
          sourceAmount: simulation.sourceAmount, targetAmount: simulation.targetAmount,
          exchangeRate: simulation.exchangeRate, quoteProvider: simulation.quoteProvider,
          quoteReferenceDate: new Date(`${simulation.quoteReferenceDate}T00:00:00.000Z`),
          quoteTimestamp: new Date(simulation.quoteTimestamp), quoteTimestampKind: simulation.quoteTimestampKind,
          quoteFetchedAt: new Date(simulation.quoteFetchedAt), issuedAt: new Date(simulation.issuedAt),
          expiresAt: new Date(simulation.expiresAt),
          auditEvents: { create: { actorId: actor.id, action: "CREATED" } },
        }, select: detailFields,
      });
    });
    return { proposal: serialize(row), created: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const repeated = await existing();
      if (repeated) return repeated;
    }
    throw error;
  }
}

export async function listProposals() {
  const actor = await requirePermission("proposals:read");
  const rows = await getDb().proposal.findMany({ where: scope(actor), select: publicFields, orderBy: [{ createdAt: "desc" }, { id: "asc" }] });
  return rows.map(serialize);
}

export async function getProposal(inputId: string) {
  const actor = await requirePermission("proposals:read");
  const id = operationIdSchema.parse(inputId);
  const row = await getDb().proposal.findFirst({ where: { id, ...scope(actor) }, select: detailFields });
  if (!row) throw new AppError(404, "NOT_FOUND", "Proposta não encontrada.");
  return serialize(row);
}

export async function acceptProposal(inputId: string, input: unknown) {
  const actor = await requirePermission("proposals:accept");
  const id = operationIdSchema.parse(inputId);
  acceptProposalSchema.parse(input);
  const result = await getDb().$transaction(async (tx) => {
    const where = { id, createdById: actor.id };
    const current = await tx.proposal.findFirst({ where, select: detailFields });
    if (!current) throw new AppError(404, "NOT_FOUND", "Proposta não encontrada.");
    // Reenvio após aceite continua idempotente mesmo depois do prazo original.
    if (current.acceptedAt) return { row: current, created: false };
    const now = new Date();
    const updated = await tx.proposal.updateMany({
      where: { ...where, acceptedAt: null, expiresAt: { gt: now } }, data: { acceptedAt: now },
    });
    if (!updated.count) {
      const latest = await tx.proposal.findFirstOrThrow({ where, select: detailFields });
      if (latest.acceptedAt) return { row: latest, created: false };
      throw new AppError(409, "PROPOSAL_EXPIRED", "Esta proposta expirou. Faça uma nova simulação e crie outra proposta.");
    }
    await tx.exchangeRequest.create({ data: { proposalId: id, createdById: actor.id, createdAt: now } });
    await tx.proposalAuditEvent.create({ data: { proposalId: id, actorId: actor.id, action: "ACCEPTED", occurredAt: now } });
    return { row: await tx.proposal.findUniqueOrThrow({ where: { id }, select: detailFields }), created: true };
  });
  return { proposal: serialize(result.row), created: result.created };
}

const requestFields = {
  id: true, proposalId: true, createdById: true, status: true, createdAt: true,
  operationId: true, decidedAt: true, rejectionReason: true,
  decidedBy: { select: { id: true, name: true } },
  proposal: { select: detailFields },
} satisfies Prisma.ExchangeRequestSelect;

export async function listRequests() {
  const actor = await requirePermission("requests:read");
  const rows = await getDb().exchangeRequest.findMany({
    where: actor.role === "CONSULTANT" ? { createdById: actor.id } : {},
    select: requestFields, orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
  return rows.map((row) => ({ ...row, proposal: serialize(row.proposal) }));
}

export async function getExchangeRequest(inputId: string) {
  const actor = await requirePermission("requests:read");
  const id = operationIdSchema.parse(inputId);
  const row = await getDb().exchangeRequest.findFirst({
    where: { id, ...(actor.role === "CONSULTANT" ? { createdById: actor.id } : {}) }, select: requestFields,
  });
  if (!row) throw new AppError(404, "NOT_FOUND", "Solicitação não encontrada.");
  return { ...row, proposal: serialize(row.proposal) };
}

// A atualização condicional serializa decisões concorrentes na própria solicitação.
export async function decideExchangeRequest(inputId: string, input: unknown) {
  const actor = await requirePermission("requests:decide");
  const id = operationIdSchema.parse(inputId);
  const data = decideRequestSchema.parse(input);
  const rejectionReason = data.decision === "REJECTED" ? data.rejectionReason : null;
  const row = await getDb().$transaction(async (tx) => {
    const current = await tx.exchangeRequest.findUnique({ where: { id }, select: requestFields });
    if (!current) throw new AppError(404, "NOT_FOUND", "Solicitação não encontrada.");
    if (current.createdById === actor.id) {
      throw new AppError(403, "SELF_REVIEW_FORBIDDEN", "Você não pode decidir sobre uma solicitação que criou.");
    }
    function repeated(latest: typeof current) {
      if (latest && latest.status === data.decision && latest.rejectionReason === rejectionReason) return latest;
      throw new AppError(409, "REQUEST_ALREADY_DECIDED", "Esta solicitação já foi decidida. Atualize os dados para conferir o resultado.");
    }
    if (current.status !== "PENDING_REVIEW") return repeated(current);
    const now = new Date();
    const updated = await tx.exchangeRequest.updateMany({
      where: { id, status: "PENDING_REVIEW" },
      data: { status: data.decision, decidedById: actor.id, decidedAt: now, rejectionReason },
    });
    if (!updated.count) return repeated(await tx.exchangeRequest.findUniqueOrThrow({ where: { id }, select: requestFields }));
    if (data.decision === "APPROVED") {
      const proposal = await tx.proposal.findUniqueOrThrow({ where: { id: current.proposalId } });
      const operation = await tx.exchangeOperation.create({ data: {
        confirmationKey: proposal.confirmationKey, customerId: proposal.customerId, createdById: proposal.createdById,
        sourceCurrency: proposal.sourceCurrency, targetCurrency: proposal.targetCurrency,
        sourceAmount: proposal.sourceAmount, targetAmount: proposal.targetAmount, exchangeRate: proposal.exchangeRate,
        quoteProvider: proposal.quoteProvider, quoteReferenceDate: proposal.quoteReferenceDate,
        quoteTimestamp: proposal.quoteTimestamp, quoteTimestampKind: proposal.quoteTimestampKind,
        quoteFetchedAt: proposal.quoteFetchedAt, status: "PENDING", createdAt: now,
        auditEvents: { create: { actorId: actor.id, action: "CREATED", newStatus: "PENDING", occurredAt: now } },
      }, select: { id: true } });
      await tx.exchangeRequest.update({ where: { id }, data: { operationId: operation.id } });
    }
    await tx.proposalAuditEvent.create({ data: { proposalId: current.proposalId, actorId: actor.id, action: data.decision, occurredAt: now } });
    return tx.exchangeRequest.findUniqueOrThrow({ where: { id }, select: requestFields });
  });
  return { ...row, proposal: serialize(row.proposal) };
}

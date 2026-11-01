import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/server/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/server/quotes/frankfurter", () => ({ getQuote: vi.fn() }));
import { auth } from "@/server/auth/config";
import { getQuote } from "@/server/quotes/frankfurter";
import { getDb } from "@/server/db/client";
import { signSimulation, SIMULATION_TTL_MS } from "@/server/quotes/simulation-token";
import { createProposal, acceptProposal, decideExchangeRequest, listProposals, getProposal, listRequests, getExchangeRequest } from "@/server/services/proposals";
import { simulateConversion, listSimulations } from "@/server/services/simulations";
import { POST, GET } from "@/app/api/propostas/route";
import { POST as ACCEPT } from "@/app/api/propostas/[id]/aceite/route";
import { GET as DETAIL } from "@/app/api/propostas/[id]/route";
import { GET as REQUEST_DETAIL } from "@/app/api/solicitacoes/[id]/route";
import { POST as DECIDE } from "@/app/api/solicitacoes/[id]/decisao/route";
import { startOperationProcessing, finishOperationProcessing, PROCESSING_DELAY_MS } from "@/server/services/processing";
import { POST as START_PROCESSING } from "@/app/api/operacoes/[id]/processamento/route";
import { POST as FINISH_PROCESSING } from "@/app/api/operacoes/[id]/processamento/resultado/route";
import { changeOperationStatus, getOperation, getOperationSummary } from "@/server/services/operations";
import { getDashboardOverview } from "@/server/services/dashboard";
import { ROLES, type Role } from "@/domain/permissions";

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test")) throw new Error("Use um banco descartável terminado em _test.");
process.env.DATABASE_URL = url;
const db = getDb();
let actors: Record<Role, string>;
let customerId: string;
const acceptance = { confirmSimulatedAcceptance: true };
function login(id: string) { vi.mocked(auth).mockResolvedValue({ user: { id } } as never); }
function token(options: { actorId?: string; issuedAt?: number } = {}) {
  const issuedAt = options.issuedAt ?? Date.now() - 60_000;
  return signSimulation({ version: 1, simulationId: randomUUID(), actorId: options.actorId ?? actors.CONSULTANT,
    sourceCurrency: "USD", targetCurrency: "BRL", sourceAmount: "100.00", targetAmount: "512.35", exchangeRate: "5.12345678",
    quoteProvider: "Frankfurter / ECB", quoteReferenceDate: "2026-10-30", quoteTimestamp: new Date(issuedAt).toISOString(),
    quoteTimestampKind: "FETCHED_AT", quoteFetchedAt: new Date(issuedAt).toISOString(), issuedAt: new Date(issuedAt).toISOString(),
    expiresAt: new Date(issuedAt + SIMULATION_TTL_MS).toISOString(),
  });
}
function request(body: unknown, origin?: string) {
  return new Request("http://localhost:3000/api/propostas", { method: "POST", headers: { "content-type": "application/json", ...(origin ? { origin } : {}) }, body: JSON.stringify(body) });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });
beforeEach(async () => {
  await db.proposalAuditEvent.deleteMany(); await db.exchangeRequest.deleteMany(); await db.proposal.deleteMany();
  await db.operationProcessingAttempt.deleteMany(); await db.operationAuditEvent.deleteMany(); await db.exchangeOperation.deleteMany();
  await db.customer.deleteMany(); await db.simulation.deleteMany(); await db.employeeAccessEvent.deleteMany(); await db.user.deleteMany();
  actors = {} as Record<Role, string>;
  for (const role of ROLES) actors[role] = (await db.user.create({ data: { name: role, email: `${role.toLowerCase()}@example.test`, passwordHash: "unused", role } })).id;
  customerId = (await db.customer.create({ data: { name: "Cliente de Teste", fictionalCpf: "00000000000", email: "customer@example.test", phone: "11900000000" } })).id;
  login(actors.CONSULTANT);
});
afterEach(() => { vi.useRealTimers(); });
afterAll(async () => { await db.$disconnect(); });

it("cria pela API com prazo original, preserva valores e não expõe chave ou cria operação", async () => {
  const issuedAt = Date.now() - 120_000;
  const input = { customerId, simulationToken: token({ issuedAt }) };
  const response = await POST(request(input));
  expect(response.status).toBe(201);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const { data } = await response.json();
  expect(data).toMatchObject({ status: "AWAITING_ACCEPTANCE", sourceAmount: "100.00", targetAmount: "512.35", exchangeRate: "5.12345678", expiresAt: new Date(issuedAt + SIMULATION_TTL_MS).toISOString(), createdById: actors.CONSULTANT, request: null });
  expect(data.auditEvents.map((event: { action: string }) => event.action)).toEqual(["CREATED"]);
  for (const internal of ["confirmationKey", "simulationToken", "passwordHash"]) expect(JSON.stringify(data)).not.toContain(internal);
  expect((await POST(request(input))).status).toBe(200);
  expect(await db.proposal.count()).toBe(1);
  expect(await db.exchangeOperation.count()).toBe(0);
  const other = await db.customer.create({ data: { name: "Outro", fictionalCpf: "11111111111", email: "other@example.test", phone: "11900000001" } });
  await expect(createProposal({ ...input, customerId: other.id })).rejects.toMatchObject({ code: "SIMULATION_ALREADY_USED" });
});

it("criação e aceite concorrentes geram uma proposta, uma solicitação e dois eventos", async () => {
  const input = { customerId, simulationToken: token() };
  const proposals = await Promise.all([createProposal(input), createProposal(input)]);
  expect(proposals[0].proposal.id).toBe(proposals[1].proposal.id);
  expect(proposals.filter((result) => result.created)).toHaveLength(1);
  const id = proposals[0].proposal.id;
  const accepted = await Promise.all([acceptProposal(id, acceptance), acceptProposal(id, acceptance)]);
  expect(accepted.filter((result) => result.created)).toHaveLength(1);
  expect(accepted[0].proposal.request?.id).toBe(accepted[1].proposal.request?.id);
  expect(await db.exchangeRequest.count()).toBe(1);
  expect(await db.proposalAuditEvent.count()).toBe(2);
  expect(await db.exchangeOperation.count()).toBe(0);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.now() + SIMULATION_TTL_MS);
  const repeated = await acceptProposal(id, acceptance);
  expect(repeated.created).toBe(false);
  expect(repeated.proposal.status).toBe("ACCEPTED");
  expect((await getExchangeRequest(repeated.proposal.request!.id)).proposal.targetAmount).toBe("512.35");
});

it("recusa assinatura, autoria, entradas adulteradas, expiração e cliente inexistente", async () => {
  for (const simulationToken of [token({ issuedAt: Date.now() - SIMULATION_TTL_MS }), `${token()}invalid`, token({ actorId: actors.ADMIN })]) {
    await expect(createProposal({ customerId, simulationToken })).rejects.toMatchObject({ code: "INVALID_SIMULATION" });
  }
  await expect(createProposal({ customerId: "missing", simulationToken: token() })).rejects.toMatchObject({ status: 404 });
  await expect(createProposal({ customerId, simulationToken: token(), targetAmount: "999" })).rejects.toHaveProperty("name", "ZodError");
  const { proposal } = await createProposal({ customerId, simulationToken: token() });
  await expect(acceptProposal(proposal.id, {})).rejects.toHaveProperty("name", "ZodError");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(proposal.expiresAt);
  await expect(acceptProposal(proposal.id, acceptance)).rejects.toMatchObject({ code: "PROPOSAL_EXPIRED" });
  expect((await getProposal(proposal.id)).status).toBe("EXPIRED");
  expect(await db.exchangeRequest.count()).toBe(0);
  expect(await db.proposalAuditEvent.count()).toBe(1);
});

it("isola propostas, solicitações e auditoria por autor e aplica os escopos de conferência e suporte", async () => {
  const { proposal: draft } = await createProposal({ customerId, simulationToken: token() });
  const { proposal: accepted } = await createProposal({ customerId, simulationToken: token() });
  const result = await acceptProposal(accepted.id, acceptance);
  const requestId = result.proposal.request!.id;
  const other = await db.user.create({ data: { name: "Outro consultor", email: "other-consultant@example.test", passwordHash: "unused", role: "CONSULTANT" } });
  login(other.id);
  expect(await listProposals()).toHaveLength(0);
  expect(await listRequests()).toHaveLength(0);
  expect((await DETAIL(request({}), params(draft.id))).status).toBe(404);
  expect((await REQUEST_DETAIL(request({}), params(requestId))).status).toBe(404);
  await expect(acceptProposal(draft.id, acceptance)).rejects.toMatchObject({ status: 404 });
  for (const role of ["OPERATIONS_ANALYST", "MANAGER", "ADMIN"] as const) {
    login(actors[role]);
    expect(await listProposals()).toHaveLength(role === "OPERATIONS_ANALYST" ? 1 : 2);
    expect(await listRequests()).toHaveLength(1);
    expect((await getExchangeRequest(requestId)).proposal.auditEvents).toHaveLength(2);
    if (role === "OPERATIONS_ANALYST") await expect(getProposal(draft.id)).rejects.toMatchObject({ status: 404 });
    await expect(createProposal({ customerId, simulationToken: token() })).rejects.toMatchObject({ status: 403 });
    expect((await ACCEPT(request(acceptance), params(draft.id))).status).toBe(403);
  }
  login(actors.CONSULTANT);
  await db.user.update({ where: { id: actors.CONSULTANT }, data: { role: "OPERATIONS_ANALYST" } });
  await expect(acceptProposal(draft.id, acceptance)).rejects.toMatchObject({ status: 403 });
});

it("desfaz criação e aceite quando o histórico falha, sem deixar solicitação parcial", async () => {
  const { proposal } = await createProposal({ customerId, simulationToken: token() });
  await db.$executeRaw`CREATE FUNCTION reject_test_proposal_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END; $$`;
  try {
    await db.$executeRaw`CREATE TRIGGER reject_test_proposal_audit BEFORE INSERT ON "ProposalAuditEvent" FOR EACH ROW EXECUTE FUNCTION reject_test_proposal_audit()`;
    await expect(createProposal({ customerId, simulationToken: token() })).rejects.toThrow();
    await expect(acceptProposal(proposal.id, acceptance)).rejects.toThrow();
    expect(await db.proposal.count()).toBe(1);
    expect((await getProposal(proposal.id)).acceptedAt).toBeNull();
    expect(await db.exchangeRequest.count()).toBe(0);
    expect(await db.proposalAuditEvent.count()).toBe(1);
  } finally {
    await db.$executeRaw`DROP TRIGGER IF EXISTS reject_test_proposal_audit ON "ProposalAuditEvent"`;
    await db.$executeRaw`DROP FUNCTION IF EXISTS reject_test_proposal_audit()`;
  }
});

it("vincula o histórico de simulações à proposta sem token e bloqueia reutilização de operação V1", async () => {
  const timestamp = new Date().toISOString();
  vi.mocked(getQuote).mockResolvedValue({ sourceCurrency: "USD", targetCurrency: "BRL", exchangeRate: "5.12345678", quoteProvider: "Frankfurter / ECB", quoteReferenceDate: "2026-10-30", quoteFetchedAt: timestamp, quoteTimestamp: timestamp, quoteTimestampKind: "FETCHED_AT" });
  const simulation = await simulateConversion({ sourceCurrency: "USD", targetCurrency: "BRL", sourceAmount: "100" });
  const { proposal } = await createProposal({ customerId, simulationToken: simulation.simulationToken });
  const history = await listSimulations();
  expect(history[0].proposalId).toBe(proposal.id);
  expect(history[0]).not.toHaveProperty("confirmationKey");
  const stored = await db.simulation.findUniqueOrThrow({ where: { id: history[0].id } });
  await db.proposalAuditEvent.deleteMany(); await db.proposal.deleteMany();
  await db.exchangeOperation.create({ data: { customerId, createdById: actors.CONSULTANT, confirmationKey: stored.confirmationKey,
    sourceCurrency: "USD", targetCurrency: "BRL", sourceAmount: "100", targetAmount: "512.35", exchangeRate: "5.12345678",
    quoteProvider: "Frankfurter / ECB", quoteTimestamp: new Date(), quoteTimestampKind: "FETCHED_AT", quoteFetchedAt: new Date(),
  } });
  await expect(createProposal({ customerId, simulationToken: simulation.simulationToken })).rejects.toMatchObject({ code: "SIMULATION_ALREADY_USED" });
});

it("exige sessão e protege mutações contra origem externa", async () => {
  expect((await POST(request({ customerId, simulationToken: token() }, "https://other.example"))).status).toBe(403);
  vi.mocked(auth).mockResolvedValue(null as never);
  expect((await GET()).status).toBe(401);
  expect((await POST(request({}))).status).toBe(401);
  expect((await ACCEPT(request(acceptance), params("missing"))).status).toBe(401);
  await expect(listRequests()).rejects.toMatchObject({ status: 401 });
});

async function pendingRequest() {
  const { proposal } = await createProposal({ customerId, simulationToken: token() });
  return (await acceptProposal(proposal.id, acceptance)).proposal.request!.id;
}

it("aprova uma única vez após o prazo de aceite, preservando valores, autoria e auditoria", async () => {
  const id = await pendingRequest();
  login(actors.OPERATIONS_ANALYST);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.now() + SIMULATION_TTL_MS);
  const results = await Promise.all([decideExchangeRequest(id, { decision: "APPROVED" }), decideExchangeRequest(id, { decision: "APPROVED" })]);
  expect(results[0].operationId).toBe(results[1].operationId);
  expect(results[0]).toMatchObject({ status: "APPROVED", decidedBy: { id: actors.OPERATIONS_ANALYST }, rejectionReason: null });
  expect(await db.exchangeOperation.count()).toBe(1);
  const operation = await db.exchangeOperation.findUniqueOrThrow({ where: { id: results[0].operationId! }, include: { auditEvents: true } });
  expect(operation.createdById).toBe(actors.CONSULTANT);
  expect(operation.sourceAmount.toFixed(2)).toBe("100.00");
  expect(operation.targetAmount.toFixed(2)).toBe("512.35");
  expect(operation.exchangeRate.toFixed(8)).toBe("5.12345678");
  expect(operation.auditEvents).toMatchObject([{ actorId: actors.OPERATIONS_ANALYST, action: "CREATED", newStatus: "PENDING" }]);
  expect(results[0].proposal.auditEvents.map((event) => event.action)).toEqual(["CREATED", "ACCEPTED", "APPROVED"]);
  await expect(changeOperationStatus(operation.id, { expectedStatus: "PENDING", status: "UNDER_REVIEW" })).rejects.toMatchObject({ code: "PROCESSING_REQUIRED" });
  await expect(decideExchangeRequest(id, { decision: "REJECTED", rejectionReason: "Outro resultado" })).rejects.toMatchObject({ code: "REQUEST_ALREADY_DECIDED" });
  login(actors.CONSULTANT);
  expect((await getOperation(operation.id)).createdById).toBe(actors.CONSULTANT);
  expect((await getExchangeRequest(id)).operationId).toBe(operation.id);
});

it("rejeita com motivo obrigatório e imutável, sem gerar operação", async () => {
  const id = await pendingRequest(); login(actors.OPERATIONS_ANALYST);
  for (const input of [{ decision: "REJECTED" }, { decision: "REJECTED", rejectionReason: "  " }, { decision: "REJECTED", rejectionReason: "x".repeat(1001) }, { decision: "APPROVED", sourceAmount: "200" }]) {
    expect((await DECIDE(request(input), params(id))).status).toBe(400);
  }
  const input = { decision: "REJECTED", rejectionReason: "  Dados inconsistentes  " };
  const results = await Promise.all([decideExchangeRequest(id, input), decideExchangeRequest(id, input)]);
  expect(results[0]).toMatchObject({ status: "REJECTED", rejectionReason: "Dados inconsistentes", operationId: null });
  expect(results[0].decidedAt).toEqual(results[1].decidedAt);
  expect(await db.exchangeOperation.count()).toBe(0);
  expect(await db.proposalAuditEvent.count({ where: { action: "REJECTED" } })).toBe(1);
  await expect(decideExchangeRequest(id, { decision: "REJECTED", rejectionReason: "Motivo alterado" })).rejects.toMatchObject({ code: "REQUEST_ALREADY_DECIDED" });
});

it("resolve aprovação e rejeição concorrentes com uma decisão e sem efeitos parciais", async () => {
  const id = await pendingRequest(); login(actors.OPERATIONS_ANALYST);
  const results = await Promise.allSettled([decideExchangeRequest(id, { decision: "APPROVED" }), decideExchangeRequest(id, { decision: "REJECTED", rejectionReason: "Dados inconsistentes" })]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
  expect(failed.reason).toMatchObject({ code: "REQUEST_ALREADY_DECIDED" });
  const row = await getExchangeRequest(id);
  expect(await db.exchangeOperation.count()).toBe(row.status === "APPROVED" ? 1 : 0);
  expect(await db.proposalAuditEvent.count()).toBe(3);
});

it("protege decisão por perfil, identidade após mudança de função, sessão e origem", async () => {
  const id = await pendingRequest();
  for (const role of ["CONSULTANT", "MANAGER", "ADMIN"] as const) {
    login(actors[role]); expect((await DECIDE(request({ decision: "APPROVED" }), params(id))).status).toBe(403);
  }
  login(actors.CONSULTANT);
  await db.user.update({ where: { id: actors.CONSULTANT }, data: { role: "OPERATIONS_ANALYST" } });
  for (const decision of [{ decision: "APPROVED" }, { decision: "REJECTED", rejectionReason: "Teste" }]) {
    await expect(decideExchangeRequest(id, decision)).rejects.toMatchObject({ code: "SELF_REVIEW_FORBIDDEN" });
  }
  login(actors.OPERATIONS_ANALYST);
  expect((await DECIDE(request({ decision: "APPROVED" }, "https://other.example"), params(id))).status).toBe(403);
  expect((await DECIDE(request({ decision: "APPROVED" }), params("missing"))).status).toBe(404);
  vi.mocked(auth).mockResolvedValue(null as never);
  expect((await DECIDE(request({ decision: "APPROVED" }), params(id))).status).toBe(401);
  expect(await db.exchangeOperation.count()).toBe(0);
});

it("desfaz decisão e operação se qualquer histórico falhar", async () => {
  const id = await pendingRequest(); login(actors.OPERATIONS_ANALYST);
  for (const table of ["ProposalAuditEvent", "OperationAuditEvent"] as const) {
    await db.$executeRaw`CREATE FUNCTION reject_test_decision_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END; $$`;
    try {
      // Os identificadores vêm exclusivamente da lista fixa acima.
      await db.$executeRawUnsafe(`CREATE TRIGGER reject_test_decision_audit BEFORE INSERT ON "${table}" FOR EACH ROW EXECUTE FUNCTION reject_test_decision_audit()`);
      await expect(decideExchangeRequest(id, { decision: "APPROVED" })).rejects.toThrow();
      if (table === "ProposalAuditEvent") await expect(decideExchangeRequest(id, { decision: "REJECTED", rejectionReason: "Teste" })).rejects.toThrow();
      expect(await getExchangeRequest(id)).toMatchObject({ status: "PENDING_REVIEW", operationId: null, decidedAt: null, decidedBy: null, rejectionReason: null });
      expect(await db.exchangeOperation.count()).toBe(0);
      expect(await db.proposalAuditEvent.count()).toBe(2);
      expect(await db.operationAuditEvent.count()).toBe(0);
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS reject_test_decision_audit ON "${table}"`);
      await db.$executeRaw`DROP FUNCTION IF EXISTS reject_test_decision_audit()`;
    }
  }
  const response = await DECIDE(request({ decision: "APPROVED" }), params(id));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(JSON.stringify(await response.json())).not.toMatch(/confirmationKey|passwordHash|simulationToken/);
});


async function approvedOperation() {
  const requestId = await pendingRequest();
  login(actors.OPERATIONS_ANALYST);
  return (await decideExchangeRequest(requestId, { decision: "APPROVED" })).operationId!;
}
function advanceProcessingClock() {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.now() + PROCESSING_DELAY_MS);
}

it("processa sucesso com início e resultado concorrentes idempotentes, sem duplicar eventos ou alterar valores", async () => {
  const id = await approvedOperation();
  const before = await getOperation(id);
  const input = { expectedAttemptCount: 0, scenario: "SUCCESS" };
  const starts = await Promise.all([startOperationProcessing(id, input), startOperationProcessing(id, input)]);
  const attemptId = starts[0].processingAttempts[0].id;
  expect(starts[1].processingAttempts[0].id).toBe(attemptId);
  expect(starts[0]).toMatchObject({ status: "PROCESSING", processingAttemptCount: 1 });
  await expect(finishOperationProcessing(id, { attemptId })).rejects.toMatchObject({ code: "PROCESSING_NOT_READY" });
  advanceProcessingClock();
  const results = await Promise.all([finishOperationProcessing(id, { attemptId }), finishOperationProcessing(id, { attemptId })]);
  for (const result of results) {
    expect(result).toMatchObject({ status: "COMPLETED", sourceAmount: before.sourceAmount, targetAmount: before.targetAmount, exchangeRate: before.exchangeRate, quoteFetchedAt: before.quoteFetchedAt, createdById: actors.CONSULTANT });
    expect(result.processingAttempts).toHaveLength(1);
    expect(result.processingAttempts[0]).toMatchObject({ number: 1, scenario: "SUCCESS", failureReason: null, startedBy: { id: actors.OPERATIONS_ANALYST } });
    expect(result.processingAttempts[0].finishedAt).not.toBeNull();
    expect(result.auditEvents.map(e => e.newStatus)).toEqual(["PENDING", "PROCESSING", "COMPLETED"]);
  }
  expect((await startOperationProcessing(id, input)).status).toBe("COMPLETED");
  await expect(startOperationProcessing(id, { expectedAttemptCount: 1, scenario: "SUCCESS" })).rejects.toMatchObject({ code: "PROCESSING_CONFLICT" });
  expect(await db.exchangeOperation.count()).toBe(1);
  login(actors.CONSULTANT);
  expect((await getOperation(id)).status).toBe("COMPLETED");
  expect((await getOperationSummary()).COMPLETED).toBe(1);
});

it("registra falha e permite nova tentativa, preservando a anterior e recusando comandos desatualizados", async () => {
  const id = await approvedOperation();
  const started = await startOperationProcessing(id, { expectedAttemptCount: 0, scenario: "FAILURE" });
  const firstId = started.processingAttempts[0].id;
  advanceProcessingClock();
  const failed = await finishOperationProcessing(id, { attemptId: firstId });
  expect(failed.status).toBe("FAILED");
  expect(failed.processingAttempts[0].failureReason).toContain("Falha simulada");
  expect((await getOperationSummary()).FAILED).toBe(1);
  const retries = await Promise.all([startOperationProcessing(id, { expectedAttemptCount: 1, scenario: "SUCCESS" }), startOperationProcessing(id, { expectedAttemptCount: 1, scenario: "SUCCESS" })]);
  const secondId = retries[0].processingAttempts[0].id;
  expect(retries[1].processingAttempts[0].id).toBe(secondId);
  expect(retries[0].processingAttempts[1]).toEqual(failed.processingAttempts[0]);
  expect(retries[0].processingAttemptCount).toBe(2);
  await expect(finishOperationProcessing(id, { attemptId: firstId })).rejects.toMatchObject({ code: "PROCESSING_CONFLICT" });
  await expect(startOperationProcessing(id, { expectedAttemptCount: 0, scenario: "FAILURE" })).rejects.toMatchObject({ code: "PROCESSING_CONFLICT" });
  vi.setSystemTime(Date.now() + PROCESSING_DELAY_MS);
  const done = await finishOperationProcessing(id, { attemptId: secondId });
  expect(done.status).toBe("COMPLETED");
  expect(done.processingAttempts).toHaveLength(2);
  expect(done.auditEvents.map(e => e.newStatus)).toEqual(["PENDING", "PROCESSING", "FAILED", "PROCESSING", "COMPLETED"]);
  expect(await db.exchangeOperation.count()).toBe(1);
});

it("uma disputa de cenários tem uma vencedora e não modifica uma tentativa em andamento", async () => {
  const id = await approvedOperation();
  const results = await Promise.allSettled([startOperationProcessing(id, { expectedAttemptCount: 0, scenario: "SUCCESS" }), startOperationProcessing(id, { expectedAttemptCount: 0, scenario: "FAILURE" })]);
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect((results.find(r => r.status === "rejected") as PromiseRejectedResult).reason).toMatchObject({ code: "PROCESSING_CONFLICT" });
  await expect(startOperationProcessing(id, { expectedAttemptCount: 1, scenario: "SUCCESS" })).rejects.toMatchObject({ code: "PROCESSING_CONFLICT" });
  expect(await db.operationProcessingAttempt.count()).toBe(1);
  expect(await db.operationAuditEvent.count()).toBe(2);
});

it("retoma tentativa persistida por outro analista, sem mutação na leitura nem depender da sessão original", async () => {
  const id = await approvedOperation();
  const started = await startOperationProcessing(id, { expectedAttemptCount: 0, scenario: "SUCCESS" });
  const attemptId = started.processingAttempts[0].id;
  advanceProcessingClock();
  await db.user.update({ where: { id: actors.OPERATIONS_ANALYST }, data: { role: "MANAGER" } });
  await expect(finishOperationProcessing(id, { attemptId })).rejects.toMatchObject({ status: 403 });
  expect((await getOperation(id)).status).toBe("PROCESSING");
  const other = await db.user.create({ data: { name: "Analista de recuperação", email: "recovery@example.test", passwordHash: "unused", role: "OPERATIONS_ANALYST" } });
  login(other.id);
  const done = await finishOperationProcessing(id, { attemptId });
  expect(done.status).toBe("COMPLETED");
  expect(done.processingAttempts[0].startedBy.id).toBe(actors.OPERATIONS_ANALYST);
  expect(done.auditEvents.at(-1)?.actorId).toBe(other.id);
});

it("protege início e resultado por perfil, autoria atualizada, origem, esquema estrito e vínculo aprovado", async () => {
  const id = await approvedOperation();
  const start = { expectedAttemptCount: 0, scenario: "SUCCESS" };
  for (const role of ["CONSULTANT", "MANAGER", "ADMIN"] as const) {
    login(actors[role]);
    expect((await START_PROCESSING(request(start), params(id))).status).toBe(403);
    expect((await FINISH_PROCESSING(request({ attemptId: "missing" }), params(id))).status).toBe(403);
  }
  login(actors.CONSULTANT);
  await db.user.update({ where: { id: actors.CONSULTANT }, data: { role: "OPERATIONS_ANALYST" } });
  await expect(startOperationProcessing(id, start)).rejects.toMatchObject({ code: "SELF_REVIEW_FORBIDDEN" });
  await expect(finishOperationProcessing(id, { attemptId: "missing" })).rejects.toMatchObject({ code: "SELF_REVIEW_FORBIDDEN" });
  login(actors.OPERATIONS_ANALYST);
  expect((await START_PROCESSING(request(start, "https://other.example"), params(id))).status).toBe(403);
  expect((await FINISH_PROCESSING(request({ attemptId: "missing" }, "https://other.example"), params(id))).status).toBe(403);
  for (const input of [{ scenario: "SUCCESS" }, { ...start, expectedAttemptCount: -1 }, { ...start, status: "COMPLETED" }, { ...start, scenario: "OTHER" }]) expect((await START_PROCESSING(request(input), params(id))).status).toBe(400);
  expect((await FINISH_PROCESSING(request({ attemptId: "missing", scenario: "SUCCESS" }), params(id))).status).toBe(400);
  await expect(startOperationProcessing("missing", start)).rejects.toMatchObject({ status: 404 });
  // Uma operação legada não recebe aceite ou aprovação retroativos.
  await db.exchangeRequest.updateMany({ where: { operationId: id }, data: { operationId: null } });
  await expect(startOperationProcessing(id, start)).rejects.toMatchObject({ code: "APPROVED_REQUEST_REQUIRED" });
  vi.mocked(auth).mockResolvedValue(null as never);
  expect((await START_PROCESSING(request(start), params(id))).status).toBe(401);
  expect((await FINISH_PROCESSING(request({ attemptId: "missing" }), params(id))).status).toBe(401);
  expect(await db.operationProcessingAttempt.count()).toBe(0);
});

it("desfaz início e resultado em falha de auditoria e permite retomar depois sem efeitos parciais", async () => {
  const id = await approvedOperation();
  async function rejectAudit(action: () => Promise<unknown>) {
    await db.$executeRaw`CREATE FUNCTION reject_test_processing_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END; $$`;
    try {
      await db.$executeRaw`CREATE TRIGGER reject_test_processing_audit BEFORE INSERT ON "OperationAuditEvent" FOR EACH ROW EXECUTE FUNCTION reject_test_processing_audit()`;
      await action();
    } finally {
      await db.$executeRaw`DROP TRIGGER IF EXISTS reject_test_processing_audit ON "OperationAuditEvent"`;
      await db.$executeRaw`DROP FUNCTION IF EXISTS reject_test_processing_audit()`;
    }
  }
  await rejectAudit(async () => {
    await expect(startOperationProcessing(id, { expectedAttemptCount: 0, scenario: "SUCCESS" })).rejects.toThrow();
    expect(await getOperation(id)).toMatchObject({ status: "PENDING", processingAttemptCount: 0, processingAttempts: [] });
    expect(await db.operationAuditEvent.count()).toBe(1);
  });
  const started = await startOperationProcessing(id, { expectedAttemptCount: 0, scenario: "SUCCESS" });
  const attemptId = started.processingAttempts[0].id;
  advanceProcessingClock();
  await rejectAudit(async () => {
    await expect(finishOperationProcessing(id, { attemptId })).rejects.toThrow();
    expect((await getOperation(id)).status).toBe("PROCESSING");
    expect((await getOperation(id)).processingAttempts[0].finishedAt).toBeNull();
    expect(await db.operationAuditEvent.count()).toBe(2);
  });
  const response = await FINISH_PROCESSING(request({ attemptId }), params(id));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const body = await response.json();
  expect(body.data.status).toBe("COMPLETED");
  expect(JSON.stringify(body)).not.toMatch(/passwordHash|simulationToken|confirmationKey/);
});

it("resume atendimento e operações no painel sem misturar autores nem expor propostas sem aceite ao analista", async () => {
  const { proposal: draft } = await createProposal({ customerId, simulationToken: token() });
  await createProposal({ customerId, simulationToken: token({ issuedAt: Date.now() - SIMULATION_TTL_MS + 60_000 }) });
  const pendingId = await pendingRequest();
  const rejectedId = await pendingRequest();
  const approvedId = await pendingRequest();
  login(actors.OPERATIONS_ANALYST);
  await decideExchangeRequest(rejectedId, { decision: "REJECTED", rejectionReason: "Conferência fictícia" });
  await decideExchangeRequest(approvedId, { decision: "APPROVED" });
  const other = await db.user.create({ data: { name: "Outro consultor", email: "dashboard-other@example.test", role: "CONSULTANT", passwordHash: "unused" } });
  login(other.id);
  const { proposal } = await createProposal({ customerId, simulationToken: token({ actorId: other.id }) });
  const otherRequest = (await acceptProposal(proposal.id, acceptance)).proposal.request!;
  await db.user.update({ where: { id: other.id }, data: { isActive: false } });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.now() + 60_000);
  login(actors.CONSULTANT);
  const own = await getDashboardOverview();
  expect(own.proposals).toEqual({ awaitingAcceptance: 1, expired: 1, accepted: 3 });
  expect(own.requests).toEqual({ PENDING_REVIEW: 1, APPROVED: 1, REJECTED: 1 });
  expect(own.operations.PENDING).toBe(1);
  expect(own.pendingRequests.map(r => r.id)).toEqual([pendingId]);
  expect(own.employees).toBeNull();
  for (const role of ["OPERATIONS_ANALYST", "MANAGER", "ADMIN"] as const) {
    login(actors[role]);
    const team = await getDashboardOverview();
    expect(team.requests).toEqual({ PENDING_REVIEW: 2, APPROVED: 1, REJECTED: 1 });
    expect(team.pendingRequests.map(r => r.id)).toEqual([pendingId, otherRequest.id]);
    expect(team.proposals).toEqual(role === "OPERATIONS_ANALYST" ? null : { awaitingAcceptance: 1, expired: 1, accepted: 4 });
    expect(team.employees).toEqual(role === "ADMIN" ? { active: 4, inactive: 1 } : null);
    expect(JSON.stringify(team)).not.toMatch(/confirmationKey|simulationToken|passwordHash/);
    expect(JSON.stringify(team)).not.toContain(draft.id);
  }
  await db.user.update({ where: { id: actors.CONSULTANT }, data: { role: "OPERATIONS_ANALYST" } });
  login(actors.CONSULTANT);
  const changed = await getDashboardOverview();
  expect(changed.proposals).toBeNull();
  expect(changed.pendingRequests.find(r => r.id === pendingId)?.selfReviewBlocked).toBe(true);
  expect(changed.pendingRequests.find(r => r.id === otherRequest.id)?.selfReviewBlocked).toBe(false);
  vi.mocked(auth).mockResolvedValue(null as never);
  await expect(getDashboardOverview()).rejects.toMatchObject({ status: 401 });
});

it("limita a fila do painel às cinco solicitações pendentes mais antigas, sem alterar o total", async () => {
  const ids: string[] = [];
  for (let i = 0; i < 7; i++) {
    const id = await pendingRequest();
    await db.exchangeRequest.update({ where: { id }, data: { createdAt: new Date(2026, 9, 30, 12, i) } });
    ids.push(id);
  }
  login(actors.OPERATIONS_ANALYST);
  const overview = await getDashboardOverview();
  expect(overview.requests.PENDING_REVIEW).toBe(7);
  expect(overview.pendingRequests.map(r => r.id)).toEqual(ids.slice(0, 5));
});

it("indicadores: respeita Brasília, escopo, eventos e o mesmo recorte nas listagens", async () => {
  const { getIndicators } = await import("@/server/services/indicators");
  const { listOperations } = await import("@/server/services/operations");
  const query = { de: "2026-10-31", ate: "2026-11-01" };
  const now = new Date("2026-11-02T03:00:00Z");
  const other = await db.user.create({ data: { name: "Outro consultor", email: "indicators@example.test", passwordHash: "unused", role: "CONSULTANT" } });
  async function proposalAt(date: string, actorId = actors.CONSULTANT) {
    login(actorId);
    const result = await createProposal({ customerId, simulationToken: token({ actorId }) });
    await db.proposal.update({ where: { id: result.proposal.id }, data: { createdAt: new Date(date) } });
    return result.proposal.id;
  }
  await proposalAt("2026-10-31T02:59:59.999Z"); // Fora do início em Brasília.
  const first = await proposalAt("2026-10-31T03:00:00Z");
  const last = await proposalAt("2026-11-02T02:59:59.999Z");
  await proposalAt("2026-11-02T03:00:00Z"); // Limite final exclusivo.
  await proposalAt("2026-11-01T12:00:00Z", other.id);
  async function pending(date: string, actorId = actors.CONSULTANT) {
    const id = await proposalAt("2026-10-01T12:00:00Z", actorId);
    await acceptProposal(id, acceptance);
    return db.exchangeRequest.update({ where: { proposalId: id }, data: { createdAt: new Date(date) } });
  }
  const oldest = await pending("2026-10-31T03:00:00Z");
  await pending("2026-11-01T03:00:00Z");
  await pending("2026-10-30T03:00:00Z"); // Fila anterior, fora do recorte.
  await pending("2026-11-01T03:00:00Z", other.id);
  async function operation(status: "COMPLETED" | "FAILED", actorId = actors.CONSULTANT) {
    const id = await proposalAt("2026-10-01T12:00:00Z", actorId);
    const accepted = await acceptProposal(id, acceptance);
    login(actors.OPERATIONS_ANALYST);
    const request = await decideExchangeRequest(accepted.proposal.request!.id, { decision: "APPROVED" });
    const operationId = request.operationId!;
    await db.exchangeOperation.update({ where: { id: operationId }, data: { status, createdAt: new Date("2026-10-01T12:00:00Z") } });
    await db.operationAuditEvent.create({ data: { operationId, actorId: actors.OPERATIONS_ANALYST, action: "STATUS_CHANGED", previousStatus: "PROCESSING", newStatus: status, occurredAt: new Date("2026-11-01T12:00:00Z") } });
    return operationId;
  }
  const completed = await operation("COMPLETED");
  const failed = await operation("FAILED");
  // Duas falhas da mesma operação contam como uma operação, não duas tentativas.
  await db.operationAuditEvent.create({ data: { operationId: failed, actorId: actors.OPERATIONS_ANALYST, action: "STATUS_CHANGED", previousStatus: "PROCESSING", newStatus: "FAILED", occurredAt: new Date("2026-11-01T13:00:00Z") } });
  const recovered = await operation("FAILED");
  await db.exchangeOperation.update({ where: { id: recovered }, data: { status: "PROCESSING" } });
  await operation("COMPLETED", other.id);

  login(actors.CONSULTANT);
  const own = await getIndicators(query, now);
  expect(own).toMatchObject({ entries: 2, pending: 2, completed: 1, failed: 1, averageWaitMs: 36 * 60 * 60_000, oldestWaitMs: 48 * 60 * 60_000 });
  expect(own.trend.map(bucket => bucket.count)).toEqual([1, 1]);
  expect(own.oldestRequests[0].id).toBe(oldest.id);
  expect((await listProposals({ ...query, indicador: "entradas" })).map(row => row.id).sort()).toEqual([first, last].sort());
  expect(await listRequests({ ...query, indicador: "pendentes" })).toHaveLength(own.pending);
  expect((await listOperations(undefined, { ...query, indicador: "concluidas" })).map(row => row.id)).toEqual([completed]);
  expect((await listOperations(undefined, { ...query, indicador: "falhas" })).map(row => row.id)).toEqual([failed]);

  login(actors.MANAGER);
  const team = await getIndicators(query, now);
  expect(team).toMatchObject({ entries: 3, pending: 3, completed: 2, failed: 1 });
  login(actors.OPERATIONS_ANALYST);
  const analyst = await getIndicators(query, now);
  expect(analyst.entries).toBe((await listRequests({ ...query, indicador: "entradas" })).length);
  expect(analyst.pending).toBe(team.pending);
  const empty = await getIndicators({ de: "2026-09-01", ate: "2026-09-07" }, now);
  expect(empty).toMatchObject({ entries: 0, pending: 0, completed: 0, failed: 0, averageWaitMs: null, oldestWaitMs: null, oldestRequests: [] });
  expect(empty.trend.every(bucket => bucket.count === 0)).toBe(true);
  vi.mocked(auth).mockResolvedValue(null as never);
  await expect(getIndicators(query, now)).rejects.toMatchObject({ status: 401 });
});

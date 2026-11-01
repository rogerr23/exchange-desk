import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/server/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/server/quotes/frankfurter", () => ({ getQuote: vi.fn() }));
import { auth } from "@/server/auth/config";
import { getQuote } from "@/server/quotes/frankfurter";
import { getDb } from "@/server/db/client";
import { signSimulation, SIMULATION_TTL_MS } from "@/server/quotes/simulation-token";
import { createProposal, acceptProposal, listProposals, getProposal, listRequests, getExchangeRequest } from "@/server/services/proposals";
import { simulateConversion, listSimulations } from "@/server/services/simulations";
import { POST, GET } from "@/app/api/propostas/route";
import { POST as ACCEPT } from "@/app/api/propostas/[id]/aceite/route";
import { GET as DETAIL } from "@/app/api/propostas/[id]/route";
import { GET as REQUEST_DETAIL } from "@/app/api/solicitacoes/[id]/route";
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
  await db.operationAuditEvent.deleteMany(); await db.exchangeOperation.deleteMany();
  await db.customer.deleteMany(); await db.simulation.deleteMany(); await db.user.deleteMany();
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

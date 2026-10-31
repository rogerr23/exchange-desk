import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, expect, it, vi } from "vitest";

vi.mock("@/server/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/server/quotes/frankfurter", () => ({ getQuote: vi.fn() }));
import { getQuote } from "@/server/quotes/frankfurter";
import { simulateConversion, listSimulations, getSimulationCount } from "@/server/services/simulations";
import { GET as GET_SIMULATIONS } from "@/app/api/simulacoes/route";
import { GET as GET_OPERATION } from "@/app/api/operacoes/[id]/route";
import { auth } from "@/server/auth/config";
import { getDb } from "@/server/db/client";
import { signSimulation, SIMULATION_TTL_MS } from "@/server/quotes/simulation-token";
import { createOperation, listOperations, getOperationSummary, getOperation, changeOperationStatus } from "@/server/services/operations";
import { POST, GET } from "@/app/api/operacoes/route";
import { PATCH } from "@/app/api/operacoes/[id]/status/route";

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test")) throw new Error("Configure TEST_DATABASE_URL com banco descartável terminado em _test.");
process.env.DATABASE_URL = url;
const db = getDb();
let actorId: string;
let customerId: string;

function token(options: { actorId?: string; expired?: boolean } = {}) {
  const issued = Date.now() - (options.expired ? SIMULATION_TTL_MS + 1000 : 0);
  return signSimulation({
    version: 1, simulationId: randomUUID(), actorId: options.actorId ?? actorId,
    sourceCurrency: "USD", targetCurrency: "BRL", sourceAmount: "100.00", targetAmount: "512.35",
    exchangeRate: "5.12345678", quoteProvider: "Frankfurter / ECB", quoteReferenceDate: "2026-10-30",
    quoteTimestamp: new Date(issued).toISOString(), quoteTimestampKind: "FETCHED_AT",
    quoteFetchedAt: new Date(issued).toISOString(), issuedAt: new Date(issued).toISOString(),
    expiresAt: new Date(issued + SIMULATION_TTL_MS).toISOString(),
  });
}
function jsonRequest(path: string, body: unknown, method = "POST") {
  return new Request(`http://localhost:3000${path}`, {
    method, headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  await db.operationAuditEvent.deleteMany();
  await db.exchangeOperation.deleteMany();
  await db.customer.deleteMany();
  await db.simulation.deleteMany();
  await db.user.deleteMany();
  actorId = (await db.user.create({ data: { name: "Operador de Teste", email: "operator@example.test", passwordHash: "unused-in-service-test", role: "OPERATOR" } })).id;
  customerId = (await db.customer.create({ data: { name: "Cliente de Teste", fictionalCpf: "00000000000", email: "customer@example.test", phone: "11900000000" } })).id;
  vi.mocked(auth).mockResolvedValue({ user: { id: actorId } } as never);
});
afterAll(async () => { await db.$disconnect(); });

it("confirma pela rota, preserva valores e retorna a mesma operação para reenvios", async () => {
  const input = { customerId, simulationToken: token() };
  const response = await POST(jsonRequest("/api/operacoes", input));
  expect(response.status).toBe(201);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const { data } = await response.json();
  expect(data).toMatchObject({ status: "PENDING", sourceAmount: "100.00", targetAmount: "512.35", exchangeRate: "5.12345678", quoteReferenceDate: "2026-10-30", createdById: actorId, customerId });
  expect(data.auditEvents).toHaveLength(1);
  expect(data.auditEvents[0]).toMatchObject({ action: "CREATED", previousStatus: null, newStatus: "PENDING", actorId });
  expect(data).not.toHaveProperty("confirmationKey");
  expect(JSON.stringify(data)).not.toContain("passwordHash");
  const repeated = await POST(jsonRequest("/api/operacoes", input));
  expect(repeated.status).toBe(200);
  expect((await repeated.json()).data.id).toBe(data.id);
  expect(await db.exchangeOperation.count()).toBe(1);
  expect(await db.operationAuditEvent.count()).toBe(1);
  expect((await listOperations())[0].id).toBe(data.id);
  expect((await getOperation(data.id)).auditEvents).toHaveLength(1);

  const otherCustomer = await db.customer.create({ data: { name: "Outro Cliente", fictionalCpf: "11111111111", email: "other@example.test", phone: "11900000001" } });
  await expect(createOperation({ ...input, customerId: otherCustomer.id })).rejects.toMatchObject({ code: "SIMULATION_ALREADY_CONFIRMED" });
});

it("serializa confirmações simultâneas da mesma simulação com um único evento inicial", async () => {
  const input = { customerId, simulationToken: token() };
  const results = await Promise.all([createOperation(input), createOperation(input)]);
  expect(results[0].operation.id).toBe(results[1].operation.id);
  expect(results.filter((result) => result.created)).toHaveLength(1);
  expect(await db.exchangeOperation.count()).toBe(1);
  expect(await db.operationAuditEvent.count()).toBe(1);
});

it("recusa token expirado, adulterado, de outro funcionário e cliente inexistente sem gravar", async () => {
  for (const simulationToken of [token({ expired: true }), `${token()}changed`, token({ actorId: "other" })]) {
    await expect(createOperation({ customerId, simulationToken })).rejects.toMatchObject({ code: "INVALID_SIMULATION" });
  }
  await expect(createOperation({ customerId: "missing", simulationToken: token() })).rejects.toMatchObject({ status: 404 });
  expect(await db.exchangeOperation.count()).toBe(0);
  expect(await db.operationAuditEvent.count()).toBe(0);
  await expect(getOperation("missing")).rejects.toMatchObject({ status: 404 });
});

it("grava transições e autoria em ordem, recusa status desatualizado e bloqueia estado final", async () => {
  const { operation } = await createOperation({ customerId, simulationToken: token() });
  const response = await PATCH(jsonRequest(`/api/operacoes/${operation.id}/status`, { expectedStatus: "PENDING", status: "UNDER_REVIEW" }, "PATCH"), { params: Promise.resolve({ id: operation.id }) });
  expect(response.status).toBe(200);
  expect((await response.json()).data.status).toBe("UNDER_REVIEW");
  await expect(changeOperationStatus(operation.id, { expectedStatus: "PENDING", status: "UNDER_REVIEW" })).rejects.toMatchObject({ code: "STATUS_CONFLICT" });
  const final = await changeOperationStatus(operation.id, { expectedStatus: "UNDER_REVIEW", status: "COMPLETED" });
  expect(final.auditEvents.map((event) => event.newStatus)).toEqual(["PENDING", "UNDER_REVIEW", "COMPLETED"]);
  expect(final.auditEvents.every((event) => event.actorId === actorId)).toBe(true);
  await expect(changeOperationStatus(operation.id, { expectedStatus: "COMPLETED", status: "UNDER_REVIEW" })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  expect((await getOperation(operation.id)).auditEvents).toHaveLength(3);
});

it("recusa uma de duas transições concorrentes e grava somente o evento vencedor", async () => {
  const { operation } = await createOperation({ customerId, simulationToken: token() });
  await changeOperationStatus(operation.id, { expectedStatus: "PENDING", status: "UNDER_REVIEW" });
  const results = await Promise.allSettled([
    changeOperationStatus(operation.id, { expectedStatus: "UNDER_REVIEW", status: "COMPLETED" }),
    changeOperationStatus(operation.id, { expectedStatus: "UNDER_REVIEW", status: "CANCELED" }),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
  expect(rejected.reason).toMatchObject({ code: "STATUS_CONFLICT" });
  const final = await getOperation(operation.id);
  expect(final.auditEvents).toHaveLength(3);
  expect(final.auditEvents.at(-1)?.newStatus).toBe(final.status);
});

it("desfaz criação e mudança de status se a gravação da auditoria falhar", async () => {
  const { operation } = await createOperation({ customerId, simulationToken: token() });
  // Falha real de escrita, injetada exclusivamente neste banco descartável.
  await db.$executeRaw`CREATE FUNCTION reject_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END; $$`;
  try {
    await db.$executeRaw`CREATE TRIGGER reject_test_audit BEFORE INSERT ON "OperationAuditEvent" FOR EACH ROW EXECUTE FUNCTION reject_test_audit()`;
    await expect(createOperation({ customerId, simulationToken: token() })).rejects.toThrow();
    await expect(changeOperationStatus(operation.id, { expectedStatus: "PENDING", status: "UNDER_REVIEW" })).rejects.toThrow();
    expect(await db.exchangeOperation.count()).toBe(1);
    const stored = await getOperation(operation.id);
    expect(stored.status).toBe("PENDING");
    expect(stored.auditEvents).toHaveLength(1);
  } finally {
    await db.$executeRaw`DROP TRIGGER IF EXISTS reject_test_audit ON "OperationAuditEvent"`;
    await db.$executeRaw`DROP FUNCTION IF EXISTS reject_test_audit()`;
  }
});

it("bloqueia consultas, confirmação e alteração sem sessão", async () => {
  vi.mocked(auth).mockResolvedValue(null as never);
  expect((await GET()).status).toBe(401);
  expect((await POST(jsonRequest("/api/operacoes", { customerId, simulationToken: token() }))).status).toBe(401);
  await expect(getOperation("missing")).rejects.toMatchObject({ status: 401 });
  await expect(changeOperationStatus("missing", {})).rejects.toMatchObject({ status: 401 });
  expect(await db.exchangeOperation.count()).toBe(0);
});

it("isola operações, totais e auditoria do operador, inclusive por ID e API, e mantém a visão do administrador", async () => {
  const own = (await createOperation({ customerId, simulationToken: token() })).operation;
  const other = await db.user.create({ data: { name: "Outro operador", email: "other-operator@example.test", passwordHash: "unused", role: "OPERATOR" } });
  vi.mocked(auth).mockResolvedValue({ user: { id: other.id } } as never);
  const foreign = (await createOperation({ customerId, simulationToken: token({ actorId: other.id }) })).operation;
  await changeOperationStatus(foreign.id, { expectedStatus: "PENDING", status: "UNDER_REVIEW" });
  vi.mocked(auth).mockResolvedValue({ user: { id: actorId } } as never);
  expect((await listOperations()).map((row) => row.id)).toEqual([own.id]);
  expect(await getOperationSummary()).toEqual({ PENDING: 1, UNDER_REVIEW: 0, COMPLETED: 0, CANCELED: 0 });
  expect((await (await GET()).json()).data.map((row: { id: string }) => row.id)).toEqual([own.id]);
  expect((await GET_OPERATION(new Request(`http://localhost/api/operacoes/${foreign.id}`), { params: Promise.resolve({ id: foreign.id }) })).status).toBe(404);
  expect((await PATCH(jsonRequest(`/api/operacoes/${foreign.id}/status`, { expectedStatus: "UNDER_REVIEW", status: "COMPLETED" }, "PATCH"), { params: Promise.resolve({ id: foreign.id }) })).status).toBe(404);
  expect((await db.exchangeOperation.findUniqueOrThrow({ where: { id: foreign.id } })).status).toBe("UNDER_REVIEW");
  expect(await db.operationAuditEvent.count({ where: { operationId: foreign.id } })).toBe(2);

  const admin = await db.user.create({ data: { name: "Administrador", email: "admin-scope@example.test", passwordHash: "unused", role: "ADMIN" } });
  vi.mocked(auth).mockResolvedValue({ user: { id: admin.id } } as never);
  expect(await listOperations()).toHaveLength(2);
  expect(await getOperationSummary()).toEqual({ PENDING: 1, UNDER_REVIEW: 1, COMPLETED: 0, CANCELED: 0 });
  expect((await getOperation(foreign.id)).auditEvents).toHaveLength(2);
  expect((await changeOperationStatus(foreign.id, { expectedStatus: "UNDER_REVIEW", status: "COMPLETED" })).status).toBe("COMPLETED");
});

it("persiste simulações por autor e vincula o histórico à operação, sem expor chave ou token", async () => {
  const timestamp = new Date().toISOString();
  vi.mocked(getQuote).mockResolvedValue({ sourceCurrency: "USD", targetCurrency: "BRL", exchangeRate: "5.12345678", quoteProvider: "Frankfurter / ECB", quoteReferenceDate: timestamp.slice(0, 10), quoteFetchedAt: timestamp, quoteTimestamp: timestamp, quoteTimestampKind: "FETCHED_AT" });
  const simulated = await simulateConversion({ sourceCurrency: "USD", targetCurrency: "BRL", sourceAmount: "100" });
  expect(await db.exchangeOperation.count()).toBe(0);
  const { operation } = await createOperation({ customerId, simulationToken: simulated.simulationToken });
  const other = await db.user.create({ data: { name: "Outro operador", email: "history-other@example.test", passwordHash: "unused", role: "OPERATOR" } });
  vi.mocked(auth).mockResolvedValue({ user: { id: other.id } } as never);
  await simulateConversion({ sourceCurrency: "USD", targetCurrency: "BRL", sourceAmount: "200" });
  vi.mocked(auth).mockResolvedValue({ user: { id: actorId } } as never);
  const history = await listSimulations();
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({ createdById: actorId, sourceAmount: "100.00", targetAmount: "512.35", operationId: operation.id, createdBy: { name: "Operador de Teste" } });
  expect(history[0]).not.toHaveProperty("confirmationKey");
  expect(history[0]).not.toHaveProperty("simulationToken");
  expect(JSON.stringify(history)).not.toContain("passwordHash");
  expect(await getSimulationCount()).toBe(1);
  expect((await (await GET_SIMULATIONS()).json()).data).toHaveLength(1);
  // Mesmo após expirar, a consulta e sua operação continuam no histórico.
  await db.simulation.update({ where: { id: history[0].id }, data: { expiresAt: new Date(0) } });
  expect((await listSimulations())[0].operationId).toBe(operation.id);
  const admin = await db.user.create({ data: { name: "Administrador", email: "history-admin@example.test", passwordHash: "unused", role: "ADMIN" } });
  vi.mocked(auth).mockResolvedValue({ user: { id: admin.id } } as never);
  expect(await listSimulations()).toHaveLength(2);
  expect(await listSimulations(1)).toHaveLength(1);
  expect(await getSimulationCount()).toBe(2);
  vi.mocked(auth).mockResolvedValue(null as never);
  expect((await GET_SIMULATIONS()).status).toBe(401);
});

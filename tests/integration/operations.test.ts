import "dotenv/config";
import { afterAll, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/server/auth/config", () => ({ auth: vi.fn() }));
import { auth } from "@/server/auth/config";
import { getDb } from "@/server/db/client";
import { listOperations, getOperationSummary, getOperation, changeOperationStatus } from "@/server/services/operations";
import { POST } from "@/app/api/operacoes/route";
import { listCustomers, getCustomer } from "@/server/services/customers";

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test")) throw new Error("Use um banco descartável terminado em _test.");
process.env.DATABASE_URL = url;
const db = getDb();
let authorId: string;
let analystId: string;
let customerId: string;
function login(id: string) { vi.mocked(auth).mockResolvedValue({ user: { id } } as never); }

async function legacyOperation() {
  // Fixture de uma operação V1 já existente. A aplicação não cria mais operações diretamente.
  return db.exchangeOperation.create({ data: {
    customerId, createdById: authorId, sourceCurrency: "USD", targetCurrency: "BRL",
    sourceAmount: "100", targetAmount: "512.35", exchangeRate: "5.12345678",
    quoteProvider: "Frankfurter / ECB", quoteReferenceDate: new Date("2026-10-30"),
    quoteTimestamp: new Date(), quoteTimestampKind: "FETCHED_AT", quoteFetchedAt: new Date(),
    auditEvents: { create: { actorId: authorId, action: "CREATED", newStatus: "PENDING" } },
  } });
}

beforeEach(async () => {
  await db.proposalAuditEvent.deleteMany(); await db.exchangeRequest.deleteMany(); await db.proposal.deleteMany();
  await db.operationAuditEvent.deleteMany(); await db.exchangeOperation.deleteMany();
  await db.customer.deleteMany(); await db.simulation.deleteMany(); await db.user.deleteMany();
  authorId = (await db.user.create({ data: { name: "Consultor", email: "author@example.test", passwordHash: "unused", role: "CONSULTANT" } })).id;
  analystId = (await db.user.create({ data: { name: "Analista", email: "analyst@example.test", passwordHash: "unused", role: "OPERATIONS_ANALYST" } })).id;
  customerId = (await db.customer.create({ data: { name: "Cliente", fictionalCpf: "00000000000", email: "customer@example.test", phone: "11900000000" } })).id;
  login(analystId);
});
afterAll(async () => { await db.$disconnect(); });

it("mantém consulta cadastral de suporte restrita aos clientes com operação", async () => {
  const unlinked = await db.customer.create({ data: { name: "Sem operação", fictionalCpf: "11111111111", email: "unlinked@example.test", phone: "11900000001" } });
  await legacyOperation();
  await db.user.update({ where: { id: analystId }, data: { role: "ADMIN" } });
  expect((await listCustomers()).map((row) => row.id)).toEqual([customerId]);
  await expect(getCustomer(unlinked.id)).rejects.toMatchObject({ status: 404 });
  for (const role of ["MANAGER", "OPERATIONS_ANALYST", "CONSULTANT"] as const) {
    await db.user.update({ where: { id: analystId }, data: { role } });
    expect(await listCustomers()).toHaveLength(2);
  }
});

it("preserva valores e histórico das operações V1 sem convertê-las em propostas", async () => {
  const row = await legacyOperation();
  const operation = await getOperation(row.id);
  expect(operation).toMatchObject({ sourceAmount: "100.00", targetAmount: "512.35", exchangeRate: "5.12345678", createdById: authorId });
  expect(operation.auditEvents).toHaveLength(1);
  expect(await db.proposal.count()).toBe(0);
});

it("mantém transições legadas, autoria do analista e bloqueio de status desatualizado e final", async () => {
  const row = await legacyOperation();
  await changeOperationStatus(row.id, { expectedStatus: "PENDING", status: "UNDER_REVIEW" });
  await expect(changeOperationStatus(row.id, { expectedStatus: "PENDING", status: "UNDER_REVIEW" })).rejects.toMatchObject({ code: "STATUS_CONFLICT" });
  const final = await changeOperationStatus(row.id, { expectedStatus: "UNDER_REVIEW", status: "COMPLETED" });
  expect(final.auditEvents.map((event) => event.actorId)).toEqual([authorId, analystId, analystId]);
  await expect(changeOperationStatus(row.id, { expectedStatus: "COMPLETED", status: "UNDER_REVIEW" })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
});

it("recusa uma de duas transições concorrentes e mantém apenas a auditoria vencedora", async () => {
  const row = await legacyOperation();
  await changeOperationStatus(row.id, { expectedStatus: "PENDING", status: "UNDER_REVIEW" });
  const results = await Promise.allSettled([
    changeOperationStatus(row.id, { expectedStatus: "UNDER_REVIEW", status: "COMPLETED" }),
    changeOperationStatus(row.id, { expectedStatus: "UNDER_REVIEW", status: "CANCELED" }),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect((await getOperation(row.id)).auditEvents).toHaveLength(3);
});

it("desfaz a transição legada quando a auditoria falha", async () => {
  const row = await legacyOperation();
  await db.$executeRaw`CREATE FUNCTION reject_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END; $$`;
  try {
    await db.$executeRaw`CREATE TRIGGER reject_test_audit BEFORE INSERT ON "OperationAuditEvent" FOR EACH ROW EXECUTE FUNCTION reject_test_audit()`;
    await expect(changeOperationStatus(row.id, { expectedStatus: "PENDING", status: "UNDER_REVIEW" })).rejects.toThrow();
    expect((await getOperation(row.id)).status).toBe("PENDING");
    expect(await db.operationAuditEvent.count()).toBe(1);
  } finally {
    await db.$executeRaw`DROP TRIGGER IF EXISTS reject_test_audit ON "OperationAuditEvent"`;
    await db.$executeRaw`DROP FUNCTION IF EXISTS reject_test_audit()`;
  }
});

it("isola leitura por autoria e impede análise pelo autor após mudança de função", async () => {
  const row = await legacyOperation();
  login(authorId);
  expect(await listOperations()).toHaveLength(1);
  await expect(changeOperationStatus(row.id, { expectedStatus: "PENDING", status: "UNDER_REVIEW" })).rejects.toMatchObject({ status: 403 });
  const other = await db.user.create({ data: { name: "Outro", email: "other@example.test", passwordHash: "unused", role: "CONSULTANT" } });
  login(other.id);
  expect(await listOperations()).toHaveLength(0);
  expect((await getOperationSummary()).PENDING).toBe(0);
  await expect(getOperation(row.id)).rejects.toMatchObject({ status: 404 });
  login(authorId);
  await db.user.update({ where: { id: authorId }, data: { role: "OPERATIONS_ANALYST" } });
  await expect(changeOperationStatus(row.id, { expectedStatus: "PENDING", status: "UNDER_REVIEW" })).rejects.toMatchObject({ code: "SELF_REVIEW_FORBIDDEN" });
  for (const role of ["ADMIN", "MANAGER"] as const) {
    await db.user.update({ where: { id: authorId }, data: { role } });
    expect(await listOperations()).toHaveLength(1);
    expect((await getOperationSummary()).PENDING).toBe(1);
    await expect(changeOperationStatus(row.id, { expectedStatus: "PENDING", status: "UNDER_REVIEW" })).rejects.toMatchObject({ status: 403 });
  }
});

it("bloqueia criação direta por HTTP e exige sessão nas leituras", async () => {
  login(authorId);
  const request = new Request("http://localhost:3000/api/operacoes", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  const response = await POST(request);
  expect(response.status).toBe(409);
  expect((await response.json()).error.code).toBe("APPROVAL_REQUIRED");
  expect(await db.exchangeOperation.count()).toBe(0);
  vi.mocked(auth).mockResolvedValue(null as never);
  await expect(listOperations()).rejects.toMatchObject({ status: 401 });
});

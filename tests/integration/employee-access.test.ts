import "dotenv/config";
import { afterAll, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/server/auth/config", () => ({ auth: vi.fn() }));
import { auth } from "@/server/auth/config";
import { getDb } from "@/server/db/client";
import { hashPassword } from "@/server/auth/password";
import { authenticateCredentials } from "@/server/auth/credentials";
import { requireActor } from "@/server/auth/authorize";
import { createEmployee, getEmployee, changeEmployeeAccess, listEmployees } from "@/server/services/employees";
import { changeOperationStatus, getOperation } from "@/server/services/operations";
import { GET, PATCH } from "@/app/api/funcionarios/[id]/route";
import { ROLES } from "@/domain/permissions";

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test")) throw new Error("Use somente banco descartável terminado em _test.");
process.env.DATABASE_URL = url;
const db = getDb();
let adminId: string;
let otherAdminId: string;
let employeeId: string;
const password = "senha fictícia de acesso";
function login(id: string, sessionVersion = 0) { vi.mocked(auth).mockResolvedValue({ user: { id, sessionVersion } } as never); }
function request(body: unknown, origin?: string) {
  return new Request("http://localhost:3000/api/funcionarios", { method: "PATCH", headers: { "content-type": "application/json", ...(origin ? { origin } : {}) }, body: JSON.stringify(body) });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const access = (role = "MANAGER", isActive = true, expectedRevision = 0) => ({ role, isActive, expectedRevision });
beforeEach(async () => {
  await db.proposalAuditEvent.deleteMany(); await db.exchangeRequest.deleteMany(); await db.proposal.deleteMany();
  await db.operationProcessingAttempt.deleteMany(); await db.operationAuditEvent.deleteMany(); await db.exchangeOperation.deleteMany();
  await db.customer.deleteMany(); await db.simulation.deleteMany(); await db.employeeAccessEvent.deleteMany(); await db.user.deleteMany();
  const passwordHash = await hashPassword(password);
  adminId = (await db.user.create({ data: { name: "Admin de acessos", email: "admin-access@example.test", role: "ADMIN", passwordHash } })).id;
  otherAdminId = (await db.user.create({ data: { name: "Outro admin", email: "other-admin-access@example.test", role: "ADMIN", passwordHash } })).id;
  employeeId = (await db.user.create({ data: { name: "Consultor de acessos", email: "consultant-access@example.test", role: "CONSULTANT", passwordHash } })).id;
  login(adminId);
});
afterAll(async () => { await db.$disconnect(); });

it("substitui um único perfil, preservando autoria, senha e bloqueio de análise própria", async () => {
  const customer = await db.customer.create({ data: { name: "Cliente fictício", email: "customer@example.test", fictionalCpf: "00000000000", phone: "11900000000" } });
  const operation = await db.exchangeOperation.create({ data: { customerId: customer.id, createdById: employeeId, sourceCurrency: "USD", targetCurrency: "BRL", sourceAmount: "100", targetAmount: "500", exchangeRate: "5", quoteProvider: "Fixture", quoteTimestamp: new Date(), quoteTimestampKind: "FETCHED_AT", quoteFetchedAt: new Date(), auditEvents: { create: { actorId: employeeId, action: "CREATED", newStatus: "PENDING" } } } });
  const before = await db.user.findUniqueOrThrow({ where: { id: employeeId } });
  const result = await changeEmployeeAccess(employeeId, access("OPERATIONS_ANALYST"));
  expect(result).toMatchObject({ id: employeeId, role: "OPERATIONS_ANALYST", isActive: true, accessRevision: 1 });
  expect(result.accessChanges).toMatchObject([{ revision: 1, previousRole: "CONSULTANT", newRole: "OPERATIONS_ANALYST", previousIsActive: true, newIsActive: true, actor: { id: adminId } }]);
  expect(JSON.stringify(result)).not.toMatch(/passwordHash|sessionVersion|password/);
  const after = await db.user.findUniqueOrThrow({ where: { id: employeeId } });
  expect(after.passwordHash).toBe(before.passwordHash);
  expect(after.createdAt).toEqual(before.createdAt);
  login(employeeId);
  expect((await requireActor()).role).toBe("OPERATIONS_ANALYST");
  const preserved = await getOperation(operation.id);
  expect(preserved).toMatchObject({ createdById: employeeId, sourceAmount: "100.00", targetAmount: "500.00" });
  expect(preserved.auditEvents[0].actorId).toBe(employeeId);
  await expect(changeOperationStatus(operation.id, { expectedStatus: "PENDING", status: "UNDER_REVIEW" })).rejects.toMatchObject({ code: "SELF_REVIEW_FORBIDDEN" });
});

it("desativa e reativa sem ressuscitar sessões anteriores nem mudar a senha", async () => {
  const before = await db.user.findUniqueOrThrow({ where: { id: employeeId } });
  await changeEmployeeAccess(employeeId, access("CONSULTANT", false));
  expect(await authenticateCredentials({ email: before.email, password })).toBeNull();
  login(employeeId);
  await expect(requireActor()).rejects.toMatchObject({ status: 401 });
  login(adminId);
  const active = await changeEmployeeAccess(employeeId, access("CONSULTANT", true, 1));
  expect(active.accessChanges).toHaveLength(2);
  login(employeeId);
  await expect(requireActor()).rejects.toMatchObject({ status: 401 });
  const fresh = await authenticateCredentials({ email: before.email, password });
  expect(fresh).toMatchObject({ id: employeeId, sessionVersion: 1 });
  login(employeeId, fresh!.sessionVersion);
  expect((await requireActor()).role).toBe("CONSULTANT");
  expect((await db.user.findUniqueOrThrow({ where: { id: employeeId } })).passwordHash).toBe(before.passwordHash);
});

it("reenvios e alterações iguais concorrentes produzem um único evento e não renovam a sessão", async () => {
  const input = access("CONSULTANT", false);
  const results = await Promise.all([changeEmployeeAccess(employeeId, input), changeEmployeeAccess(employeeId, input)]);
  expect(results[0]).toEqual(results[1]);
  expect(await changeEmployeeAccess(employeeId, input)).toEqual(results[0]);
  expect(await changeEmployeeAccess(employeeId, access("CONSULTANT", false, 1))).toEqual(results[0]);
  const row = await db.user.findUniqueOrThrow({ where: { id: employeeId } });
  expect(row.sessionVersion).toBe(1);
  expect(row.accessRevision).toBe(1);
  expect(await db.employeeAccessEvent.count()).toBe(1);
  await expect(changeEmployeeAccess(employeeId, access("MANAGER", true))).rejects.toMatchObject({ code: "ACCESS_CONFLICT" });
});

it("recusa uma de duas alterações diferentes concorrentes e comandos antigos após reversão", async () => {
  const results = await Promise.allSettled([changeEmployeeAccess(employeeId, access("MANAGER")), changeEmployeeAccess(employeeId, access("OPERATIONS_ANALYST"))]);
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect((results.find(r => r.status === "rejected") as PromiseRejectedResult).reason).toMatchObject({ code: "ACCESS_CONFLICT" });
  await changeEmployeeAccess(employeeId, access("CONSULTANT", true, 1));
  await expect(changeEmployeeAccess(employeeId, access("MANAGER"))).rejects.toMatchObject({ code: "ACCESS_CONFLICT" });
  expect(await db.employeeAccessEvent.count()).toBe(2);
});

it.each(["deactivate", "demote"])("preserva administrador ativo em alterações mútuas concorrentes: %s", async (action) => {
  vi.mocked(auth).mockReset();
  vi.mocked(auth).mockResolvedValueOnce({ user: { id: adminId, sessionVersion: 0 } } as never).mockResolvedValueOnce({ user: { id: otherAdminId, sessionVersion: 0 } } as never);
  const input = action === "deactivate" ? access("ADMIN", false) : access("MANAGER");
  const results = await Promise.allSettled([changeEmployeeAccess(otherAdminId, input), changeEmployeeAccess(adminId, input)]);
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(await db.user.count({ where: { role: "ADMIN", isActive: true } })).toBe(1);
  expect(await db.employeeAccessEvent.count()).toBe(1);
  const surviving = await db.user.findFirstOrThrow({ where: { role: "ADMIN", isActive: true } });
  login(surviving.id);
  await expect(changeEmployeeAccess(surviving.id, access("MANAGER"))).rejects.toMatchObject({ code: "SELF_ACCESS_CHANGE_FORBIDDEN" });
  await expect(changeEmployeeAccess(surviving.id, access("ADMIN", false))).rejects.toMatchObject({ code: "SELF_ACCESS_CHANGE_FORBIDDEN" });
});

it("limita detalhes e mutações ao administrador e protege origem, sessão e entradas estritas", async () => {
  for (const role of ROLES.filter(r => r !== "ADMIN")) {
    await db.user.update({ where: { id: employeeId }, data: { role } }); login(employeeId);
    expect((await GET(request({}), params(adminId))).status).toBe(403);
    expect((await PATCH(request(access()), params(adminId))).status).toBe(403);
  }
  login(adminId);
  for (const input of [{ role: "MANAGER" }, { ...access(), isActive: "false" }, { ...access(), expectedRevision: -1 }, { ...access(), role: "UNKNOWN" }, { ...access(), password: "changed" }, { ...access(), sessionVersion: 0 }]) {
    expect((await PATCH(request(input), params(employeeId))).status).toBe(400);
  }
  expect((await PATCH(request(access(), "https://other.example"), params(employeeId))).status).toBe(403);
  expect((await PATCH(request(access()), params("missing"))).status).toBe(404);
  expect((await GET(request({}), params("missing"))).status).toBe(404);
  expect((await PATCH(request(access()), params(adminId))).status).toBe(403);
  const response = await GET(request({}), params(employeeId));
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(JSON.stringify(await response.json())).not.toMatch(/passwordHash|sessionVersion|password/);
  expect((await listEmployees()).every(e => "isActive" in e && "accessRevision" in e)).toBe(true);
  vi.mocked(auth).mockResolvedValue(null as never);
  expect((await GET(request({}), params(employeeId))).status).toBe(401);
  expect((await PATCH(request(access()), params(employeeId))).status).toBe(401);
  expect(await db.employeeAccessEvent.count()).toBe(0);
});

it("desfaz acesso, revisão e revogação quando o histórico falha", async () => {
  await db.$executeRaw`CREATE FUNCTION reject_test_employee_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END; $$`;
  try {
    await db.$executeRaw`CREATE TRIGGER reject_test_employee_audit BEFORE INSERT ON "EmployeeAccessEvent" FOR EACH ROW EXECUTE FUNCTION reject_test_employee_audit()`;
    await expect(changeEmployeeAccess(employeeId, access("MANAGER", false))).rejects.toThrow();
    expect(await db.user.findUniqueOrThrow({ where: { id: employeeId } })).toMatchObject({ role: "CONSULTANT", isActive: true, sessionVersion: 0, accessRevision: 0 });
    expect((await getEmployee(employeeId)).accessChanges).toHaveLength(0);
  } finally {
    await db.$executeRaw`DROP TRIGGER IF EXISTS reject_test_employee_audit ON "EmployeeAccessEvent"`;
    await db.$executeRaw`DROP FUNCTION IF EXISTS reject_test_employee_audit()`;
  }
  const response = await PATCH(request(access("MANAGER", false)), params(employeeId));
  expect(response.status).toBe(200);
  expect((await response.json()).data).toMatchObject({ role: "MANAGER", isActive: false, accessRevision: 1 });
});

it("novos funcionários iniciam ativos e o cadastro recusa campos de controle de acesso", async () => {
  const input = { name: "Novo consultor", email: "new-access@example.test", password };
  expect(await createEmployee(input)).toMatchObject({ role: "CONSULTANT", isActive: true, accessRevision: 0 });
  await expect(createEmployee({ ...input, isActive: false })).rejects.toHaveProperty("name", "ZodError");
});

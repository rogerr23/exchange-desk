import "dotenv/config";
import { spawnSync } from "node:child_process";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/config", () => ({ auth: vi.fn() }));

import { auth } from "@/server/auth/config";
import { bootstrapAdmin } from "@/server/auth/bootstrap";
import { authenticateCredentials } from "@/server/auth/credentials";
import { verifyPassword } from "@/server/auth/password";
import { getDb } from "@/server/db/client";
import { createEmployee, listEmployees } from "@/server/services/employees";
import { createCustomer, getCustomer, listCustomers } from "@/server/services/customers";

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("Configure TEST_DATABASE_URL com um banco descartável cujo nome termine em _test. Nunca use o banco da aplicação.");
}
process.env.DATABASE_URL = url;
const db = getDb();
const initialAdmin = { name: "Admin de Teste", email: "admin@example.test", password: "senha fictícia de teste" };

beforeEach(async () => {
  vi.mocked(auth).mockReset();
  // Exclusivo do banco de testes explicitamente configurado acima.
  await db.operationAuditEvent.deleteMany();
  await db.exchangeOperation.deleteMany();
  await db.customer.deleteMany();
  await db.user.deleteMany();
});

afterAll(async () => { await db.$disconnect(); });

async function loginAs(id: string) {
  // A integração exercita serviços e guardas reais; só a sessão verificada do Auth.js é simulada aqui.
  vi.mocked(auth).mockResolvedValue({ user: { id, role: "ADMIN" } } as never);
}

describe("autenticação e cadastros com PostgreSQL", () => {
  it("executa o comando local sem imprimir credenciais e recusa a repetição", async () => {
    const env = { ...process.env, BOOTSTRAP_ADMIN_NAME: initialAdmin.name, BOOTSTRAP_ADMIN_EMAIL: initialAdmin.email, BOOTSTRAP_ADMIN_PASSWORD: initialAdmin.password };
    const args = ["--conditions=react-server", "--import", "tsx", "scripts/create-admin.ts"];
    const first = spawnSync(process.execPath, args, { env, encoding: "utf8" });
    expect(first.status, first.stderr).toBe(0);
    expect(first.stdout + first.stderr).not.toContain(initialAdmin.password);
    const repeated = spawnSync(process.execPath, args, { env, encoding: "utf8" });
    expect(repeated.status).toBe(1);
    expect(repeated.stderr).toContain("Já existe um administrador");
    expect(await db.user.count()).toBe(1);
  });

  it("cria administrador com hash Argon2id e autentica e-mail normalizado", async () => {
    const admin = await bootstrapAdmin(initialAdmin);
    expect(admin).not.toHaveProperty("passwordHash");
    const stored = await db.user.findUniqueOrThrow({ where: { id: admin.id } });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(stored.passwordHash, initialAdmin.password)).toBe(true);
    const authenticated = await authenticateCredentials({ email: " ADMIN@EXAMPLE.TEST ", password: initialAdmin.password });
    expect(authenticated).toMatchObject({ id: admin.id, role: "ADMIN" });
    expect(authenticated).not.toHaveProperty("passwordHash");
    expect(authenticated).not.toHaveProperty("password");
    expect(await authenticateCredentials({ email: admin.email, password: "senha incorreta" })).toBeNull();
    expect(await authenticateCredentials({ email: "missing@example.test", password: initialAdmin.password })).toBeNull();
  });

  it("recusa repetir o bootstrap sem alterar a senha existente", async () => {
    const admin = await bootstrapAdmin(initialAdmin);
    await expect(bootstrapAdmin({ ...initialAdmin, password: "outra senha de teste" })).rejects.toMatchObject({ code: "ADMIN_EXISTS" });
    expect(await db.user.count()).toBe(1);
    expect(await authenticateCredentials({ email: admin.email, password: initialAdmin.password })).not.toBeNull();
  });

  it("permite somente um bootstrap em execuções concorrentes", async () => {
    const results = await Promise.allSettled([
      bootstrapAdmin(initialAdmin),
      bootstrapAdmin({ ...initialAdmin, email: "other-admin@example.test" }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await db.user.count({ where: { role: "ADMIN" } })).toBe(1);
  });

  it("somente administrador cadastra funcionários e as respostas não expõem hashes", async () => {
    const admin = await bootstrapAdmin(initialAdmin);
    await loginAs(admin.id);
    const operator = await createEmployee({ name: "Operador de Teste", email: "operator@example.test", password: "senha de operador teste" });
    expect(operator.role).toBe("OPERATOR");
    expect(operator).not.toHaveProperty("passwordHash");
    expect((await listEmployees()).every((employee) => !("passwordHash" in employee))).toBe(true);

    await loginAs(operator.id);
    await expect(createEmployee({ name: "Intruso", email: "intruso@example.test", password: "senha fictícia teste", role: "ADMIN" })).rejects.toMatchObject({ status: 403 });
    await expect(listEmployees()).rejects.toMatchObject({ status: 403 });
    expect(await db.user.count()).toBe(2);
  });

  it("permite cadastrar e consultar clientes fictícios, mantendo CPF único", async () => {
    const admin = await bootstrapAdmin(initialAdmin);
    await loginAs(admin.id);
    const operator = await createEmployee({ name: "Operador", email: "operator@example.test", password: "senha fictícia operador" });
    await loginAs(operator.id);
    const input = { name: "Cliente Fictício", fictionalCpf: "000.000.000-00", email: " CLIENTE@EXAMPLE.TEST ", phone: "(11) 90000-0000" };
    const customer = await createCustomer(input);
    expect(customer).toMatchObject({ fictionalCpf: "00000000000", email: "cliente@example.test", phone: "11900000000" });
    expect(await getCustomer(customer.id)).toMatchObject({ id: customer.id });
    await expect(createCustomer(input)).rejects.toMatchObject({ code: "P2002" });
    await expect(createCustomer({ ...input, fictionalCpf: "invalido" })).rejects.toHaveProperty("name", "ZodError");
    expect(await db.customer.count()).toBe(1);
    await loginAs(admin.id);
    expect(await listCustomers()).toHaveLength(1);
    await expect(getCustomer("missing")).rejects.toMatchObject({ status: 404 });
  });

  it("recusa consultas e cadastros sem sessão sem gravar no banco", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    await expect(listCustomers()).rejects.toMatchObject({ status: 401 });
    await expect(createCustomer({})).rejects.toMatchObject({ status: 401 });
    await expect(createEmployee({})).rejects.toMatchObject({ status: 401 });
    expect(await db.customer.count()).toBe(0);
    expect(await db.user.count()).toBe(0);
  });
});

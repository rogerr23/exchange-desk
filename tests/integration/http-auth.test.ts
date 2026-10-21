import "dotenv/config";
import { randomBytes } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import { getDb } from "@/server/db/client";
import { hashPassword } from "@/server/auth/password";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error(
    "Configure TEST_DATABASE_URL com um banco descartável cujo nome termine em _test.",
  );
}
process.env.DATABASE_URL = databaseUrl;
const db = getDb();
const password = randomBytes(24).toString("hex");
let server: ChildProcess | undefined;
let base: string;
let serverOutput = "";

type Jar = Map<string, string>;

async function request(
  path: string,
  jar: Jar = new Map(),
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set(
    "cookie",
    [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
  );
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers,
    redirect: "manual",
  });
  for (const cookie of response.headers.getSetCookie()) {
    const entry = cookie.split(";", 1)[0];
    const separator = entry.indexOf("=");
    const name = entry.slice(0, separator);
    const value = entry.slice(separator + 1);
    if (value) jar.set(name, value);
    else jar.delete(name);
  }
  return response;
}

async function signIn(email: string, suppliedPassword = password) {
  const jar: Jar = new Map();
  const { csrfToken } = await (await request("/api/auth/csrf", jar)).json();
  await request("/api/auth/callback/credentials", jar, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: base,
    },
    body: new URLSearchParams({
      email,
      password: suppliedPassword,
      csrfToken,
      callbackUrl: base,
    }),
  });
  return jar;
}

beforeAll(async () => {
  await db.operationAuditEvent.deleteMany();
  await db.exchangeOperation.deleteMany();
  await db.customer.deleteMany();
  await db.user.deleteMany();
  await db.user.create({
    data: {
      name: "HTTP Admin",
      email: "http-admin@example.test",
      role: "ADMIN",
      passwordHash: await hashPassword(password),
    },
  });

  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const address = probe.address();
  if (!address || typeof address === "string")
    throw new Error("Não foi possível escolher a porta de testes.");
  const port = address.port;
  await new Promise<void>((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );
  base = `http://127.0.0.1:${port}`;
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        AUTH_URL: base,
        AUTH_SECRET: randomBytes(48).toString("base64url"),
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout?.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr?.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(base)).ok) return;
    } catch {
      /* Aguardar o servidor iniciar. */
    }
    if (server.exitCode !== null)
      throw new Error(`Servidor de teste encerrou: ${serverOutput}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `Servidor não iniciou. Execute npm run build antes dos testes. ${serverOutput}`,
  );
});

afterAll(async () => {
  if (server && server.exitCode === null) {
    const closed = once(server, "exit");
    server.kill("SIGTERM");
    await closed;
  }
  await db.$disconnect();
});

it("valida login, cookies, perfis, cadastros e logout pelo HTTP real", async () => {
  const loginPage = await request("/login");
  expect(loginPage.status).toBe(200);
  expect(await loginPage.text()).toContain("Entrar no sistema");
  const privatePage = await request("/funcionarios/novo");
  expect(
    privatePage.headers.get("location") || (await privatePage.text()),
  ).toContain("/login");
  expect((await request("/api/clientes")).status).toBe(401);
  expect((await request("/api/funcionarios")).status).toBe(401);
  const wrongLogin = await signIn("http-admin@example.test", "senha errada");
  expect((await request("/api/clientes", wrongLogin)).status).toBe(401);

  const admin = await signIn(" HTTP-ADMIN@EXAMPLE.TEST ");
  const session = await (await request("/api/auth/session", admin)).json();
  expect(session.user).toMatchObject({
    email: "http-admin@example.test",
    role: "ADMIN",
  });
  expect(session.user).not.toHaveProperty("passwordHash");
  const sendJson = (body: unknown, origin = base): RequestInit => ({
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
  const employee = await request(
    "/api/funcionarios",
    admin,
    sendJson({
      name: "HTTP Operador",
      email: "http-operator@example.test",
      password,
    }),
  );
  expect(employee.status).toBe(201);
  expect((await employee.json()).data).not.toHaveProperty("passwordHash");
  expect((await request("/api/funcionarios", admin)).status).toBe(200);
  const registrationPage = await request("/funcionarios/novo", admin);
  expect(registrationPage.status).toBe(200);
  expect(await registrationPage.text()).toContain("Confirmar senha");
  const employeePage = await request("/funcionarios", admin);
  expect(await employeePage.text()).toContain("HTTP Operador");

  const operator = await signIn("http-operator@example.test");
  const deniedPage = await request("/funcionarios/novo", operator);
  // Redirecionamentos iniciados após streaming também podem vir no HTML.
  expect(
    deniedPage.headers.get("location") || (await deniedPage.text()),
  ).toContain("/inicio?acesso=negado");
  expect((await request("/api/funcionarios", operator)).status).toBe(403);
  expect(
    (
      await request(
        "/api/funcionarios",
        operator,
        sendJson({
          name: "Intruso",
          email: "intruso@example.test",
          password,
          role: "ADMIN",
        }),
      )
    ).status,
  ).toBe(403);
  const customer = {
    name: "HTTP Cliente Fictício",
    fictionalCpf: "111.111.111-11",
    email: " CLIENTE@EXAMPLE.TEST ",
    phone: "(11) 90000-0000",
  };
  const created = await request("/api/clientes", operator, sendJson(customer));
  expect(created.status).toBe(201);
  const { data } = await created.json();
  expect(data).toMatchObject({
    fictionalCpf: "11111111111",
    email: "cliente@example.test",
  });
  expect((await request(`/api/clientes/${data.id}`, admin)).status).toBe(200);
  expect(
    (await request("/api/clientes", operator, sendJson(customer))).status,
  ).toBe(409);
  expect((await request("/api/clientes", operator, sendJson({}))).status).toBe(
    400,
  );
  expect(
    (
      await request(
        "/api/clientes",
        operator,
        sendJson(customer, "https://other.example"),
      )
    ).status,
  ).toBe(403);

  const { csrfToken } = await (
    await request("/api/auth/csrf", operator)
  ).json();
  await request("/api/auth/signout", operator, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: base,
    },
    body: new URLSearchParams({ csrfToken, callbackUrl: base }),
  });
  expect((await request("/api/clientes", operator)).status).toBe(401);
});

import "dotenv/config";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import { getDb } from "@/server/db/client";
import { hashPassword } from "@/server/auth/password";
import { signSimulation, SIMULATION_TTL_MS } from "@/server/quotes/simulation-token";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error(
    "Configure TEST_DATABASE_URL com um banco descartável cujo nome termine em _test.",
  );
}
process.env.DATABASE_URL = databaseUrl;
const db = getDb();
const password = randomBytes(24).toString("hex");
const serverSecret = randomBytes(48).toString("base64url");
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
  await db.proposalAuditEvent.deleteMany();
  await db.exchangeRequest.deleteMany();
  await db.proposal.deleteMany();
  await db.operationProcessingAttempt.deleteMany(); await db.operationAuditEvent.deleteMany();
  await db.exchangeOperation.deleteMany();
  await db.customer.deleteMany();
  await db.simulation.deleteMany();
  await db.employeeAccessEvent.deleteMany(); await db.user.deleteMany();
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
        AUTH_SECRET: serverSecret,
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
  const panel = await request("/inicio", operator);
  expect(panel.status).toBe(200);
  const panelHtml = await panel.text();
  expect(panelHtml).toContain("Meu painel");
  expect(panelHtml).toContain("Somente registros criados por você");
  expect(panelHtml).toContain("O que fazer agora");
  expect(panelHtml).toContain("Propostas aguardando aceite");
  expect(panelHtml).toContain("Solicitações aguardando análise");
  expect(panelHtml).not.toContain("Gerenciar funcionários");
  const historyPage = await request("/simulacoes/historico", operator);
  expect(historyPage.status).toBe(200);
  expect(await historyPage.text()).toContain("Simulações feitas por você");
  const operationsPage = await request("/operacoes", operator);
  expect(operationsPage.status).toBe(200);
  expect(await operationsPage.text()).toContain("Operações registradas por você");
  const adminPanel = await request("/inicio", admin);
  expect(adminPanel.status).toBe(200);
  const adminHtml = await adminPanel.text();
  expect(adminHtml).toContain("Visão da equipe");
  expect(adminHtml).toContain("Gerenciar funcionários");
  expect(adminHtml).toContain("Funcionários ativos");
  expect(adminHtml).toContain("Funcionários desativados");
  expect(adminHtml).not.toContain("Nova simulação");
  expect(adminHtml).not.toContain("Simulações salvas");
  expect((await request("/api/simulacoes", admin)).status).toBe(403);
  expect((await request("/api/operacoes", admin, sendJson({}))).status).toBe(403);
  const deniedSimulation = await request("/simulacoes", admin);
  expect(deniedSimulation.headers.get("location") || await deniedSimulation.text()).toContain("/inicio?acesso=negado");

  for (const role of ["OPERATIONS_ANALYST", "MANAGER"]) {
    const email = `${role.toLowerCase()}@example.test`;
    expect((await request("/api/funcionarios", admin, sendJson({ name: `HTTP ${role}`, email, password, role }))).status).toBe(201);
    const jar = await signIn(email);
    expect((await (await request("/api/auth/session", jar)).json()).user.role).toBe(role);
    const rolePanel = await request("/inicio", jar);
    expect(rolePanel.status).toBe(200);
    const html = await rolePanel.text();
    expect(html).toContain("Toda a equipe");
    expect(html).not.toContain("Nova simulação");
    expect(html).not.toContain("Simulações salvas");
    expect(html).not.toContain("Gerenciar funcionários");
    expect(html).toContain("Fila de análise da equipe");
    expect(html).not.toContain("Funcionários ativos");
    if (role === "OPERATIONS_ANALYST") expect(html).not.toContain("Propostas aguardando aceite");
    expect((await request("/api/operacoes", jar)).status).toBe(200);
    expect((await request("/api/funcionarios", jar)).status).toBe(403);
    expect((await request("/api/simulacoes", jar)).status).toBe(403);
    expect((await request("/api/simulacoes", jar, sendJson({}))).status).toBe(403);
    expect((await request("/api/clientes", jar, sendJson({}))).status).toBe(403);
    expect((await request("/api/operacoes", jar, sendJson({}))).status).toBe(403);
    const statusResponse = await request("/api/operacoes/missing/status", jar, { ...sendJson({ expectedStatus: "PENDING", status: "UNDER_REVIEW" }), method: "PATCH" });
    expect(statusResponse.status).toBe(role === "OPERATIONS_ANALYST" ? 404 : 403);
    const clientsHtml = await (await request("/clientes", jar)).text();
    expect(clientsHtml).not.toContain("Novo cliente");
  }
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
  expect((await request(`/api/clientes/${data.id}`, admin)).status).toBe(404);
  expect((await request("/api/clientes", admin, sendJson(customer))).status).toBe(403);
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

  // Uma sessão existente perde imediatamente as permissões do perfil anterior.
  const consultant = await db.user.findUniqueOrThrow({ where: { email: "http-operator@example.test" } });
  const issued = Date.now();
  const previousSecret = process.env.AUTH_SECRET;
  let simulationToken: string;
  try {
    process.env.AUTH_SECRET = serverSecret;
    simulationToken = signSimulation({ version: 1, simulationId: randomUUID(), actorId: consultant.id,
      sourceCurrency: "USD", targetCurrency: "BRL", sourceAmount: "100.00", targetAmount: "512.35", exchangeRate: "5.12345678",
      quoteProvider: "Frankfurter / ECB", quoteReferenceDate: "2026-10-30", quoteTimestamp: new Date(issued).toISOString(),
      quoteTimestampKind: "FETCHED_AT", quoteFetchedAt: new Date(issued).toISOString(), issuedAt: new Date(issued).toISOString(), expiresAt: new Date(issued + SIMULATION_TTL_MS).toISOString(),
    });
  } finally {
    if (previousSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previousSecret;
  }
  const proposalResponse = await request("/api/propostas", operator, sendJson({ customerId: data.id, simulationToken }));
  expect(proposalResponse.status).toBe(201);
  const proposal = (await proposalResponse.json()).data;
  const proposalPage = await request(`/propostas/${proposal.id}`, operator);
  expect(await proposalPage.text()).toContain("Registrar aceite simulado");
  const analyst = await signIn("operations_analyst@example.test");
  expect((await request(`/api/propostas/${proposal.id}`, analyst)).status).toBe(404);
  expect((await request(`/api/propostas/${proposal.id}`, admin)).status).toBe(200);
  expect((await request("/api/operacoes", operator, sendJson({ customerId: data.id, simulationToken }))).status).toBe(409);
  const accepted = await request(`/api/propostas/${proposal.id}/aceite`, operator, sendJson({ confirmSimulatedAcceptance: true }));
  expect(accepted.status).toBe(201);
  const acceptedProposal = (await accepted.json()).data;
  expect(acceptedProposal.status).toBe("ACCEPTED");
  expect((await request(`/api/solicitacoes/${acceptedProposal.request.id}`, analyst)).status).toBe(200);
  expect((await request(`/api/propostas/${proposal.id}`, analyst)).status).toBe(200);
  expect((await request(`/api/propostas/${proposal.id}/aceite`, admin, sendJson({ confirmSimulatedAcceptance: true }))).status).toBe(403);
  const requestPage = await request(`/solicitacoes/${acceptedProposal.request.id}`, operator);
  expect(await requestPage.text()).toContain("Aguardando análise");
  expect(await db.exchangeOperation.count()).toBe(0);
  const decisionPath = `/api/solicitacoes/${acceptedProposal.request.id}/decisao`;
  const manager = await signIn("manager@example.test");
  for (const jar of [operator, admin, manager]) {
    expect((await request(decisionPath, jar, sendJson({ decision: "APPROVED" }))).status).toBe(403);
    const html = await (await request(`/solicitacoes/${acceptedProposal.request.id}`, jar)).text();
    expect(html).not.toContain("Confirmar aprovação");
  }
  const reviewHtml = await (await request(`/solicitacoes/${acceptedProposal.request.id}`, analyst)).text();
  expect(reviewHtml).toContain("Confirmar aprovação");
  await db.user.update({ where: { id: consultant.id }, data: { role: "OPERATIONS_ANALYST" } });
  const selfDecision = await request(decisionPath, operator, sendJson({ decision: "APPROVED" }));
  expect(selfDecision.status).toBe(403);
  expect((await selfDecision.json()).error.code).toBe("SELF_REVIEW_FORBIDDEN");
  await db.user.update({ where: { id: consultant.id }, data: { role: "CONSULTANT" } });
  const approval = await request(decisionPath, analyst, sendJson({ decision: "APPROVED" }));
  expect(approval.status).toBe(200);
  const approved = (await approval.json()).data;
  expect(approved.status).toBe("APPROVED");
  expect((await (await request(decisionPath, analyst, sendJson({ decision: "APPROVED" }))).json()).data.operationId).toBe(approved.operationId);
  const approvedHtml = await (await request(`/solicitacoes/${acceptedProposal.request.id}`, operator)).text();
  expect(approvedHtml).toContain("Aprovada");
  expect(approvedHtml).toContain("Ver operação gerada");
  const operationHtml = await (await request(`/operacoes/${approved.operationId}`, analyst)).text();
  expect(operationHtml).toContain("Ver decisão e proposta de origem");
  const blockedTransition = await request(`/api/operacoes/${approved.operationId}/status`, analyst, { ...sendJson({ expectedStatus: "PENDING", status: "UNDER_REVIEW" }), method: "PATCH" });
  expect(blockedTransition.status).toBe(409);
  expect((await blockedTransition.json()).error.code).toBe("PROCESSING_REQUIRED");
  expect(await db.exchangeOperation.count()).toBe(1);
  const processingPath = `/api/operacoes/${approved.operationId}/processamento`;
  for (const jar of [operator, admin, manager]) {
    expect((await request(processingPath, jar, sendJson({ expectedAttemptCount: 0, scenario: "SUCCESS" }))).status).toBe(403);
    expect(await (await request(`/operacoes/${approved.operationId}`, jar)).text()).not.toContain("Iniciar processamento simulado");
  }
  expect(operationHtml).toContain("Iniciar processamento simulado");
  const failedStart = await request(processingPath, analyst, sendJson({ expectedAttemptCount: 0, scenario: "FAILURE" }));
  expect(failedStart.status).toBe(200);
  const processing = (await failedStart.json()).data;
  expect(processing.status).toBe("PROCESSING");
  const firstAttempt = processing.processingAttempts[0];
  await new Promise(resolve => setTimeout(resolve, Math.max(0, Date.parse(firstAttempt.readyAt) - Date.now()) + 30));
  const failedResult = await request(`${processingPath}/resultado`, analyst, sendJson({ attemptId: firstAttempt.id }));
  expect(failedResult.status).toBe(200);
  expect((await failedResult.json()).data.status).toBe("FAILED");
  const retryHtml = await (await request(`/operacoes/${approved.operationId}`, analyst)).text();
  expect(retryHtml).toContain("Iniciar nova tentativa");
  expect(retryHtml).toContain("Falha simulada");
  const retryStart = await request(processingPath, analyst, sendJson({ expectedAttemptCount: 1, scenario: "SUCCESS" }));
  const retry = (await retryStart.json()).data;
  const secondAttempt = retry.processingAttempts[0];
  expect(retry.processingAttempts).toHaveLength(2);
  await new Promise(resolve => setTimeout(resolve, Math.max(0, Date.parse(secondAttempt.readyAt) - Date.now()) + 30));
  const completed = await request(`${processingPath}/resultado`, analyst, sendJson({ attemptId: secondAttempt.id }));
  expect((await completed.json()).data.status).toBe("COMPLETED");
  const completedHtml = await (await request(`/operacoes/${approved.operationId}`, operator)).text();
  expect(completedHtml).toContain("Concluída");
  expect(completedHtml.replaceAll("<!-- -->", "")).toContain("Tentativa 2");
  expect(await db.exchangeOperation.count()).toBe(1);
  const accessPath = `/api/funcionarios/${consultant.id}`;
  const changeAccess = (body: unknown, origin = base): RequestInit => ({ ...sendJson(body, origin), method: "PATCH" });
  for (const jar of [operator, analyst, manager]) {
    expect((await request(accessPath, jar)).status).toBe(403);
    expect((await request(accessPath, jar, changeAccess({ expectedRevision: 0, role: "MANAGER", isActive: true }))).status).toBe(403);
  }
  expect((await request(accessPath, admin, changeAccess({ expectedRevision: 0, role: "MANAGER", isActive: true }, "https://other.example"))).status).toBe(403);
  expect((await request(`/api/funcionarios/${session.user.id}`, admin, changeAccess({ expectedRevision: 0, role: "MANAGER", isActive: false }))).status).toBe(403);
  const managedPage = await (await request(`/funcionarios/${consultant.id}`, admin)).text();
  expect(managedPage).toContain("Gerenciar acesso");
  expect(managedPage).toContain("Confirmar alteração de acesso");
  const changedRole = await request(accessPath, admin, changeAccess({ expectedRevision: 0, role: "MANAGER", isActive: true }));
  expect(changedRole.status).toBe(200);
  expect((await changedRole.json()).data).toMatchObject({ role: "MANAGER", accessRevision: 1 });
  expect((await request("/api/simulacoes", operator)).status).toBe(403);
  expect((await request("/api/clientes", operator, sendJson(customer))).status).toBe(403);
  const changedPanel = await (await request("/inicio", operator)).text();
  expect(changedPanel).toContain("Gerente");
  expect(changedPanel).not.toContain("Nova simulação");
  expect((await (await request("/api/auth/session", operator)).json()).user.role).toBe("MANAGER");
  expect((await request(accessPath, admin, changeAccess({ expectedRevision: 1, role: "CONSULTANT", isActive: true }))).status).toBe(200);
  const staleCookies = new Map(operator);
  expect((await request(accessPath, admin, changeAccess({ expectedRevision: 2, role: "CONSULTANT", isActive: false }))).status).toBe(200);
  expect((await request("/api/operacoes", new Map(staleCookies))).status).toBe(401);
  expect((await request("/api/clientes", await signIn("http-operator@example.test"))).status).toBe(401);
  const inactivePanel = await request("/inicio", new Map(staleCookies));
  expect(inactivePanel.headers.get("location") || await inactivePanel.text()).toContain("/login");
  expect((await request(accessPath, admin, changeAccess({ expectedRevision: 3, role: "CONSULTANT", isActive: true }))).status).toBe(200);
  expect((await request("/api/operacoes", new Map(staleCookies))).status).toBe(401);
  expect(await (await request("/api/auth/session", new Map(staleCookies))).json()).toBeNull();
  const freshOperator = await signIn("http-operator@example.test");
  expect((await request("/api/operacoes", freshOperator)).status).toBe(200);
  const currentAccess = (await (await request(accessPath, admin)).json()).data;
  expect(currentAccess.accessChanges).toHaveLength(4);
  expect(JSON.stringify(currentAccess)).not.toMatch(/passwordHash|sessionVersion/);
  operator.clear();
  for (const [name, value] of freshOperator) operator.set(name, value);

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

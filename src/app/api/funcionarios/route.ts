import { createEmployee, listEmployees } from "@/server/services/employees";
import { json, readJson, respond } from "@/server/http";

export const runtime = "nodejs";

export async function GET() {
  return respond(async () => json({ data: await listEmployees() }));
}

export async function POST(request: Request) {
  return respond(async () => json({ data: await createEmployee(await readJson(request)) }, 201));
}

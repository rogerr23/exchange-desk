import { getEmployee, changeEmployeeAccess } from "@/server/services/employees";
import { json, readJson, respond } from "@/server/http";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return respond(async () => json({ data: await getEmployee((await params).id) }));
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return respond(async () => json({ data: await changeEmployeeAccess((await params).id, await readJson(request)) }));
}

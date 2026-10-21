import { createCustomer, listCustomers } from "@/server/services/customers";
import { json, readJson, respond } from "@/server/http";

export const runtime = "nodejs";

export async function GET() {
  return respond(async () => json({ data: await listCustomers() }));
}

export async function POST(request: Request) {
  return respond(async () => json({ data: await createCustomer(await readJson(request)) }, 201));
}

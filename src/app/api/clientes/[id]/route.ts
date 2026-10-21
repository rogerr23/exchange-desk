import { getCustomer } from "@/server/services/customers";
import { json, respond } from "@/server/http";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return respond(async () => json({ data: await getCustomer((await params).id) }));
}

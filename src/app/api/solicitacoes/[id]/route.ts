import { json, respond } from "@/server/http";
import { getExchangeRequest } from "@/server/services/proposals";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return respond(async () => json({ data: await getExchangeRequest((await params).id) }));
}

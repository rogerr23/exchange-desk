import { json, readJson, respond } from "@/server/http";
import { decideExchangeRequest } from "@/server/services/proposals";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return respond(async () => json({ data: await decideExchangeRequest((await params).id, await readJson(request)) }));
}

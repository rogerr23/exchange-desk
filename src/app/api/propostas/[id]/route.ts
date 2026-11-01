import { json, respond } from "@/server/http";
import { getProposal } from "@/server/services/proposals";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return respond(async () => json({ data: await getProposal((await params).id) }));
}

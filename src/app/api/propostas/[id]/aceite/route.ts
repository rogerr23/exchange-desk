import { json, readJson, respond } from "@/server/http";
import { acceptProposal } from "@/server/services/proposals";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return respond(async () => {
    const result = await acceptProposal((await params).id, await readJson(request));
    return json({ data: result.proposal }, result.created ? 201 : 200);
  });
}

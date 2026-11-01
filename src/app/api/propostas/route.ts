import { json, readJson, respond } from "@/server/http";
import { createProposal, listProposals } from "@/server/services/proposals";
export const runtime = "nodejs";
export async function GET() { return respond(async () => json({ data: await listProposals() })); }
export async function POST(request: Request) {
  return respond(async () => {
    const result = await createProposal(await readJson(request));
    return json({ data: result.proposal }, result.created ? 201 : 200);
  });
}

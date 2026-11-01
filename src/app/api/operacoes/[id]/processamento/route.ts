import { json, readJson, respond } from "@/server/http";
import { startOperationProcessing } from "@/server/services/processing";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return respond(async () => json({ data: await startOperationProcessing((await params).id, await readJson(request)) }));
}

import { json, respond } from "@/server/http";
import { getOperation } from "@/server/services/operations";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return respond(async () => json({ data: await getOperation((await params).id) }));
}

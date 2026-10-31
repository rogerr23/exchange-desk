import { json, readJson, respond } from "@/server/http";
import { changeOperationStatus } from "@/server/services/operations";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return respond(async () => json({ data: await changeOperationStatus((await params).id, await readJson(request)) }));
}

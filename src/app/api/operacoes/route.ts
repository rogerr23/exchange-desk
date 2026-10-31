import { json, readJson, respond } from "@/server/http";
import { createOperation, listOperations } from "@/server/services/operations";

export const runtime = "nodejs";

export async function GET() {
  return respond(async () => json({ data: await listOperations() }));
}

export async function POST(request: Request) {
  return respond(async () => {
    const result = await createOperation(await readJson(request));
    return json({ data: result.operation }, result.created ? 201 : 200);
  });
}

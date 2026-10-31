import { json, readJson, respond } from "@/server/http";
import { listSimulations, simulateConversion } from "@/server/services/simulations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return respond(async () => json({ data: await simulateConversion(await readJson(request)) }));
}

export async function GET() {
  return respond(async () => json({ data: await listSimulations() }));
}

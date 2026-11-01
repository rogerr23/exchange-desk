import { json, respond } from "@/server/http";
import { listRequests } from "@/server/services/proposals";
export const runtime = "nodejs";
export async function GET() { return respond(async () => json({ data: await listRequests() })); }

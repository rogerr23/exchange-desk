import { requirePermission } from "@/server/auth/authorize";
import { AppError } from "@/server/errors";
import { json, readJson, respond } from "@/server/http";
import { listOperations } from "@/server/services/operations";

export const runtime = "nodejs";

export async function GET() {
  return respond(async () => json({ data: await listOperations() }));
}

export async function POST(request: Request) {
  return respond(async () => {
    await requirePermission("proposals:create");
    await readJson(request);
    throw new AppError(409, "APPROVAL_REQUIRED", "Crie uma proposta e registre o aceite simulado. A operação será criada somente após aprovação da solicitação.");
  });
}

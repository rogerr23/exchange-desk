import "server-only";
import { can, type Permission } from "@/domain/permissions";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { auth } from "./config";

export async function requirePermission(permission: Permission) {
  const session = await auth();
  if (!session?.user?.id) throw new AppError(401, "UNAUTHENTICATED", "Entre no sistema para continuar.");

  // O banco é a referência do perfil atual; não confiar em dados enviados pelo navegador.
  const actor = await getDb().user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!actor) throw new AppError(401, "UNAUTHENTICATED", "Entre no sistema para continuar.");
  if (!can(actor.role, permission)) throw new AppError(403, "FORBIDDEN", "Você não tem permissão para esta ação.");
  return actor;
}

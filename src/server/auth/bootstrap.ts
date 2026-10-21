import "server-only";
import { createUserSchema } from "@/schemas/user";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { hashPassword } from "./password";

// Exclusivo do comando local. Nunca expor esta função em uma rota pública.
export async function bootstrapAdmin(input: unknown) {
  const { password, ...data } = createUserSchema.omit({ role: true }).parse(input);
  const passwordHash = await hashPassword(password);

  return getDb().$transaction(async (tx) => {
    // Serializa duas execuções simultâneas do bootstrap no PostgreSQL.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(78210401)`;
    const existing = await tx.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
    if (existing) throw new AppError(409, "ADMIN_EXISTS", "Já existe um administrador. Use o cadastro autenticado de funcionários.");
    return tx.user.create({
      data: { ...data, role: "ADMIN", passwordHash },
      select: { id: true, name: true, email: true, role: true },
    });
  });
}

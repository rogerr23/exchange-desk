import "server-only";
import { createUserSchema } from "@/schemas/user";
import { requirePermission } from "@/server/auth/authorize";
import { hashPassword } from "@/server/auth/password";
import { getDb } from "@/server/db/client";

const publicFields = { id: true, name: true, email: true, role: true } as const;

export async function listEmployees() {
  await requirePermission("employees:read");
  return getDb().user.findMany({ select: publicFields, orderBy: [{ createdAt: "desc" }, { id: "asc" }] });
}

export async function createEmployee(input: unknown) {
  await requirePermission("employees:create");
  const { password, ...data } = createUserSchema.parse(input);
  const passwordHash = await hashPassword(password);
  return getDb().user.create({ data: { ...data, passwordHash }, select: publicFields });
}

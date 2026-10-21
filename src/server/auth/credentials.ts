import "server-only";
import { randomBytes } from "node:crypto";
import { loginSchema } from "@/schemas/user";
import { getDb } from "@/server/db/client";
import { hashPassword, verifyPassword } from "./password";

let dummyHash: Promise<string> | undefined;

export async function authenticateCredentials(input: unknown) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return null;

  const user = await getDb().user.findUnique({ where: { email: parsed.data.email } });
  // E-mails desconhecidos também passam pela verificação de hash.
  const passwordHash = user?.passwordHash ?? await (dummyHash ??= hashPassword(randomBytes(32).toString("hex")));
  const valid = await verifyPassword(passwordHash, parsed.data.password);
  if (!user || !valid) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

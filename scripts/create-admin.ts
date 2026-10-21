import "dotenv/config";
import { ZodError } from "zod";
import { Prisma } from "../src/generated/prisma/client";
import { bootstrapAdmin } from "../src/server/auth/bootstrap";
import { disconnectDb } from "../src/server/db/client";
import { AppError } from "../src/server/errors";

try {
  await bootstrapAdmin({
    name: process.env.BOOTSTRAP_ADMIN_NAME,
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  });
  console.log("Administrador inicial criado. Remova as variáveis BOOTSTRAP_ADMIN_* do .env.");
} catch (error) {
  if (error instanceof ZodError) console.error("Configure BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_ADMIN_PASSWORD com dados válidos (senha de 12 a 128 caracteres).");
  else if (error instanceof AppError) console.error(error.message);
  else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") console.error("E-mail já cadastrado. O bootstrap não altera usuários existentes.");
  else console.error("Não foi possível criar o administrador. Confira DATABASE_URL e as migrações.");
  process.exitCode = 1;
} finally {
  await disconnectDb();
}

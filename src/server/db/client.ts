import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalDb = globalThis as unknown as { exchangeDeskDb?: PrismaClient };

export function getDb(): PrismaClient {
  if (globalDb.exchangeDeskDb) return globalDb.exchangeDeskDb;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Configure DATABASE_URL antes de acessar o banco.");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  globalDb.exchangeDeskDb = db;
  return db;
}

export async function disconnectDb() {
  await globalDb.exchangeDeskDb?.$disconnect();
  globalDb.exchangeDeskDb = undefined;
}

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test")) throw new Error("Use um banco descartável terminado em _test.");

it("migra o administrador preservando vínculos e recusa operadores sem atribuição sem alterar dados", async () => {
  const client = new pg.Client({ connectionString: url });
  const schema = `roles_test_${randomUUID().replaceAll("-", "")}`;
  const migration = await readFile("prisma/migrations/20261031210000_v1_1_roles/migration.sql", "utf8");
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(`
      CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');
      CREATE TABLE "User" (id text PRIMARY KEY, role "Role" NOT NULL DEFAULT 'OPERATOR');
      CREATE TABLE "Authorship" ("userId" text REFERENCES "User"(id));
      INSERT INTO "User" VALUES ('admin', 'ADMIN'), ('legacy', 'OPERATOR');
      INSERT INTO "Authorship" VALUES ('admin');
    `);
    await expect(client.query(migration)).rejects.toThrow("Existem contas OPERATOR");
    await client.query("ROLLBACK");
    expect((await client.query('SELECT role FROM "User" WHERE id = $1', ["legacy"])).rows).toEqual([{ role: "OPERATOR" }]);
    // Apenas dados fictícios deste schema isolado; a migração não atribui perfis.
    await client.query('DELETE FROM "User" WHERE id = $1', ["legacy"]);
    await client.query(migration);
    expect((await client.query('SELECT id, role FROM "User"')).rows).toEqual([{ id: "admin", role: "ADMIN" }]);
    expect((await client.query('SELECT "userId" FROM "Authorship"')).rows).toEqual([{ userId: "admin" }]);
    await client.query('INSERT INTO "User" (id) VALUES ($1)', ["new"]);
    expect((await client.query('SELECT role FROM "User" WHERE id = $1', ["new"])).rows).toEqual([{ role: "CONSULTANT" }]);
    expect((await client.query("SELECT enum_range(NULL::\"Role\")::text AS roles")).rows[0].roles).toBe("{ADMIN,CONSULTANT,OPERATIONS_ANALYST,MANAGER}");
  } finally {
    await client.query("ROLLBACK");
    await client.query("SET search_path TO public");
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  }
});

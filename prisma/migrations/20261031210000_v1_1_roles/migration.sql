BEGIN;

-- A atribuição de contas legadas deve ser explícita. Não converter operadores
-- automaticamente nem perder a identidade usada em operações e auditoria.
LOCK TABLE "User" IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "User" WHERE "role"::text = 'OPERATOR') THEN
    RAISE EXCEPTION 'Existem contas OPERATOR. Defina a atribuição dos perfis antes de aplicar a V1.1.';
  END IF;
END $$;

CREATE TYPE "Role_v1_1" AS ENUM ('ADMIN', 'CONSULTANT', 'OPERATIONS_ANALYST', 'MANAGER');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_v1_1" USING ("role"::text::"Role_v1_1");
ALTER TYPE "Role" RENAME TO "Role_v1";
ALTER TYPE "Role_v1_1" RENAME TO "Role";
DROP TYPE "Role_v1";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CONSULTANT';

COMMIT;

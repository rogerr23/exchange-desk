ALTER TABLE "User"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "accessRevision" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "EmployeeAccessEvent" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "previousRole" "Role" NOT NULL,
  "newRole" "Role" NOT NULL,
  "previousIsActive" BOOLEAN NOT NULL,
  "newIsActive" BOOLEAN NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeAccessEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmployeeAccessEvent_employeeId_revision_key" ON "EmployeeAccessEvent"("employeeId", "revision");
CREATE INDEX "EmployeeAccessEvent_actorId_idx" ON "EmployeeAccessEvent"("actorId");
ALTER TABLE "EmployeeAccessEvent" ADD CONSTRAINT "EmployeeAccessEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeAccessEvent" ADD CONSTRAINT "EmployeeAccessEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

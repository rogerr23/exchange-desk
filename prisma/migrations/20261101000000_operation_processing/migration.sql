ALTER TYPE "OperationStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "OperationStatus" ADD VALUE 'FAILED';
CREATE TYPE "ProcessingScenario" AS ENUM ('SUCCESS', 'FAILURE');
ALTER TABLE "ExchangeOperation" ADD COLUMN "processingAttemptCount" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "OperationProcessingAttempt" (
  "id" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "scenario" "ProcessingScenario" NOT NULL,
  "startedById" TEXT NOT NULL,
  "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readyAt" TIMESTAMPTZ(3) NOT NULL,
  "finishedAt" TIMESTAMPTZ(3),
  "failureReason" VARCHAR(255),
  CONSTRAINT "OperationProcessingAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OperationProcessingAttempt_number_check" CHECK ("number" > 0)
);
CREATE UNIQUE INDEX "OperationProcessingAttempt_operationId_number_key" ON "OperationProcessingAttempt"("operationId", "number");
CREATE INDEX "OperationProcessingAttempt_startedById_idx" ON "OperationProcessingAttempt"("startedById");
ALTER TABLE "OperationProcessingAttempt" ADD CONSTRAINT "OperationProcessingAttempt_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "ExchangeOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationProcessingAttempt" ADD CONSTRAINT "OperationProcessingAttempt_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

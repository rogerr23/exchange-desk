-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('BRL', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "QuoteTimestampKind" AS ENUM ('PROVIDER', 'FETCHED_AT');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'STATUS_CHANGED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "fictionalCpf" VARCHAR(11) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(11) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeOperation" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "sourceCurrency" "Currency" NOT NULL,
    "targetCurrency" "Currency" NOT NULL,
    "sourceAmount" DECIMAL(18,2) NOT NULL,
    "targetAmount" DECIMAL(18,2) NOT NULL,
    "exchangeRate" DECIMAL(18,8) NOT NULL,
    "quoteProvider" VARCHAR(100) NOT NULL,
    "quoteReferenceDate" DATE,
    "quoteTimestamp" TIMESTAMPTZ(3) NOT NULL,
    "quoteTimestampKind" "QuoteTimestampKind" NOT NULL,
    "quoteFetchedAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "OperationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ExchangeOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationAuditEvent" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "AuditAction" NOT NULL,
    "previousStatus" "OperationStatus",
    "newStatus" "OperationStatus" NOT NULL,

    CONSTRAINT "OperationAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_fictionalCpf_key" ON "Customer"("fictionalCpf");

-- CreateIndex
CREATE INDEX "ExchangeOperation_createdAt_idx" ON "ExchangeOperation"("createdAt");

-- CreateIndex
CREATE INDEX "ExchangeOperation_status_createdAt_idx" ON "ExchangeOperation"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ExchangeOperation_customerId_idx" ON "ExchangeOperation"("customerId");

-- CreateIndex
CREATE INDEX "ExchangeOperation_createdById_idx" ON "ExchangeOperation"("createdById");

-- CreateIndex
CREATE INDEX "OperationAuditEvent_operationId_occurredAt_id_idx" ON "OperationAuditEvent"("operationId", "occurredAt", "id");

-- CreateIndex
CREATE INDEX "OperationAuditEvent_actorId_idx" ON "OperationAuditEvent"("actorId");

-- AddForeignKey
ALTER TABLE "ExchangeOperation" ADD CONSTRAINT "ExchangeOperation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeOperation" ADD CONSTRAINT "ExchangeOperation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationAuditEvent" ADD CONSTRAINT "OperationAuditEvent_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "ExchangeOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationAuditEvent" ADD CONSTRAINT "OperationAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Regras que o Prisma Schema não representa diretamente.
ALTER TABLE "ExchangeOperation"
  ADD CONSTRAINT "ExchangeOperation_positive_amounts"
    CHECK ("sourceAmount" > 0 AND "targetAmount" > 0 AND "exchangeRate" > 0),
  ADD CONSTRAINT "ExchangeOperation_different_currencies"
    CHECK ("sourceCurrency" <> "targetCurrency");

ALTER TABLE "OperationAuditEvent"
  ADD CONSTRAINT "OperationAuditEvent_action_shape"
    CHECK (
      ("action" = 'CREATED' AND "previousStatus" IS NULL AND "newStatus" = 'PENDING')
      OR
      ("action" = 'STATUS_CHANGED' AND "previousStatus" IS NOT NULL AND "previousStatus" <> "newStatus")
    );

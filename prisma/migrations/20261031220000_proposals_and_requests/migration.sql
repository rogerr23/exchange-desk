BEGIN;

-- CreateEnum
CREATE TYPE "ProposalAuditAction" AS ENUM ('CREATED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING_REVIEW');

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "confirmationKey" VARCHAR(64) NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "sourceCurrency" "Currency" NOT NULL,
    "targetCurrency" "Currency" NOT NULL,
    "sourceAmount" DECIMAL(18,2) NOT NULL,
    "targetAmount" DECIMAL(18,2) NOT NULL,
    "exchangeRate" DECIMAL(18,8) NOT NULL,
    "quoteProvider" VARCHAR(100) NOT NULL,
    "quoteReferenceDate" DATE NOT NULL,
    "quoteTimestamp" TIMESTAMPTZ(3) NOT NULL,
    "quoteTimestampKind" "QuoteTimestampKind" NOT NULL,
    "quoteFetchedAt" TIMESTAMPTZ(3) NOT NULL,
    "issuedAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRequest" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalAuditEvent" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "ProposalAuditAction" NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_confirmationKey_key" ON "Proposal"("confirmationKey");

-- CreateIndex
CREATE INDEX "Proposal_createdById_createdAt_idx" ON "Proposal"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "Proposal_customerId_idx" ON "Proposal"("customerId");

-- CreateIndex
CREATE INDEX "Proposal_createdAt_idx" ON "Proposal"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRequest_proposalId_key" ON "ExchangeRequest"("proposalId");

-- CreateIndex
CREATE INDEX "ExchangeRequest_createdById_createdAt_idx" ON "ExchangeRequest"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "ExchangeRequest_status_createdAt_idx" ON "ExchangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProposalAuditEvent_proposalId_occurredAt_id_idx" ON "ProposalAuditEvent"("proposalId", "occurredAt", "id");

-- CreateIndex
CREATE INDEX "ProposalAuditEvent_actorId_idx" ON "ProposalAuditEvent"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalAuditEvent_proposalId_action_key" ON "ProposalAuditEvent"("proposalId", "action");

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRequest" ADD CONSTRAINT "ExchangeRequest_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRequest" ADD CONSTRAINT "ExchangeRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalAuditEvent" ADD CONSTRAINT "ProposalAuditEvent_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalAuditEvent" ADD CONSTRAINT "ProposalAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preservar precisão e o prazo original da simulação.
ALTER TABLE "Proposal"
  ADD CONSTRAINT "Proposal_positive_amounts" CHECK ("sourceAmount" > 0 AND "targetAmount" > 0 AND "exchangeRate" > 0),
  ADD CONSTRAINT "Proposal_different_currencies" CHECK ("sourceCurrency" <> "targetCurrency"),
  ADD CONSTRAINT "Proposal_original_validity" CHECK ("expiresAt" = "issuedAt" + interval '15 minutes'),
  ADD CONSTRAINT "Proposal_acceptance_within_validity" CHECK ("acceptedAt" IS NULL OR ("acceptedAt" >= "issuedAt" AND "acceptedAt" < "expiresAt"));

COMMIT;

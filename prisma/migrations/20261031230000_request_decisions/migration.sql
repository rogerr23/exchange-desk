ALTER TYPE "RequestStatus" ADD VALUE 'APPROVED';
ALTER TYPE "RequestStatus" ADD VALUE 'REJECTED';
ALTER TYPE "ProposalAuditAction" ADD VALUE 'APPROVED';
ALTER TYPE "ProposalAuditAction" ADD VALUE 'REJECTED';

ALTER TABLE "ExchangeRequest"
  ADD COLUMN "operationId" TEXT,
  ADD COLUMN "decidedById" TEXT,
  ADD COLUMN "decidedAt" TIMESTAMPTZ(3),
  ADD COLUMN "rejectionReason" VARCHAR(1000);
CREATE UNIQUE INDEX "ExchangeRequest_operationId_key" ON "ExchangeRequest"("operationId");
ALTER TABLE "ExchangeRequest" ADD CONSTRAINT "ExchangeRequest_operationId_fkey"
  FOREIGN KEY ("operationId") REFERENCES "ExchangeOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExchangeRequest" ADD CONSTRAINT "ExchangeRequest_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

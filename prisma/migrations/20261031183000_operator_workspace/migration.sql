-- CreateTable
CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL,
    "confirmationKey" VARCHAR(64) NOT NULL,
    "createdById" TEXT NOT NULL,
    "sourceCurrency" "Currency" NOT NULL,
    "targetCurrency" "Currency" NOT NULL,
    "sourceAmount" DECIMAL(18,2) NOT NULL,
    "targetAmount" DECIMAL(18,2) NOT NULL,
    "exchangeRate" DECIMAL(18,8) NOT NULL,
    "quoteProvider" VARCHAR(100) NOT NULL,
    "quoteReferenceDate" DATE NOT NULL,
    "quoteFetchedAt" TIMESTAMPTZ(3) NOT NULL,
    "issuedAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Simulation_confirmationKey_key" ON "Simulation"("confirmationKey");

-- CreateIndex
CREATE INDEX "Simulation_createdById_issuedAt_idx" ON "Simulation"("createdById", "issuedAt");

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


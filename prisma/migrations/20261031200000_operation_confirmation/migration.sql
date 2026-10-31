-- Nullable para preservar eventuais operações anteriores à confirmação idempotente.
ALTER TABLE "ExchangeOperation" ADD COLUMN "confirmationKey" VARCHAR(64);
CREATE UNIQUE INDEX "ExchangeOperation_confirmationKey_key" ON "ExchangeOperation"("confirmationKey");

-- Payroll Phase 32: statutory liability ledger mappings
ALTER TABLE "AccountingSettings" ADD COLUMN "epfPayableAccountId" TEXT;
ALTER TABLE "AccountingSettings" ADD COLUMN "esiPayableAccountId" TEXT;
ALTER TABLE "AccountingSettings" ADD COLUMN "professionalTaxPayableAccountId" TEXT;
ALTER TABLE "AccountingSettings" ADD COLUMN "tdsPayableAccountId" TEXT;

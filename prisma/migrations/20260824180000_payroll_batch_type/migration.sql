-- Payroll Phase 20: pay run types (REGULAR/OFF_CYCLE/TERMINATION/BULK_TERMINATION)
ALTER TABLE "PayrollBatch" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'REGULAR';

DROP INDEX "PayrollBatch_orgId_month_key";
CREATE UNIQUE INDEX "PayrollBatch_orgId_month_type_key" ON "PayrollBatch"("orgId", "month", "type");

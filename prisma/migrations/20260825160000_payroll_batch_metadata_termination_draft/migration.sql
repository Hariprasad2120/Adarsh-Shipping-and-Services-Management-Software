-- Payroll Phase 34 (Zoho pay-run parity): per-employee display metadata for
-- OFF_CYCLE / TERMINATION / BULK_TERMINATION batches, and a pre-finalize
-- draft table for the termination "Edit" screen.
ALTER TABLE "PayrollBatch" ADD COLUMN "metadata" JSONB;

CREATE TABLE "TerminationPayrollDraft" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "payDate" DATE,
    "notes" TEXT,
    "entries" JSONB NOT NULL,
    "batchId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TerminationPayrollDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TerminationPayrollDraft_orgId_idx" ON "TerminationPayrollDraft"("orgId");
CREATE INDEX "TerminationPayrollDraft_batchId_idx" ON "TerminationPayrollDraft"("batchId");

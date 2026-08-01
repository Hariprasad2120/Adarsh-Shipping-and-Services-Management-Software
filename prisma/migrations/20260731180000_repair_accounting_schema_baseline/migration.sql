-- Repair the two non-destructive effects that are missing from the database
-- even though the rest of 20260729235900_reconcile_committed_schema_history
-- is already present. Both statements are idempotent because this migration
-- is also used to establish a safe baseline before Prisma migration history is
-- reconciled.

ALTER TABLE "ChaExpenseRequest"
  ALTER COLUMN "status" SET DEFAULT 'UNDER_REVIEW';

ALTER TABLE "HRLetterRequest"
  ADD COLUMN IF NOT EXISTS "fileKey" TEXT;

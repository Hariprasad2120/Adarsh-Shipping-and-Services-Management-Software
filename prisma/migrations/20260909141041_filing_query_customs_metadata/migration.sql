-- Per-query customs metadata for FilingWorkflowQuery (previously kept only on
-- the section toggle stateJson for a single "latest" query). Additive + nullable.
ALTER TABLE "FilingWorkflowQuery"
  ADD COLUMN IF NOT EXISTS "referenceNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "officerName" TEXT,
  ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "responseDueAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "responseText" TEXT,
  ADD COLUMN IF NOT EXISTS "respondedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "respondedById" TEXT;

CREATE INDEX IF NOT EXISTS "FilingWorkflowQuery_responseDueAt_idx"
  ON "FilingWorkflowQuery" ("responseDueAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'FilingWorkflowQuery_respondedById_fkey'
  ) THEN
    ALTER TABLE "FilingWorkflowQuery"
      ADD CONSTRAINT "FilingWorkflowQuery_respondedById_fkey"
      FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

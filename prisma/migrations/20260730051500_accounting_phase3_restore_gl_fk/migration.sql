-- A legacy integration test used to drop this constraint at runtime. Restore it
-- idempotently after removing that unsafe test behavior.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'GLEntry_JournalEntry_FK'
      AND conrelid = '"GeneralLedgerEntry"'::regclass
  ) THEN
    ALTER TABLE "GeneralLedgerEntry"
      ADD CONSTRAINT "GLEntry_JournalEntry_FK"
      FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

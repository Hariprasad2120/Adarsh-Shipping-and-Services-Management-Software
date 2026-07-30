-- The historical clean chain already contains this FK, while an old staging
-- regression test used to drop it at runtime. Normalize both starting states
-- before the forward-only schema-alignment migration recreates the constraint.
ALTER TABLE "GeneralLedgerEntry"
  DROP CONSTRAINT IF EXISTS "GLEntry_JournalEntry_FK";

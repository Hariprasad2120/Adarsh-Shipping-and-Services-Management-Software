-- Align the newly created Phase 9 capability policy date types and canonical
-- foreign-key names with prisma/schema.prisma. The capability-policy table was
-- verified empty before this migration was created. No records are changed,
-- inserted, or deleted.

ALTER TABLE "AccountingCapabilityPolicy"
  ALTER COLUMN "effectiveFrom" SET DATA TYPE DATE,
  ALTER COLUMN "effectiveTo" SET DATA TYPE DATE;

ALTER TABLE "AccountingCapabilityPolicy"
  RENAME CONSTRAINT "AccountingCapabilityPolicy_org_fkey"
  TO "AccountingCapabilityPolicy_orgId_fkey";

ALTER TABLE "AccountingMigrationAttachment"
  RENAME CONSTRAINT "AccountingMigrationAttachment_record_fkey"
  TO "AccountingMigrationAttachment_recordId_fkey";

ALTER TABLE "AccountingMigrationCheckpoint"
  RENAME CONSTRAINT "AccountingMigrationCheckpoint_batch_fkey"
  TO "AccountingMigrationCheckpoint_batchId_fkey";

ALTER TABLE "AccountingMigrationException"
  RENAME CONSTRAINT "AccountingMigrationException_batch_fkey"
  TO "AccountingMigrationException_batchId_fkey";

ALTER TABLE "AccountingMigrationException"
  RENAME CONSTRAINT "AccountingMigrationException_record_fkey"
  TO "AccountingMigrationException_recordId_fkey";

ALTER TABLE "AccountingMigrationRecord"
  RENAME CONSTRAINT "AccountingMigrationRecord_batch_fkey"
  TO "AccountingMigrationRecord_batchId_fkey";

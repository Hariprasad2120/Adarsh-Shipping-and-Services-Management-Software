-- Phase 6 controlled migration metadata only.
-- This migration does not migrate financial data and creates no journal or ledger effects.

CREATE TYPE "AccountingMigrationBatchStatus" AS ENUM (
  'RECEIVED',
  'VALIDATING',
  'DRY_RUN_READY',
  'EXECUTING',
  'RECONCILING',
  'COMPLETED',
  'FAILED',
  'QUARANTINED'
);

CREATE TYPE "AccountingMigrationRecordStatus" AS ENUM (
  'PENDING',
  'VALID',
  'INVALID',
  'BLOCKED',
  'READY',
  'EXECUTING',
  'SUCCEEDED',
  'SKIPPED',
  'FAILED',
  'MANUAL_REVIEW'
);

CREATE TABLE "AccountingMigrationBatch" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT,
  "contractVersion" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "sourceBatchIdentifier" TEXT NOT NULL,
  "sourceManifestHash" TEXT NOT NULL,
  "targetEnvironment" TEXT NOT NULL DEFAULT 'SYNTHETIC_STAGING',
  "mode" TEXT NOT NULL DEFAULT 'DRY_RUN',
  "status" "AccountingMigrationBatchStatus" NOT NULL DEFAULT 'RECEIVED',
  "actorId" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "concurrency" INTEGER NOT NULL DEFAULT 1,
  "executeAuthorized" BOOLEAN NOT NULL DEFAULT false,
  "productionBlocked" BOOLEAN NOT NULL DEFAULT true,
  "checkpointStage" TEXT NOT NULL DEFAULT 'INGEST',
  "sourceSummary" JSONB NOT NULL,
  "policySnapshot" JSONB,
  "reconciliation" JSONB,
  "certification" JSONB,
  "quarantineReasonCode" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingMigrationBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingMigrationBatch_guard_check" CHECK (
    "productionBlocked" = true
    AND "targetEnvironment" = 'SYNTHETIC_STAGING'
    AND "mode" IN ('DRY_RUN', 'EXECUTE')
    AND "concurrency" BETWEEN 1 AND 8
  )
);

CREATE TABLE "AccountingMigrationRecord" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "sourceRecordType" TEXT NOT NULL,
  "sourceIdentifier" TEXT NOT NULL,
  "sourceVersion" TEXT NOT NULL,
  "deterministicKey" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "normalizedPayload" JSONB NOT NULL,
  "dependencyKeys" JSONB NOT NULL,
  "status" "AccountingMigrationRecordStatus" NOT NULL DEFAULT 'PENDING',
  "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "reconciliationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "canonicalTargetType" TEXT,
  "canonicalTargetIdentifier" TEXT,
  "errorClassification" TEXT,
  "errorCode" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "migratedAt" TIMESTAMP(3),
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingMigrationRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingMigrationMapping" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT,
  "sourceSystem" TEXT NOT NULL,
  "mappingType" TEXT NOT NULL,
  "sourceValue" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "configurationHash" TEXT NOT NULL,
  "decisionReference" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "disabledAt" TIMESTAMP(3),
  "disabledReasonCode" TEXT,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingMigrationMapping_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingMigrationMapping_version_check" CHECK ("version" > 0),
  CONSTRAINT "AccountingMigrationMapping_status_check" CHECK (
    "status" IN ('DRAFT', 'APPROVED', 'DISABLED')
  )
);

CREATE TABLE "AccountingMigrationCheckpoint" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "lastRecordKey" TEXT,
  "processedCount" INTEGER NOT NULL DEFAULT 0,
  "successCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "blockedCount" INTEGER NOT NULL DEFAULT 0,
  "stateHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountingMigrationCheckpoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingMigrationException" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "recordId" TEXT,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT,
  "stage" TEXT NOT NULL,
  "errorClassification" TEXT NOT NULL,
  "errorCode" TEXT NOT NULL,
  "safeMessage" TEXT NOT NULL,
  "retryable" BOOLEAN NOT NULL DEFAULT false,
  "manualReview" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "resolutionCode" TEXT,
  "resolutionReason" TEXT,
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingMigrationException_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingMigrationException_status_check" CHECK (
    "status" IN ('OPEN', 'RETRY_REQUESTED', 'RESOLVED', 'SKIPPED')
  )
);

CREATE TABLE "AccountingMigrationAttachment" (
  "id" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "sourceIdentifier" TEXT NOT NULL,
  "relativePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "scanStatus" TEXT NOT NULL DEFAULT 'SCAN_REQUIRED',
  "migrationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "canonicalAttachmentId" TEXT,
  "failureCode" TEXT,
  "migratedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingMigrationAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingMigrationAttachment_size_check" CHECK (
    "sizeBytes" > 0 AND "sizeBytes" <= 26214400
  )
);

CREATE UNIQUE INDEX "AccountingMigrationBatch_source_key"
  ON "AccountingMigrationBatch"("orgId", "sourceSystem", "sourceBatchIdentifier", "sourceManifestHash");
CREATE UNIQUE INDEX "AccountingMigrationBatch_correlation_key"
  ON "AccountingMigrationBatch"("orgId", "correlationId");
CREATE INDEX "AccountingMigrationBatch_scope_state_idx"
  ON "AccountingMigrationBatch"("orgId", "legalEntityId", "status", "createdAt");

CREATE UNIQUE INDEX "AccountingMigrationRecord_batch_key"
  ON "AccountingMigrationRecord"("batchId", "deterministicKey");
CREATE INDEX "AccountingMigrationRecord_scope_state_idx"
  ON "AccountingMigrationRecord"("orgId", "legalEntityId", "status", "sourceRecordType");
CREATE INDEX "AccountingMigrationRecord_source_idx"
  ON "AccountingMigrationRecord"("orgId", "sourceSystem", "sourceRecordType", "sourceIdentifier", "sourceVersion");

CREATE UNIQUE INDEX "AccountingMigrationMapping_scope_version_key"
  ON "AccountingMigrationMapping"("orgId", "scopeKey", "version");
CREATE UNIQUE INDEX "AccountingMigrationMapping_one_approved_key"
  ON "AccountingMigrationMapping"("orgId", "scopeKey")
  WHERE "status" = 'APPROVED';
CREATE INDEX "AccountingMigrationMapping_active_idx"
  ON "AccountingMigrationMapping"("orgId", "legalEntityId", "sourceSystem", "mappingType", "status");

CREATE UNIQUE INDEX "AccountingMigrationCheckpoint_stage_key"
  ON "AccountingMigrationCheckpoint"("batchId", "stage", "sequence");
CREATE INDEX "AccountingMigrationCheckpoint_batch_idx"
  ON "AccountingMigrationCheckpoint"("batchId", "createdAt");

CREATE INDEX "AccountingMigrationException_scope_state_idx"
  ON "AccountingMigrationException"("orgId", "legalEntityId", "status", "errorClassification");
CREATE INDEX "AccountingMigrationException_record_idx"
  ON "AccountingMigrationException"("batchId", "recordId");

CREATE UNIQUE INDEX "AccountingMigrationAttachment_identity_key"
  ON "AccountingMigrationAttachment"("orgId", "legalEntityId", "sourceIdentifier", "sha256");
CREATE INDEX "AccountingMigrationAttachment_record_state_idx"
  ON "AccountingMigrationAttachment"("recordId", "migrationStatus");

ALTER TABLE "AccountingMigrationRecord"
  ADD CONSTRAINT "AccountingMigrationRecord_batch_fkey"
  FOREIGN KEY ("batchId") REFERENCES "AccountingMigrationBatch"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingMigrationCheckpoint"
  ADD CONSTRAINT "AccountingMigrationCheckpoint_batch_fkey"
  FOREIGN KEY ("batchId") REFERENCES "AccountingMigrationBatch"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingMigrationException"
  ADD CONSTRAINT "AccountingMigrationException_batch_fkey"
  FOREIGN KEY ("batchId") REFERENCES "AccountingMigrationBatch"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingMigrationException"
  ADD CONSTRAINT "AccountingMigrationException_record_fkey"
  FOREIGN KEY ("recordId") REFERENCES "AccountingMigrationRecord"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingMigrationAttachment"
  ADD CONSTRAINT "AccountingMigrationAttachment_record_fkey"
  FOREIGN KEY ("recordId") REFERENCES "AccountingMigrationRecord"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "accounting_migration_scope_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  batch_org TEXT;
  batch_entity TEXT;
BEGIN
  SELECT "orgId", "legalEntityId"
    INTO batch_org, batch_entity
  FROM "AccountingMigrationBatch"
  WHERE id = NEW."batchId";

  IF batch_org IS NULL
    OR batch_org <> NEW."orgId"
    OR (batch_entity IS NOT NULL AND batch_entity <> NEW."legalEntityId")
  THEN
    RAISE EXCEPTION 'ACCOUNTING_MIGRATION_SCOPE_MISMATCH';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "AccountingMigrationRecord_scope_guard"
BEFORE INSERT OR UPDATE ON "AccountingMigrationRecord"
FOR EACH ROW EXECUTE FUNCTION "accounting_migration_scope_guard"();

CREATE OR REPLACE FUNCTION "accounting_migration_immutable_success_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IN ('SUCCEEDED', 'SKIPPED')
    AND (
      NEW."deterministicKey" <> OLD."deterministicKey"
      OR NEW."payloadHash" <> OLD."payloadHash"
      OR NEW."normalizedPayload" <> OLD."normalizedPayload"
      OR NEW."sourceIdentifier" <> OLD."sourceIdentifier"
      OR NEW."sourceVersion" <> OLD."sourceVersion"
      OR NEW."canonicalTargetIdentifier" IS DISTINCT FROM OLD."canonicalTargetIdentifier"
    )
  THEN
    RAISE EXCEPTION 'ACCOUNTING_MIGRATION_SUCCESS_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "AccountingMigrationRecord_immutable_success_guard"
BEFORE UPDATE ON "AccountingMigrationRecord"
FOR EACH ROW EXECUTE FUNCTION "accounting_migration_immutable_success_guard"();

CREATE OR REPLACE FUNCTION "accounting_migration_completion_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND (
    NEW.certification IS NULL
    OR EXISTS (
      SELECT 1
      FROM "AccountingMigrationRecord"
      WHERE "batchId" = NEW.id
        AND status NOT IN ('SUCCEEDED', 'SKIPPED')
    )
  )
  THEN
    RAISE EXCEPTION 'ACCOUNTING_MIGRATION_COMPLETION_NOT_CERTIFIED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "AccountingMigrationBatch_completion_guard"
BEFORE UPDATE ON "AccountingMigrationBatch"
FOR EACH ROW EXECUTE FUNCTION "accounting_migration_completion_guard"();

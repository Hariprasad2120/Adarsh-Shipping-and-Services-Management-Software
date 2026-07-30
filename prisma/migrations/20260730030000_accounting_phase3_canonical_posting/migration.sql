-- Phase 3 canonical Accounting posting boundary.
-- Expand-only: no legacy column, table, enum value, or behavior is removed.

ALTER TYPE "AccountingIntegrationMessageStatus" ADD VALUE IF NOT EXISTS 'RECEIVED';
ALTER TYPE "AccountingIntegrationMessageStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "AccountingIntegrationMessageStatus" ADD VALUE IF NOT EXISTS 'RETRYABLE';
ALTER TYPE "AccountingIntegrationMessageStatus" ADD VALUE IF NOT EXISTS 'MANUAL_REVIEW';

CREATE TYPE "AccountingPostingAttemptStatus" AS ENUM (
  'PROCESSING',
  'POSTED',
  'REJECTED',
  'RETRYABLE',
  'FAILED'
);

ALTER TABLE "AccountingOrganisationProfile"
  ADD COLUMN "correctionPolicy" JSONB,
  ADD COLUMN "correctionPolicyVersion" INTEGER;

ALTER TABLE "AccountingIntegrationInbox"
  ADD COLUMN "legalEntityId" TEXT,
  ADD COLUMN "requestId" TEXT,
  ADD COLUMN "sourceSnapshotId" TEXT,
  ADD COLUMN "correlationId" TEXT,
  ADD COLUMN "causationId" TEXT,
  ADD COLUMN "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "processingAt" TIMESTAMP(3),
  ADD COLUMN "processedRecordType" TEXT,
  ADD COLUMN "processedRecordId" TEXT,
  ADD COLUMN "retryClassification" TEXT,
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "manualReviewAt" TIMESTAMP(3),
  ADD COLUMN "rowVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "AccountingIntegrationInbox"
  ALTER COLUMN "status" SET DEFAULT 'RECEIVED';

ALTER TABLE "AccountingIntegrationOutbox"
  ADD COLUMN "correlationId" TEXT,
  ADD COLUMN "causationId" TEXT,
  ADD COLUMN "payloadHash" TEXT;

ALTER TABLE "JournalEntry"
  ADD COLUMN "legalEntityId" TEXT,
  ADD COLUMN "journalType" TEXT,
  ADD COLUMN "documentDate" DATE,
  ADD COLUMN "requestId" TEXT,
  ADD COLUMN "sourceSnapshotId" TEXT,
  ADD COLUMN "transactionCurrencyCode" VARCHAR(3),
  ADD COLUMN "baseCurrencyCode" VARCHAR(3),
  ADD COLUMN "exchangeRateSource" TEXT,
  ADD COLUMN "exchangeRateEffectiveDate" DATE,
  ADD COLUMN "accountingApprovalPolicyId" TEXT,
  ADD COLUMN "approvalPolicyVersion" INTEGER,
  ADD COLUMN "approvedById" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "numberSeriesId" TEXT,
  ADD COLUMN "roundingPolicyId" TEXT,
  ADD COLUMN "roundingPolicyVersion" INTEGER,
  ADD COLUMN "supportingDocumentRefs" JSONB,
  ADD COLUMN "correlationId" TEXT,
  ADD COLUMN "causationId" TEXT,
  ADD COLUMN "replacementOfId" TEXT,
  ADD COLUMN "reversalReason" TEXT,
  ADD COLUMN "originalEffectiveDate" DATE;

ALTER TABLE "PayrollBatch"
  ADD COLUMN "sourceSnapshotId" TEXT,
  ADD COLUMN "sourceRunId" TEXT,
  ADD COLUMN "sourceRunVersion" INTEGER;

CREATE TABLE "AccountingRoundingPolicy" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "purpose" TEXT NOT NULL,
  "currencyCode" VARCHAR(3),
  "scale" INTEGER NOT NULL,
  "roundingMode" "AccountingRoundingMode" NOT NULL DEFAULT 'HALF_UP',
  "statutoryValidated" BOOLEAN NOT NULL DEFAULT false,
  "configuration" JSONB,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingRoundingPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingRoundingPolicy_scale_check" CHECK ("scale" BETWEEN 0 AND 18),
  CONSTRAINT "AccountingRoundingPolicy_dates_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom")
);

CREATE TABLE "AccountingSourceSnapshot" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceVersion" INTEGER NOT NULL,
  "requestId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountingSourceSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingSourceSnapshot_sourceVersion_check" CHECK ("sourceVersion" > 0),
  CONSTRAINT "AccountingSourceSnapshot_payloadHash_check" CHECK (length("payloadHash") = 64)
);

CREATE TABLE "AccountingPostingAttempt" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "inboxId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "status" "AccountingPostingAttemptStatus" NOT NULL,
  "journalEntryId" TEXT,
  "actorId" TEXT NOT NULL,
  "errorCode" TEXT,
  "errorClassification" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AccountingPostingAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingPostingAttempt_attemptNumber_check" CHECK ("attemptNumber" > 0)
);

CREATE TABLE "AccountingPayrollRunSnapshot" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "sourceSnapshotId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "runVersion" INTEGER NOT NULL,
  "payPeriodStart" DATE NOT NULL,
  "payPeriodEnd" DATE NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "totalDebit" DECIMAL(20,4) NOT NULL,
  "totalCredit" DECIMAL(20,4) NOT NULL,
  "allocationDetail" JSONB NOT NULL,
  "approvedById" TEXT NOT NULL,
  "approvedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountingPayrollRunSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingPayrollRunSnapshot_runVersion_check" CHECK ("runVersion" > 0),
  CONSTRAINT "AccountingPayrollRunSnapshot_period_check" CHECK ("payPeriodEnd" >= "payPeriodStart"),
  CONSTRAINT "AccountingPayrollRunSnapshot_balance_check" CHECK ("totalDebit" = "totalCredit" AND "totalDebit" > 0)
);

CREATE UNIQUE INDEX "AccountingRoundingPolicy_orgId_code_version_key"
  ON "AccountingRoundingPolicy"("orgId", "code", "version");
CREATE INDEX "AccountingRoundingPolicy_orgId_purpose_currencyCode_isActive_idx"
  ON "AccountingRoundingPolicy"("orgId", "purpose", "currencyCode", "isActive");

CREATE UNIQUE INDEX "AccountingSourceSnapshot_org_source_key"
  ON "AccountingSourceSnapshot"("orgId", "sourceSystem", "sourceType", "sourceId", "sourceVersion");
CREATE UNIQUE INDEX "AccountingSourceSnapshot_org_request_key"
  ON "AccountingSourceSnapshot"("orgId", "sourceSystem", "requestId");
CREATE INDEX "AccountingSourceSnapshot_org_entity_occurred_idx"
  ON "AccountingSourceSnapshot"("orgId", "legalEntityId", "occurredAt");

CREATE UNIQUE INDEX "AccountingPostingAttempt_inbox_attempt_key"
  ON "AccountingPostingAttempt"("inboxId", "attemptNumber");
CREATE INDEX "AccountingPostingAttempt_org_status_started_idx"
  ON "AccountingPostingAttempt"("orgId", "status", "startedAt");
CREATE INDEX "AccountingPostingAttempt_journalEntryId_idx"
  ON "AccountingPostingAttempt"("journalEntryId");

CREATE UNIQUE INDEX "AccountingPayrollRunSnapshot_sourceSnapshotId_key"
  ON "AccountingPayrollRunSnapshot"("sourceSnapshotId");
CREATE UNIQUE INDEX "AccountingPayrollRunSnapshot_org_run_key"
  ON "AccountingPayrollRunSnapshot"("orgId", "runId", "runVersion");
CREATE INDEX "AccountingPayrollRunSnapshot_org_period_idx"
  ON "AccountingPayrollRunSnapshot"("orgId", "payPeriodStart", "payPeriodEnd");

CREATE UNIQUE INDEX "AccountingIntegrationInbox_org_source_request_key"
  ON "AccountingIntegrationInbox"("orgId", "sourceSystem", "requestId");
CREATE INDEX "AccountingIntegrationInbox_sourceSnapshotId_idx"
  ON "AccountingIntegrationInbox"("sourceSnapshotId");

CREATE UNIQUE INDEX "JournalEntry_orgId_requestId_key"
  ON "JournalEntry"("orgId", "requestId");
CREATE INDEX "JournalEntry_replacementOfId_idx" ON "JournalEntry"("replacementOfId");
CREATE INDEX "JournalEntry_sourceSnapshotId_idx" ON "JournalEntry"("sourceSnapshotId");
CREATE INDEX "JournalEntry_legalEntityId_postingDate_idx" ON "JournalEntry"("legalEntityId", "postingDate");

CREATE UNIQUE INDEX "PayrollBatch_org_source_run_key"
  ON "PayrollBatch"("orgId", "sourceRunId", "sourceRunVersion");
CREATE INDEX "PayrollBatch_sourceSnapshotId_idx" ON "PayrollBatch"("sourceSnapshotId");

ALTER TABLE "AccountingRoundingPolicy"
  ADD CONSTRAINT "AccountingRoundingPolicy_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingSourceSnapshot"
  ADD CONSTRAINT "AccountingSourceSnapshot_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingSourceSnapshot_legalEntityId_fkey"
  FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingIntegrationInbox"
  ADD CONSTRAINT "AccountingIntegrationInbox_legalEntityId_fkey"
  FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingIntegrationInbox_sourceSnapshotId_fkey"
  FOREIGN KEY ("sourceSnapshotId") REFERENCES "AccountingSourceSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingPostingAttempt"
  ADD CONSTRAINT "AccountingPostingAttempt_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingPostingAttempt_inboxId_fkey"
  FOREIGN KEY ("inboxId") REFERENCES "AccountingIntegrationInbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingPostingAttempt_journalEntryId_fkey"
  FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingPayrollRunSnapshot"
  ADD CONSTRAINT "AccountingPayrollRunSnapshot_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingPayrollRunSnapshot_sourceSnapshotId_fkey"
  FOREIGN KEY ("sourceSnapshotId") REFERENCES "AccountingSourceSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JournalEntry"
  ADD CONSTRAINT "JournalEntry_legalEntityId_fkey"
  FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "JournalEntry_sourceSnapshotId_fkey"
  FOREIGN KEY ("sourceSnapshotId") REFERENCES "AccountingSourceSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "JournalEntry_accountingApprovalPolicyId_fkey"
  FOREIGN KEY ("accountingApprovalPolicyId") REFERENCES "AccountingApprovalPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "JournalEntry_numberSeriesId_fkey"
  FOREIGN KEY ("numberSeriesId") REFERENCES "AccountingNumberSeries"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "JournalEntry_roundingPolicyId_fkey"
  FOREIGN KEY ("roundingPolicyId") REFERENCES "AccountingRoundingPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "JournalEntry_replacementOfId_fkey"
  FOREIGN KEY ("replacementOfId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PayrollBatch"
  ADD CONSTRAINT "PayrollBatch_sourceSnapshotId_fkey"
  FOREIGN KEY ("sourceSnapshotId") REFERENCES "AccountingSourceSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "accounting_assert_phase3_tenant_link"()
RETURNS TRIGGER AS $$
DECLARE
  referenced_org TEXT;
BEGIN
  IF TG_TABLE_NAME = 'AccountingSourceSnapshot' THEN
    SELECT "orgId" INTO referenced_org FROM "AccountingLegalEntity" WHERE id = NEW."legalEntityId";
  ELSIF TG_TABLE_NAME = 'AccountingIntegrationInbox' AND NEW."legalEntityId" IS NOT NULL THEN
    SELECT "orgId" INTO referenced_org FROM "AccountingLegalEntity" WHERE id = NEW."legalEntityId";
  ELSIF TG_TABLE_NAME = 'AccountingIntegrationInbox' AND NEW."sourceSnapshotId" IS NOT NULL THEN
    SELECT "orgId" INTO referenced_org FROM "AccountingSourceSnapshot" WHERE id = NEW."sourceSnapshotId";
  ELSIF TG_TABLE_NAME = 'JournalEntry' AND NEW."legalEntityId" IS NOT NULL THEN
    SELECT "orgId" INTO referenced_org FROM "AccountingLegalEntity" WHERE id = NEW."legalEntityId";
  ELSIF TG_TABLE_NAME = 'JournalEntry' AND NEW."sourceSnapshotId" IS NOT NULL THEN
    SELECT "orgId" INTO referenced_org FROM "AccountingSourceSnapshot" WHERE id = NEW."sourceSnapshotId";
  ELSIF TG_TABLE_NAME = 'PayrollBatch' AND NEW."sourceSnapshotId" IS NOT NULL THEN
    SELECT "orgId" INTO referenced_org FROM "AccountingSourceSnapshot" WHERE id = NEW."sourceSnapshotId";
  END IF;

  IF referenced_org IS NOT NULL AND referenced_org <> NEW."orgId" THEN
    RAISE EXCEPTION 'Accounting Phase 3 cross-tenant link rejected for %', TG_TABLE_NAME
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AccountingSourceSnapshot_tenant_guard"
BEFORE INSERT OR UPDATE ON "AccountingSourceSnapshot"
FOR EACH ROW EXECUTE FUNCTION "accounting_assert_phase3_tenant_link"();

CREATE TRIGGER "AccountingIntegrationInbox_tenant_guard"
BEFORE INSERT OR UPDATE ON "AccountingIntegrationInbox"
FOR EACH ROW EXECUTE FUNCTION "accounting_assert_phase3_tenant_link"();

CREATE TRIGGER "JournalEntry_phase3_tenant_guard"
BEFORE INSERT OR UPDATE ON "JournalEntry"
FOR EACH ROW EXECUTE FUNCTION "accounting_assert_phase3_tenant_link"();

CREATE TRIGGER "PayrollBatch_phase3_tenant_guard"
BEFORE INSERT OR UPDATE ON "PayrollBatch"
FOR EACH ROW EXECUTE FUNCTION "accounting_assert_phase3_tenant_link"();

CREATE OR REPLACE FUNCTION "accounting_require_canonical_posting"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('SUBMITTED', 'POSTED')
     AND COALESCE(current_setting('monolith.accounting_canonical_posting', true), '') <> 'on'
     AND COALESCE(current_setting('monolith.accounting_seed_fixture', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Submitted or posted journals may only be created by the canonical Accounting posting engine'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "JournalEntry_canonical_insert_guard"
BEFORE INSERT ON "JournalEntry"
FOR EACH ROW EXECUTE FUNCTION "accounting_require_canonical_posting"();

CREATE OR REPLACE FUNCTION "accounting_prevent_immutable_journal_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(current_setting('monolith.accounting_seed_fixture', true), '') = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status IN ('SUBMITTED', 'POSTED') THEN
    RAISE EXCEPTION 'Submitted and posted journal headers are immutable; use reversal and replacement'
      USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "JournalEntry_immutable_guard"
BEFORE UPDATE OR DELETE ON "JournalEntry"
FOR EACH ROW EXECUTE FUNCTION "accounting_prevent_immutable_journal_mutation"();

CREATE OR REPLACE FUNCTION "accounting_prevent_immutable_journal_child_mutation"()
RETURNS TRIGGER AS $$
DECLARE
  parent_status TEXT;
  parent_id TEXT;
BEGIN
  IF COALESCE(current_setting('monolith.accounting_seed_fixture', true), '') = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  parent_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."journalEntryId" ELSE OLD."journalEntryId" END;
  SELECT status INTO parent_status FROM "JournalEntry" WHERE id = parent_id;
  IF parent_status IN ('SUBMITTED', 'POSTED') THEN
    RAISE EXCEPTION 'Submitted and posted journal facts are immutable; use reversal and replacement'
      USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "JournalEntryLine_immutable_guard"
BEFORE UPDATE OR DELETE ON "JournalEntryLine"
FOR EACH ROW EXECUTE FUNCTION "accounting_prevent_immutable_journal_child_mutation"();

CREATE TRIGGER "GeneralLedgerEntry_immutable_guard"
BEFORE UPDATE OR DELETE ON "GeneralLedgerEntry"
FOR EACH ROW
WHEN (OLD."journalEntryId" IS NOT NULL)
EXECUTE FUNCTION "accounting_prevent_immutable_journal_child_mutation"();

CREATE OR REPLACE FUNCTION "accounting_prevent_source_snapshot_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(current_setting('monolith.accounting_seed_fixture', true), '') = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Accounting source snapshots are immutable'
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AccountingSourceSnapshot_immutable_guard"
BEFORE UPDATE OR DELETE ON "AccountingSourceSnapshot"
FOR EACH ROW EXECUTE FUNCTION "accounting_prevent_source_snapshot_mutation"();

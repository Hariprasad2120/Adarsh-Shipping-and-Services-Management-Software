-- Phase 4 is expand-only. It introduces canonical Accounting document,
-- payment, allocation, scheduled-occurrence, and outbox-publication evidence.

ALTER TABLE "AccountingIntegrationOutbox"
  ADD COLUMN "legalEntityId" TEXT,
  ADD COLUMN "leaseToken" TEXT,
  ADD COLUMN "leaseOwner" TEXT,
  ADD COLUMN "leasedUntil" TIMESTAMP(3),
  ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
  ADD COLUMN "publicationResultCode" TEXT,
  ADD COLUMN "deadLetterAt" TIMESTAMP(3),
  ADD COLUMN "manualReviewAt" TIMESTAMP(3),
  ADD COLUMN "rowVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "AccountingIntegrationOutbox"
  ADD CONSTRAINT "AccountingIntegrationOutbox_legalEntityId_fkey"
  FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "AccountingIntegrationOutbox_org_status_lease_idx"
  ON "AccountingIntegrationOutbox"("orgId", "status", "leasedUntil");
CREATE INDEX "AccountingIntegrationOutbox_legalEntityId_idx"
  ON "AccountingIntegrationOutbox"("legalEntityId");

CREATE TABLE "AccountingDocumentPolicy" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "configuration" JSONB NOT NULL,
  "configurationHash" TEXT NOT NULL,
  "statutoryValidated" BOOLEAN NOT NULL DEFAULT false,
  "approvedById" TEXT NOT NULL,
  "approvedAt" TIMESTAMP(3) NOT NULL,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingDocumentPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingDocumentPolicy_dates_check"
    CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom")
);

CREATE TABLE "AccountingDocument" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "sourceSnapshotId" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceVersion" INTEGER NOT NULL,
  "legacyRecordType" TEXT,
  "legacyRecordId" TEXT,
  "documentType" TEXT NOT NULL,
  "schemaVersion" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "documentDate" DATE NOT NULL,
  "postingDate" DATE NOT NULL,
  "dueDate" DATE,
  "counterpartyType" TEXT,
  "counterpartyId" TEXT,
  "transactionCurrencyCode" VARCHAR(3) NOT NULL,
  "baseCurrencyCode" VARCHAR(3) NOT NULL,
  "exchangeRateId" TEXT,
  "numberSeriesId" TEXT NOT NULL,
  "approvalPolicyId" TEXT NOT NULL,
  "approvalPolicyVersion" INTEGER NOT NULL,
  "roundingPolicyId" TEXT NOT NULL,
  "roundingPolicyVersion" INTEGER NOT NULL,
  "sourceApprovalVersion" INTEGER,
  "subtotal" DECIMAL(28,8) NOT NULL,
  "discountAmount" DECIMAL(28,8) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(28,8) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(28,8) NOT NULL,
  "supportingDocumentRefs" JSONB,
  "approvalEvidence" JSONB,
  "immutablePayload" JSONB NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "causationId" TEXT,
  "makerId" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "journalEntryId" TEXT,
  "correctionOfId" TEXT,
  "correctionReason" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingDocument_source_version_check" CHECK ("sourceVersion" > 0),
  CONSTRAINT "AccountingDocument_schema_version_check" CHECK ("schemaVersion" > 0),
  CONSTRAINT "AccountingDocument_amounts_check" CHECK (
    "subtotal" >= 0 AND "discountAmount" >= 0 AND "taxAmount" >= 0
    AND "totalAmount" >= 0
    AND "subtotal" - "discountAmount" + "taxAmount" = "totalAmount"
  ),
  CONSTRAINT "AccountingDocument_status_check" CHECK (
    "status" IN ('DRAFT','PENDING_APPROVAL','APPROVED','POSTED','REJECTED','CANCELLED','POLICY_GATED')
  ),
  CONSTRAINT "AccountingDocument_approval_check" CHECK (
    ("approvedById" IS NULL AND "approvedAt" IS NULL)
    OR ("approvedById" IS NOT NULL AND "approvedAt" IS NOT NULL)
  )
);

CREATE TABLE "AccountingDocumentLine" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "lineNumber" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(20,6) NOT NULL,
  "unitAmount" DECIMAL(28,8) NOT NULL,
  "discountAmount" DECIMAL(28,8) NOT NULL DEFAULT 0,
  "taxableAmount" DECIMAL(28,8) NOT NULL,
  "taxCategoryRef" TEXT,
  "taxAmount" DECIMAL(28,8) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(28,8) NOT NULL,
  "accountId" TEXT NOT NULL,
  "dimensions" JSONB,
  "sourceLineRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountingDocumentLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingDocumentLine_values_check" CHECK (
    "lineNumber" > 0 AND "quantity" > 0 AND "unitAmount" >= 0
    AND "discountAmount" >= 0 AND "taxableAmount" >= 0
    AND "taxAmount" >= 0 AND "totalAmount" >= 0
    AND "taxableAmount" + "taxAmount" = "totalAmount"
  )
);

CREATE TABLE "AccountingPayment" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "sourceSnapshotId" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceVersion" INTEGER NOT NULL,
  "legacyPaymentEntryId" TEXT,
  "paymentType" TEXT NOT NULL,
  "schemaVersion" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "payerPayeeType" TEXT NOT NULL,
  "payerPayeeId" TEXT NOT NULL,
  "bankOrCashAccountId" TEXT NOT NULL,
  "controlAccountId" TEXT NOT NULL,
  "transactionDate" DATE NOT NULL,
  "valueDate" DATE,
  "transactionCurrencyCode" VARCHAR(3) NOT NULL,
  "baseCurrencyCode" VARCHAR(3) NOT NULL,
  "exchangeRateId" TEXT,
  "amount" DECIMAL(28,8) NOT NULL,
  "allocatedAmount" DECIMAL(28,8) NOT NULL DEFAULT 0,
  "unappliedAmount" DECIMAL(28,8) NOT NULL DEFAULT 0,
  "paymentMethod" TEXT NOT NULL,
  "externalReference" TEXT,
  "dimensions" JSONB,
  "supportingDocumentRefs" JSONB,
  "approvalEvidence" JSONB,
  "immutablePayload" JSONB NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "causationId" TEXT,
  "makerId" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "journalEntryId" TEXT,
  "reversalOfId" TEXT,
  "reversedAt" TIMESTAMP(3),
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingPayment_versions_check" CHECK ("sourceVersion" > 0 AND "schemaVersion" > 0),
  CONSTRAINT "AccountingPayment_amounts_check" CHECK (
    "amount" > 0 AND "allocatedAmount" >= 0 AND "unappliedAmount" >= 0
    AND "allocatedAmount" + "unappliedAmount" = "amount"
  ),
  CONSTRAINT "AccountingPayment_status_check" CHECK (
    "status" IN ('DRAFT','PENDING_APPROVAL','APPROVED','POSTED','REJECTED','REVERSED','POLICY_GATED')
  ),
  CONSTRAINT "AccountingPayment_approval_check" CHECK (
    ("approvedById" IS NULL AND "approvedAt" IS NULL)
    OR ("approvedById" IS NOT NULL AND "approvedAt" IS NOT NULL)
  )
);

CREATE TABLE "AccountingPaymentAllocation" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL DEFAULT 'ACCOUNTING_DOCUMENT',
  "targetDocumentId" TEXT,
  "targetSourceSnapshotId" TEXT,
  "targetVersion" INTEGER NOT NULL,
  "amount" DECIMAL(28,8) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "reversalOfId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reversedAt" TIMESTAMP(3),
  CONSTRAINT "AccountingPaymentAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingPaymentAllocation_values_check" CHECK (
    "targetVersion" > 0 AND "amount" > 0
    AND "status" IN ('ACTIVE','REVERSED')
    AND (
      ("targetType" = 'ACCOUNTING_DOCUMENT' AND "targetDocumentId" IS NOT NULL AND "targetSourceSnapshotId" IS NULL)
      OR ("targetType" = 'SOURCE_SNAPSHOT' AND "targetDocumentId" IS NULL AND "targetSourceSnapshotId" IS NOT NULL)
    )
  )
);

CREATE TABLE "AccountingScheduledOccurrence" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "sourceSnapshotId" TEXT NOT NULL,
  "templateType" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "templateVersion" INTEGER NOT NULL,
  "scheduledFor" DATE NOT NULL,
  "occurrenceKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "claimedBy" TEXT,
  "claimedUntil" TIMESTAMP(3),
  "generatedRecordType" TEXT,
  "generatedRecordId" TEXT,
  "journalEntryId" TEXT,
  "failureCode" TEXT,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingScheduledOccurrence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingScheduledOccurrence_version_check" CHECK ("templateVersion" > 0),
  CONSTRAINT "AccountingScheduledOccurrence_status_check" CHECK (
    "status" IN ('PENDING','CLAIMED','GENERATED','SKIPPED','FAILED','MANUAL_REVIEW')
  )
);

ALTER TABLE "AccountingDocumentPolicy"
  ADD CONSTRAINT "AccountingDocumentPolicy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingDocumentPolicy_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingDocument"
  ADD CONSTRAINT "AccountingDocument_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingDocument_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingDocument_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "AccountingDocumentPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingDocument_sourceSnapshotId_fkey" FOREIGN KEY ("sourceSnapshotId") REFERENCES "AccountingSourceSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingDocument_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingDocument_correctionOfId_fkey" FOREIGN KEY ("correctionOfId") REFERENCES "AccountingDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingDocumentLine"
  ADD CONSTRAINT "AccountingDocumentLine_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingDocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "AccountingDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingPayment"
  ADD CONSTRAINT "AccountingPayment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingPayment_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingPayment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "AccountingDocumentPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingPayment_sourceSnapshotId_fkey" FOREIGN KEY ("sourceSnapshotId") REFERENCES "AccountingSourceSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingPayment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingPayment_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "AccountingPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingPaymentAllocation"
  ADD CONSTRAINT "AccountingPaymentAllocation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingPaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "AccountingPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingPaymentAllocation_targetDocumentId_fkey" FOREIGN KEY ("targetDocumentId") REFERENCES "AccountingDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingPaymentAllocation_targetSourceSnapshotId_fkey" FOREIGN KEY ("targetSourceSnapshotId") REFERENCES "AccountingSourceSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingPaymentAllocation_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "AccountingPaymentAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingScheduledOccurrence"
  ADD CONSTRAINT "AccountingScheduledOccurrence_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingScheduledOccurrence_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingScheduledOccurrence_sourceSnapshotId_fkey" FOREIGN KEY ("sourceSnapshotId") REFERENCES "AccountingSourceSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingScheduledOccurrence_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "AccountingDocumentPolicy_scope_version_key" ON "AccountingDocumentPolicy"("orgId","legalEntityId","documentType","version");
CREATE INDEX "AccountingDocumentPolicy_active_idx" ON "AccountingDocumentPolicy"("orgId","legalEntityId","documentType","isActive","effectiveFrom");
CREATE UNIQUE INDEX "AccountingDocument_source_key" ON "AccountingDocument"("orgId","sourceSystem","sourceType","sourceId","sourceVersion");
CREATE UNIQUE INDEX "AccountingDocument_request_key" ON "AccountingDocument"("orgId","requestId");
CREATE UNIQUE INDEX "AccountingDocument_idempotency_key" ON "AccountingDocument"("orgId","idempotencyKey");
CREATE UNIQUE INDEX "AccountingDocument_legacy_key" ON "AccountingDocument"("orgId","legacyRecordType","legacyRecordId","sourceVersion");
CREATE UNIQUE INDEX "AccountingDocument_journal_key" ON "AccountingDocument"("journalEntryId");
CREATE INDEX "AccountingDocument_state_idx" ON "AccountingDocument"("orgId","legalEntityId","documentType","status","postingDate");
CREATE INDEX "AccountingDocument_party_idx" ON "AccountingDocument"("orgId","counterpartyType","counterpartyId","status");
CREATE INDEX "AccountingDocument_snapshot_idx" ON "AccountingDocument"("sourceSnapshotId");
CREATE INDEX "AccountingDocument_correction_idx" ON "AccountingDocument"("correctionOfId");
CREATE UNIQUE INDEX "AccountingDocumentLine_number_key" ON "AccountingDocumentLine"("documentId","lineNumber");
CREATE INDEX "AccountingDocumentLine_account_idx" ON "AccountingDocumentLine"("orgId","accountId");
CREATE UNIQUE INDEX "AccountingPayment_source_key" ON "AccountingPayment"("orgId","sourceSystem","sourceType","sourceId","sourceVersion");
CREATE UNIQUE INDEX "AccountingPayment_request_key" ON "AccountingPayment"("orgId","requestId");
CREATE UNIQUE INDEX "AccountingPayment_idempotency_key" ON "AccountingPayment"("orgId","idempotencyKey");
CREATE UNIQUE INDEX "AccountingPayment_legacy_key" ON "AccountingPayment"("orgId","legacyPaymentEntryId","sourceVersion");
CREATE UNIQUE INDEX "AccountingPayment_journal_key" ON "AccountingPayment"("journalEntryId");
CREATE INDEX "AccountingPayment_state_idx" ON "AccountingPayment"("orgId","legalEntityId","paymentType","status","transactionDate");
CREATE INDEX "AccountingPayment_party_idx" ON "AccountingPayment"("orgId","payerPayeeType","payerPayeeId","status");
CREATE INDEX "AccountingPayment_external_ref_idx" ON "AccountingPayment"("orgId","legalEntityId","externalReference");
CREATE INDEX "AccountingPayment_snapshot_idx" ON "AccountingPayment"("sourceSnapshotId");
CREATE INDEX "AccountingPayment_reversal_idx" ON "AccountingPayment"("reversalOfId");
CREATE UNIQUE INDEX "AccountingPaymentAllocation_active_key" ON "AccountingPaymentAllocation"("paymentId","targetType","targetDocumentId","targetSourceSnapshotId","targetVersion","reversalOfId");
CREATE INDEX "AccountingPaymentAllocation_target_idx" ON "AccountingPaymentAllocation"("orgId","targetDocumentId","status");
CREATE INDEX "AccountingPaymentAllocation_snapshot_idx" ON "AccountingPaymentAllocation"("orgId","targetSourceSnapshotId","status");
CREATE INDEX "AccountingPaymentAllocation_reversal_idx" ON "AccountingPaymentAllocation"("reversalOfId");
CREATE UNIQUE INDEX "AccountingScheduledOccurrence_source_key" ON "AccountingScheduledOccurrence"("orgId","templateType","templateId","templateVersion","scheduledFor");
CREATE UNIQUE INDEX "AccountingScheduledOccurrence_occurrence_key" ON "AccountingScheduledOccurrence"("orgId","occurrenceKey");
CREATE UNIQUE INDEX "AccountingScheduledOccurrence_journal_key" ON "AccountingScheduledOccurrence"("journalEntryId");
CREATE INDEX "AccountingScheduledOccurrence_due_idx" ON "AccountingScheduledOccurrence"("orgId","status","scheduledFor");
CREATE INDEX "AccountingScheduledOccurrence_claim_idx" ON "AccountingScheduledOccurrence"("orgId","status","claimedUntil");

CREATE OR REPLACE FUNCTION "accounting_phase4_tenant_guard"()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE related_org TEXT;
BEGIN
  IF TG_TABLE_NAME = 'AccountingIntegrationOutbox' AND NEW."legalEntityId" IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME IN ('AccountingDocumentPolicy','AccountingDocument','AccountingPayment','AccountingScheduledOccurrence','AccountingIntegrationOutbox') THEN
    SELECT "orgId" INTO related_org FROM "AccountingLegalEntity" WHERE id = NEW."legalEntityId";
    IF related_org IS NULL OR related_org <> NEW."orgId" THEN
      RAISE EXCEPTION 'ACCOUNTING_PHASE4_LEGAL_ENTITY_SCOPE_MISMATCH';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'AccountingDocumentLine' THEN
    SELECT "orgId" INTO related_org FROM "AccountingDocument" WHERE id = NEW."documentId";
    IF related_org IS NULL OR related_org <> NEW."orgId" THEN
      RAISE EXCEPTION 'ACCOUNTING_PHASE4_DOCUMENT_LINE_SCOPE_MISMATCH';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'AccountingPaymentAllocation' THEN
    SELECT "orgId" INTO related_org FROM "AccountingPayment" WHERE id = NEW."paymentId";
    IF related_org IS NULL OR related_org <> NEW."orgId" THEN
      RAISE EXCEPTION 'ACCOUNTING_PHASE4_PAYMENT_ALLOCATION_SCOPE_MISMATCH';
    END IF;
    IF NEW."targetType" = 'ACCOUNTING_DOCUMENT' THEN
      SELECT "orgId" INTO related_org FROM "AccountingDocument" WHERE id = NEW."targetDocumentId";
    ELSE
      SELECT "orgId" INTO related_org FROM "AccountingSourceSnapshot" WHERE id = NEW."targetSourceSnapshotId";
    END IF;
    IF related_org IS NULL OR related_org <> NEW."orgId" THEN
      RAISE EXCEPTION 'ACCOUNTING_PHASE4_ALLOCATION_TARGET_SCOPE_MISMATCH';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "AccountingDocumentPolicy_tenant_guard" BEFORE INSERT OR UPDATE ON "AccountingDocumentPolicy" FOR EACH ROW EXECUTE FUNCTION "accounting_phase4_tenant_guard"();
CREATE TRIGGER "AccountingDocument_tenant_guard" BEFORE INSERT OR UPDATE ON "AccountingDocument" FOR EACH ROW EXECUTE FUNCTION "accounting_phase4_tenant_guard"();
CREATE TRIGGER "AccountingDocumentLine_tenant_guard" BEFORE INSERT OR UPDATE ON "AccountingDocumentLine" FOR EACH ROW EXECUTE FUNCTION "accounting_phase4_tenant_guard"();
CREATE TRIGGER "AccountingPayment_tenant_guard" BEFORE INSERT OR UPDATE ON "AccountingPayment" FOR EACH ROW EXECUTE FUNCTION "accounting_phase4_tenant_guard"();
CREATE TRIGGER "AccountingPaymentAllocation_tenant_guard" BEFORE INSERT OR UPDATE ON "AccountingPaymentAllocation" FOR EACH ROW EXECUTE FUNCTION "accounting_phase4_tenant_guard"();
CREATE TRIGGER "AccountingScheduledOccurrence_tenant_guard" BEFORE INSERT OR UPDATE ON "AccountingScheduledOccurrence" FOR EACH ROW EXECUTE FUNCTION "accounting_phase4_tenant_guard"();
CREATE TRIGGER "AccountingIntegrationOutbox_phase4_tenant_guard" BEFORE INSERT OR UPDATE ON "AccountingIntegrationOutbox" FOR EACH ROW EXECUTE FUNCTION "accounting_phase4_tenant_guard"();

CREATE OR REPLACE FUNCTION "accounting_phase4_immutable_guard"()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_status TEXT;
BEGIN
  IF COALESCE(current_setting('monolith.accounting_canonical_posting', true), '') = 'on'
     OR COALESCE(current_setting('monolith.accounting_seed_fixture', true), '') = 'on' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'AccountingDocument' THEN
    IF OLD.status IN ('APPROVED','POSTED','CANCELLED') THEN
      RAISE EXCEPTION 'ACCOUNTING_POSTED_DOCUMENT_IMMUTABLE';
    END IF;
  ELSIF TG_TABLE_NAME = 'AccountingPayment' THEN
    IF OLD.status IN ('APPROVED','POSTED','REVERSED') THEN
      RAISE EXCEPTION 'ACCOUNTING_POSTED_PAYMENT_IMMUTABLE';
    END IF;
  ELSIF TG_TABLE_NAME = 'AccountingDocumentLine' THEN
    SELECT status INTO parent_status FROM "AccountingDocument" WHERE id = OLD."documentId";
    IF parent_status IN ('APPROVED','POSTED','CANCELLED') THEN
      RAISE EXCEPTION 'ACCOUNTING_POSTED_DOCUMENT_LINE_IMMUTABLE';
    END IF;
  ELSIF TG_TABLE_NAME = 'AccountingPaymentAllocation' THEN
    SELECT status INTO parent_status FROM "AccountingPayment" WHERE id = OLD."paymentId";
    IF parent_status IN ('APPROVED','POSTED','REVERSED') THEN
      RAISE EXCEPTION 'ACCOUNTING_POSTED_ALLOCATION_IMMUTABLE';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "AccountingDocument_immutable_guard" BEFORE UPDATE OR DELETE ON "AccountingDocument" FOR EACH ROW EXECUTE FUNCTION "accounting_phase4_immutable_guard"();
CREATE TRIGGER "AccountingDocumentLine_immutable_guard" BEFORE UPDATE OR DELETE ON "AccountingDocumentLine" FOR EACH ROW EXECUTE FUNCTION "accounting_phase4_immutable_guard"();
CREATE TRIGGER "AccountingPayment_immutable_guard" BEFORE UPDATE OR DELETE ON "AccountingPayment" FOR EACH ROW EXECUTE FUNCTION "accounting_phase4_immutable_guard"();
CREATE TRIGGER "AccountingPaymentAllocation_immutable_guard" BEFORE UPDATE OR DELETE ON "AccountingPaymentAllocation" FOR EACH ROW EXECUTE FUNCTION "accounting_phase4_immutable_guard"();

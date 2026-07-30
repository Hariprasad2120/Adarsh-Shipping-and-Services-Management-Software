-- Phase 4 follow-up hardening. This migration is intentionally additive:
-- the preceding Phase 4 migration has already been exercised on guarded staging.

-- A nullable column in an ordinary UNIQUE index does not prevent duplicate
-- active allocations. These partial indexes provide the intended identity for
-- each supported target kind.
CREATE UNIQUE INDEX "AccountingPaymentAllocation_active_document_key"
  ON "AccountingPaymentAllocation" ("paymentId", "targetDocumentId", "targetVersion")
  WHERE "status" = 'ACTIVE'
    AND "reversalOfId" IS NULL
    AND "targetType" = 'ACCOUNTING_DOCUMENT'
    AND "targetDocumentId" IS NOT NULL;

CREATE UNIQUE INDEX "AccountingPaymentAllocation_active_snapshot_key"
  ON "AccountingPaymentAllocation" ("paymentId", "targetSourceSnapshotId", "targetVersion")
  WHERE "status" = 'ACTIVE'
    AND "reversalOfId" IS NULL
    AND "targetType" = 'SOURCE_SNAPSHOT'
    AND "targetSourceSnapshotId" IS NOT NULL;

-- External references are unique within the legal entity and payment type.
-- Reversal does not release the identity: reuse would make bank reconciliation
-- and audit lineage ambiguous.
CREATE UNIQUE INDEX "AccountingPayment_external_reference_key"
  ON "AccountingPayment" ("orgId", "legalEntityId", "paymentType", "externalReference")
  WHERE "externalReference" IS NOT NULL;

CREATE OR REPLACE FUNCTION "accounting_phase4_allocation_capacity_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  payment_org text;
  declared_allocated numeric(28,8);
  existing_payment_allocated numeric(28,8);
  target_org text;
  target_status text;
  target_version integer;
  target_capacity numeric(28,8);
  existing_target_allocated numeric(28,8);
BEGIN
  IF NEW."status" <> 'ACTIVE' THEN
    RETURN NEW;
  END IF;

  SELECT "orgId", "allocatedAmount"
    INTO payment_org, declared_allocated
  FROM "AccountingPayment"
  WHERE id = NEW."paymentId"
  FOR UPDATE;

  IF payment_org IS NULL OR payment_org <> NEW."orgId" THEN
    RAISE EXCEPTION 'ACCOUNTING_ALLOCATION_PAYMENT_SCOPE_MISMATCH';
  END IF;

  SELECT COALESCE(SUM(amount), 0)
    INTO existing_payment_allocated
  FROM "AccountingPaymentAllocation"
  WHERE "paymentId" = NEW."paymentId"
    AND "status" = 'ACTIVE'
    AND id <> NEW.id;

  IF existing_payment_allocated + NEW.amount > declared_allocated THEN
    RAISE EXCEPTION 'ACCOUNTING_PAYMENT_ALLOCATION_TOTAL_EXCEEDED';
  END IF;

  IF NEW."targetType" = 'ACCOUNTING_DOCUMENT' THEN
    SELECT "orgId", status, "sourceVersion", "totalAmount"
      INTO target_org, target_status, target_version, target_capacity
    FROM "AccountingDocument"
    WHERE id = NEW."targetDocumentId"
    FOR UPDATE;

    IF target_org IS NULL
      OR target_org <> NEW."orgId"
      OR target_status <> 'POSTED'
      OR target_version <> NEW."targetVersion" THEN
      RAISE EXCEPTION 'ACCOUNTING_ALLOCATION_DOCUMENT_NOT_ELIGIBLE';
    END IF;

    SELECT COALESCE(SUM(amount), 0)
      INTO existing_target_allocated
    FROM "AccountingPaymentAllocation"
    WHERE "targetDocumentId" = NEW."targetDocumentId"
      AND "status" = 'ACTIVE'
      AND id <> NEW.id;

    IF existing_target_allocated + NEW.amount > target_capacity THEN
      RAISE EXCEPTION 'ACCOUNTING_DOCUMENT_ALLOCATION_CAPACITY_EXCEEDED';
    END IF;
  ELSIF NEW."targetType" = 'SOURCE_SNAPSHOT' THEN
    SELECT prs."orgId", prs."runVersion", prs."totalCredit"
      INTO target_org, target_version, target_capacity
    FROM "AccountingPayrollRunSnapshot" prs
    WHERE prs."sourceSnapshotId" = NEW."targetSourceSnapshotId"
    FOR UPDATE;

    IF target_org IS NULL
      OR target_org <> NEW."orgId"
      OR target_version <> NEW."targetVersion" THEN
      RAISE EXCEPTION 'ACCOUNTING_ALLOCATION_SNAPSHOT_NOT_ELIGIBLE';
    END IF;

    SELECT COALESCE(SUM(amount), 0)
      INTO existing_target_allocated
    FROM "AccountingPaymentAllocation"
    WHERE "targetSourceSnapshotId" = NEW."targetSourceSnapshotId"
      AND "status" = 'ACTIVE'
      AND id <> NEW.id;

    IF existing_target_allocated + NEW.amount > target_capacity THEN
      RAISE EXCEPTION 'ACCOUNTING_SNAPSHOT_ALLOCATION_CAPACITY_EXCEEDED';
    END IF;
  ELSE
    RAISE EXCEPTION 'ACCOUNTING_ALLOCATION_TARGET_TYPE_INVALID';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "AccountingPaymentAllocation_capacity_guard"
BEFORE INSERT OR UPDATE OF "paymentId", "targetType", "targetDocumentId",
  "targetSourceSnapshotId", "targetVersion", amount, status
ON "AccountingPaymentAllocation"
FOR EACH ROW
EXECUTE FUNCTION "accounting_phase4_allocation_capacity_guard"();

-- Concurrent correction preparation must not consume more than the immutable
-- value of the original posted document.
CREATE OR REPLACE FUNCTION "accounting_phase4_correction_capacity_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  original_org text;
  original_status text;
  original_total numeric(28,8);
  existing_corrections numeric(28,8);
BEGIN
  IF NEW."correctionOfId" IS NULL
    OR NEW.status NOT IN ('PENDING_APPROVAL', 'POSTED') THEN
    RETURN NEW;
  END IF;

  SELECT "orgId", status, "totalAmount"
    INTO original_org, original_status, original_total
  FROM "AccountingDocument"
  WHERE id = NEW."correctionOfId"
  FOR UPDATE;

  IF original_org IS NULL
    OR original_org <> NEW."orgId"
    OR original_status <> 'POSTED' THEN
    RAISE EXCEPTION 'ACCOUNTING_CORRECTION_ORIGINAL_NOT_ELIGIBLE';
  END IF;

  SELECT COALESCE(SUM("totalAmount"), 0)
    INTO existing_corrections
  FROM "AccountingDocument"
  WHERE "correctionOfId" = NEW."correctionOfId"
    AND status IN ('PENDING_APPROVAL', 'POSTED')
    AND id <> NEW.id;

  IF existing_corrections + NEW."totalAmount" > original_total THEN
    RAISE EXCEPTION 'ACCOUNTING_CORRECTION_CAPACITY_EXCEEDED';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "AccountingDocument_correction_capacity_guard"
BEFORE INSERT OR UPDATE OF "correctionOfId", status, "totalAmount"
ON "AccountingDocument"
FOR EACH ROW
EXECUTE FUNCTION "accounting_phase4_correction_capacity_guard"();

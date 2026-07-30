-- PostgreSQL resolves NEW fields used in a shared trigger function even when
-- an earlier boolean term appears to exclude that table. Branch by table name
-- before touching table-specific fields.
CREATE OR REPLACE FUNCTION "accounting_phase4_tenant_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  related_org text;
BEGIN
  IF TG_TABLE_NAME = 'AccountingIntegrationOutbox' THEN
    IF NEW."legalEntityId" IS NULL THEN
      RETURN NEW;
    END IF;
    SELECT "orgId" INTO related_org
    FROM "AccountingLegalEntity"
    WHERE id = NEW."legalEntityId";
    IF related_org IS NULL OR related_org <> NEW."orgId" THEN
      RAISE EXCEPTION 'ACCOUNTING_PHASE4_LEGAL_ENTITY_SCOPE_MISMATCH';
    END IF;
  ELSIF TG_TABLE_NAME IN (
    'AccountingDocumentPolicy',
    'AccountingDocument',
    'AccountingPayment',
    'AccountingScheduledOccurrence'
  ) THEN
    SELECT "orgId" INTO related_org
    FROM "AccountingLegalEntity"
    WHERE id = NEW."legalEntityId";
    IF related_org IS NULL OR related_org <> NEW."orgId" THEN
      RAISE EXCEPTION 'ACCOUNTING_PHASE4_LEGAL_ENTITY_SCOPE_MISMATCH';
    END IF;
  ELSIF TG_TABLE_NAME = 'AccountingDocumentLine' THEN
    SELECT "orgId" INTO related_org
    FROM "AccountingDocument"
    WHERE id = NEW."documentId";
    IF related_org IS NULL OR related_org <> NEW."orgId" THEN
      RAISE EXCEPTION 'ACCOUNTING_PHASE4_DOCUMENT_LINE_SCOPE_MISMATCH';
    END IF;
  ELSIF TG_TABLE_NAME = 'AccountingPaymentAllocation' THEN
    SELECT "orgId" INTO related_org
    FROM "AccountingPayment"
    WHERE id = NEW."paymentId";
    IF related_org IS NULL OR related_org <> NEW."orgId" THEN
      RAISE EXCEPTION 'ACCOUNTING_PHASE4_PAYMENT_ALLOCATION_SCOPE_MISMATCH';
    END IF;
    IF NEW."targetType" = 'ACCOUNTING_DOCUMENT' THEN
      SELECT "orgId" INTO related_org
      FROM "AccountingDocument"
      WHERE id = NEW."targetDocumentId";
    ELSE
      SELECT "orgId" INTO related_org
      FROM "AccountingSourceSnapshot"
      WHERE id = NEW."targetSourceSnapshotId";
    END IF;
    IF related_org IS NULL OR related_org <> NEW."orgId" THEN
      RAISE EXCEPTION 'ACCOUNTING_PHASE4_ALLOCATION_TARGET_SCOPE_MISMATCH';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

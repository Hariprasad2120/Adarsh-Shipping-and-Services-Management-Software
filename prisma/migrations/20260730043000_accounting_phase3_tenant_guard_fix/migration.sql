-- Replace the initial polymorphic trigger implementation with a JSON-backed
-- version. PostgreSQL validates direct NEW.field access against every trigger
-- table, so optional fields must be read from the row as JSON.
CREATE OR REPLACE FUNCTION "accounting_assert_phase3_tenant_link"()
RETURNS TRIGGER AS $$
DECLARE
  row_data JSONB := to_jsonb(NEW);
  row_org TEXT := row_data->>'orgId';
  referenced_org TEXT;
  reference_id TEXT;
BEGIN
  reference_id := row_data->>'legalEntityId';
  IF reference_id IS NOT NULL THEN
    SELECT "orgId" INTO referenced_org
    FROM "AccountingLegalEntity"
    WHERE id = reference_id;
    IF referenced_org IS NOT NULL AND referenced_org <> row_org THEN
      RAISE EXCEPTION 'Accounting Phase 3 cross-tenant legal entity link rejected for %', TG_TABLE_NAME
        USING ERRCODE = '23514';
    END IF;
  END IF;

  reference_id := row_data->>'sourceSnapshotId';
  IF reference_id IS NOT NULL THEN
    SELECT "orgId" INTO referenced_org
    FROM "AccountingSourceSnapshot"
    WHERE id = reference_id;
    IF referenced_org IS NOT NULL AND referenced_org <> row_org THEN
      RAISE EXCEPTION 'Accounting Phase 3 cross-tenant source snapshot link rejected for %', TG_TABLE_NAME
        USING ERRCODE = '23514';
    END IF;
  END IF;

  reference_id := row_data->>'accountingApprovalPolicyId';
  IF reference_id IS NOT NULL THEN
    SELECT "orgId" INTO referenced_org
    FROM "AccountingApprovalPolicy"
    WHERE id = reference_id;
    IF referenced_org IS NOT NULL AND referenced_org <> row_org THEN
      RAISE EXCEPTION 'Accounting Phase 3 cross-tenant approval policy link rejected for %', TG_TABLE_NAME
        USING ERRCODE = '23514';
    END IF;
  END IF;

  reference_id := row_data->>'numberSeriesId';
  IF reference_id IS NOT NULL THEN
    SELECT "orgId" INTO referenced_org
    FROM "AccountingNumberSeries"
    WHERE id = reference_id;
    IF referenced_org IS NOT NULL AND referenced_org <> row_org THEN
      RAISE EXCEPTION 'Accounting Phase 3 cross-tenant number series link rejected for %', TG_TABLE_NAME
        USING ERRCODE = '23514';
    END IF;
  END IF;

  reference_id := row_data->>'roundingPolicyId';
  IF reference_id IS NOT NULL THEN
    SELECT "orgId" INTO referenced_org
    FROM "AccountingRoundingPolicy"
    WHERE id = reference_id;
    IF referenced_org IS NOT NULL AND referenced_org <> row_org THEN
      RAISE EXCEPTION 'Accounting Phase 3 cross-tenant rounding policy link rejected for %', TG_TABLE_NAME
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

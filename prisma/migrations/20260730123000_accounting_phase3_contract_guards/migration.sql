-- Phase 3 contract guards: close multi-reference tenant gaps, restrict the
-- synthetic fixture bypass to the exact isolated staging database, and enforce
-- legal-entity ownership on canonical journal children.

CREATE OR REPLACE FUNCTION "accounting_seed_fixture_bypass_allowed"()
RETURNS BOOLEAN AS $$
  SELECT
    COALESCE(current_setting('monolith.accounting_seed_fixture', true), '') = 'on'
    AND current_database() = 'monolith_accounting_staging'
    AND current_user = 'monolith_staging'
    AND COALESCE(host(inet_server_addr()), '') = '127.0.0.1'
    AND inet_server_port() = 56432
    AND COALESCE(
      shobj_description(
        (SELECT oid FROM pg_database WHERE datname = current_database()),
        'pg_database'
      ),
      ''
    ) = 'MONOLITH_ACCOUNTING_STAGING_ONLY';
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION "accounting_assert_phase3_tenant_link"()
RETURNS TRIGGER AS $$
DECLARE
  referenced_org TEXT;
  referenced_entity TEXT;
BEGIN
  IF TG_TABLE_NAME = 'AccountingSourceSnapshot' THEN
    SELECT "orgId" INTO referenced_org
    FROM "AccountingLegalEntity"
    WHERE id = NEW."legalEntityId";
    IF referenced_org IS DISTINCT FROM NEW."orgId" THEN
      RAISE EXCEPTION 'Accounting source legal entity must belong to the same organization'
        USING ERRCODE = '23514';
    END IF;
    IF NEW."approvedById" IS NOT NULL THEN
      SELECT "orgId" INTO referenced_org FROM "User" WHERE id = NEW."approvedById";
      IF referenced_org IS DISTINCT FROM NEW."orgId" THEN
        RAISE EXCEPTION 'Accounting source approver must belong to the same organization'
          USING ERRCODE = '23514';
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'AccountingIntegrationInbox' THEN
    IF NEW."legalEntityId" IS NOT NULL THEN
      SELECT "orgId" INTO referenced_org
      FROM "AccountingLegalEntity"
      WHERE id = NEW."legalEntityId";
      IF referenced_org IS DISTINCT FROM NEW."orgId" THEN
        RAISE EXCEPTION 'Accounting inbox legal entity must belong to the same organization'
          USING ERRCODE = '23514';
      END IF;
    END IF;
    IF NEW."sourceSnapshotId" IS NOT NULL THEN
      SELECT "orgId", "legalEntityId"
      INTO referenced_org, referenced_entity
      FROM "AccountingSourceSnapshot"
      WHERE id = NEW."sourceSnapshotId";
      IF referenced_org IS DISTINCT FROM NEW."orgId"
         OR (
           NEW."legalEntityId" IS NOT NULL
           AND referenced_entity IS DISTINCT FROM NEW."legalEntityId"
         ) THEN
        RAISE EXCEPTION 'Accounting inbox source snapshot is outside its organization or legal entity'
          USING ERRCODE = '23514';
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'JournalEntry' THEN
    IF NEW."legalEntityId" IS NOT NULL THEN
      SELECT "orgId" INTO referenced_org
      FROM "AccountingLegalEntity"
      WHERE id = NEW."legalEntityId";
      IF referenced_org IS DISTINCT FROM NEW."orgId" THEN
        RAISE EXCEPTION 'Journal legal entity must belong to the same organization'
          USING ERRCODE = '23514';
      END IF;
    END IF;
    IF NEW."sourceSnapshotId" IS NOT NULL THEN
      SELECT "orgId", "legalEntityId"
      INTO referenced_org, referenced_entity
      FROM "AccountingSourceSnapshot"
      WHERE id = NEW."sourceSnapshotId";
      IF referenced_org IS DISTINCT FROM NEW."orgId"
         OR (
           NEW."legalEntityId" IS NOT NULL
           AND referenced_entity IS DISTINCT FROM NEW."legalEntityId"
         ) THEN
        RAISE EXCEPTION 'Journal source snapshot is outside its organization or legal entity'
          USING ERRCODE = '23514';
      END IF;
    END IF;
    IF NEW."exchangeRateId" IS NOT NULL THEN
      SELECT "orgId" INTO referenced_org
      FROM "AccountingExchangeRate"
      WHERE id = NEW."exchangeRateId";
      IF referenced_org IS DISTINCT FROM NEW."orgId" THEN
        RAISE EXCEPTION 'Journal exchange-rate evidence must belong to the same organization'
          USING ERRCODE = '23514';
      END IF;
    END IF;
    IF NEW."accountingApprovalPolicyId" IS NOT NULL THEN
      SELECT "orgId" INTO referenced_org
      FROM "AccountingApprovalPolicy"
      WHERE id = NEW."accountingApprovalPolicyId";
      IF referenced_org IS DISTINCT FROM NEW."orgId" THEN
        RAISE EXCEPTION 'Journal approval policy must belong to the same organization'
          USING ERRCODE = '23514';
      END IF;
    END IF;
    IF NEW."numberSeriesId" IS NOT NULL THEN
      SELECT "orgId" INTO referenced_org
      FROM "AccountingNumberSeries"
      WHERE id = NEW."numberSeriesId";
      IF referenced_org IS DISTINCT FROM NEW."orgId" THEN
        RAISE EXCEPTION 'Journal number series must belong to the same organization'
          USING ERRCODE = '23514';
      END IF;
    END IF;
    IF NEW."roundingPolicyId" IS NOT NULL THEN
      SELECT "orgId" INTO referenced_org
      FROM "AccountingRoundingPolicy"
      WHERE id = NEW."roundingPolicyId";
      IF referenced_org IS DISTINCT FROM NEW."orgId" THEN
        RAISE EXCEPTION 'Journal rounding policy must belong to the same organization'
          USING ERRCODE = '23514';
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'PayrollBatch' AND NEW."sourceSnapshotId" IS NOT NULL THEN
    SELECT "orgId" INTO referenced_org
    FROM "AccountingSourceSnapshot"
    WHERE id = NEW."sourceSnapshotId";
    IF referenced_org IS DISTINCT FROM NEW."orgId" THEN
      RAISE EXCEPTION 'Payroll compatibility batch source must belong to the same organization'
        USING ERRCODE = '23514';
    END IF;

  ELSIF TG_TABLE_NAME = 'AccountingPayrollRunSnapshot' THEN
    SELECT "orgId" INTO referenced_org
    FROM "AccountingSourceSnapshot"
    WHERE id = NEW."sourceSnapshotId";
    IF referenced_org IS DISTINCT FROM NEW."orgId" THEN
      RAISE EXCEPTION 'Payroll run source must belong to the same organization'
        USING ERRCODE = '23514';
    END IF;
    SELECT "orgId" INTO referenced_org FROM "User" WHERE id = NEW."approvedById";
    IF referenced_org IS DISTINCT FROM NEW."orgId" THEN
      RAISE EXCEPTION 'Payroll run approver must belong to the same organization'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AccountingPayrollRunSnapshot_tenant_guard"
BEFORE INSERT OR UPDATE ON "AccountingPayrollRunSnapshot"
FOR EACH ROW EXECUTE FUNCTION "accounting_assert_phase3_tenant_link"();

CREATE OR REPLACE FUNCTION "accounting_require_canonical_posting"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('SUBMITTED', 'POSTED')
     AND COALESCE(current_setting('monolith.accounting_canonical_posting', true), '') <> 'on'
     AND NOT "accounting_seed_fixture_bypass_allowed"() THEN
    RAISE EXCEPTION 'Submitted or posted journals may only be created by the canonical Accounting posting engine'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "accounting_prevent_immutable_journal_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF "accounting_seed_fixture_bypass_allowed"() THEN
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

CREATE OR REPLACE FUNCTION "accounting_prevent_source_snapshot_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF "accounting_seed_fixture_bypass_allowed"() THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Accounting source snapshots are immutable'
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "accounting_prevent_used_exchange_rate_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF "accounting_seed_fixture_bypass_allowed"() THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "JournalEntry"
    WHERE "exchangeRateId" = OLD.id
      AND status IN ('SUBMITTED', 'POSTED')
  ) THEN
    RAISE EXCEPTION 'Exchange-rate evidence used by a posted journal is immutable'
      USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "accounting_require_canonical_ledger_insert"()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(current_setting('monolith.accounting_canonical_posting', true), '') <> 'on'
     AND NOT "accounting_seed_fixture_bypass_allowed"() THEN
    RAISE EXCEPTION 'General ledger rows may only be created by the canonical Accounting posting engine'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "accounting_prevent_immutable_journal_child_mutation"()
RETURNS TRIGGER AS $$
DECLARE
  parent_id TEXT;
  parent_status TEXT;
  parent_org TEXT;
  parent_entity TEXT;
  child_org TEXT;
  account_org TEXT;
  account_entity TEXT;
  account_id TEXT;
BEGIN
  IF "accounting_seed_fixture_bypass_allowed"() THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'JournalEntryLine' THEN
    parent_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."journalEntryId" ELSE NEW."journalEntryId" END;
    account_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."accountId" ELSE NEW."accountId" END;
    child_org := NULL;
  ELSE
    parent_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."journalEntryId" ELSE NEW."journalEntryId" END;
    account_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."accountId" ELSE NEW."accountId" END;
    child_org := CASE WHEN TG_OP = 'DELETE' THEN OLD."orgId" ELSE NEW."orgId" END;
  END IF;

  IF parent_id IS NOT NULL THEN
    SELECT status, "orgId", "legalEntityId"
    INTO parent_status, parent_org, parent_entity
    FROM "JournalEntry"
    WHERE id = parent_id;

    SELECT "orgId", "legalEntityId"
    INTO account_org, account_entity
    FROM "Account"
    WHERE id = account_id;

    IF account_org IS DISTINCT FROM parent_org
       OR (
         parent_entity IS NOT NULL
         AND account_entity IS DISTINCT FROM parent_entity
       )
       OR (child_org IS NOT NULL AND child_org IS DISTINCT FROM parent_org) THEN
      RAISE EXCEPTION 'Journal child account is outside its organization or legal entity'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF parent_status IN ('SUBMITTED', 'POSTED')
       AND COALESCE(current_setting('monolith.accounting_canonical_posting', true), '') <> 'on' THEN
      RAISE EXCEPTION 'Submitted and posted journal facts may only be inserted by the canonical Accounting posting engine'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

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

CREATE OR REPLACE FUNCTION "accounting_prevent_immutable_journal_dimension_mutation"()
RETURNS TRIGGER AS $$
DECLARE
  line_id TEXT;
  parent_status TEXT;
BEGIN
  IF "accounting_seed_fixture_bypass_allowed"() THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  line_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."journalEntryLineId" ELSE NEW."journalEntryLineId" END;
  SELECT j.status INTO parent_status
  FROM "JournalEntryLine" l
  JOIN "JournalEntry" j ON j.id = l."journalEntryId"
  WHERE l.id = line_id;

  IF parent_status IN ('SUBMITTED', 'POSTED') THEN
    IF TG_OP <> 'INSERT'
       OR COALESCE(current_setting('monolith.accounting_canonical_posting', true), '') <> 'on' THEN
      RAISE EXCEPTION 'Submitted and posted journal dimensions are immutable; use reversal and replacement'
        USING ERRCODE = '55000';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

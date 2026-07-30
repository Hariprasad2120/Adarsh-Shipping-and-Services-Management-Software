-- Phase 3 hardening: legal-entity account ownership, configured precision,
-- canonical write guards, immutable posted children, and correction uniqueness.

ALTER TABLE "Account"
  ADD COLUMN "legalEntityId" TEXT;

ALTER TABLE "Account"
  ADD CONSTRAINT "Account_legalEntityId_fkey"
  FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Account_legalEntityId_idx" ON "Account"("legalEntityId");

ALTER TABLE "AccountingExchangeRate"
  ALTER COLUMN "rate" TYPE DECIMAL(30, 12) USING "rate"::DECIMAL(30, 12);

ALTER TABLE "AccountingPayrollRunSnapshot"
  ALTER COLUMN "totalDebit" TYPE DECIMAL(28, 8) USING "totalDebit"::DECIMAL(28, 8),
  ALTER COLUMN "totalCredit" TYPE DECIMAL(28, 8) USING "totalCredit"::DECIMAL(28, 8);

ALTER TABLE "JournalEntry"
  ADD COLUMN "exchangeRateId" TEXT,
  ALTER COLUMN "totalDebit" TYPE DECIMAL(28, 8) USING "totalDebit"::DECIMAL(28, 8),
  ALTER COLUMN "totalCredit" TYPE DECIMAL(28, 8) USING "totalCredit"::DECIMAL(28, 8);

ALTER TABLE "JournalEntry"
  ADD CONSTRAINT "JournalEntry_exchangeRateId_fkey"
  FOREIGN KEY ("exchangeRateId") REFERENCES "AccountingExchangeRate"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "JournalEntry_exchangeRateId_idx" ON "JournalEntry"("exchangeRateId");

ALTER TABLE "JournalEntryLine"
  ALTER COLUMN "debit" TYPE DECIMAL(28, 8) USING "debit"::DECIMAL(28, 8),
  ALTER COLUMN "credit" TYPE DECIMAL(28, 8) USING "credit"::DECIMAL(28, 8),
  ALTER COLUMN "transactionDebit" TYPE DECIMAL(28, 8) USING "transactionDebit"::DECIMAL(28, 8),
  ALTER COLUMN "transactionCredit" TYPE DECIMAL(28, 8) USING "transactionCredit"::DECIMAL(28, 8),
  ALTER COLUMN "exchangeRate" TYPE DECIMAL(30, 12) USING "exchangeRate"::DECIMAL(30, 12);

ALTER TABLE "GeneralLedgerEntry"
  ALTER COLUMN "debit" TYPE DECIMAL(28, 8) USING "debit"::DECIMAL(28, 8),
  ALTER COLUMN "credit" TYPE DECIMAL(28, 8) USING "credit"::DECIMAL(28, 8);

CREATE OR REPLACE FUNCTION "accounting_assert_account_legal_entity"()
RETURNS TRIGGER AS $$
DECLARE
  entity_org TEXT;
BEGIN
  IF NEW."legalEntityId" IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT "orgId" INTO entity_org
  FROM "AccountingLegalEntity"
  WHERE id = NEW."legalEntityId";
  IF entity_org IS NULL OR entity_org <> NEW."orgId" THEN
    RAISE EXCEPTION 'Account legal entity must belong to the same organization'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Account_legal_entity_tenant_guard"
BEFORE INSERT OR UPDATE ON "Account"
FOR EACH ROW EXECUTE FUNCTION "accounting_assert_account_legal_entity"();

CREATE OR REPLACE FUNCTION "accounting_assert_journal_exchange_rate"()
RETURNS TRIGGER AS $$
DECLARE
  rate_org TEXT;
BEGIN
  IF NEW."exchangeRateId" IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT "orgId" INTO rate_org
  FROM "AccountingExchangeRate"
  WHERE id = NEW."exchangeRateId";
  IF rate_org IS NULL OR rate_org <> NEW."orgId" THEN
    RAISE EXCEPTION 'Journal exchange rate must belong to the same organization'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "JournalEntry_exchange_rate_tenant_guard"
BEFORE INSERT OR UPDATE ON "JournalEntry"
FOR EACH ROW EXECUTE FUNCTION "accounting_assert_journal_exchange_rate"();

CREATE OR REPLACE FUNCTION "accounting_prevent_used_exchange_rate_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(current_setting('monolith.accounting_seed_fixture', true), '') = 'on' THEN
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

CREATE TRIGGER "AccountingExchangeRate_posted_evidence_guard"
BEFORE UPDATE OR DELETE ON "AccountingExchangeRate"
FOR EACH ROW EXECUTE FUNCTION "accounting_prevent_used_exchange_rate_mutation"();

CREATE TRIGGER "JournalEntry_canonical_status_guard"
BEFORE UPDATE OF status ON "JournalEntry"
FOR EACH ROW EXECUTE FUNCTION "accounting_require_canonical_posting"();

CREATE OR REPLACE FUNCTION "accounting_require_canonical_ledger_insert"()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(current_setting('monolith.accounting_canonical_posting', true), '') <> 'on'
     AND COALESCE(current_setting('monolith.accounting_seed_fixture', true), '') <> 'on' THEN
    RAISE EXCEPTION 'General ledger rows may only be created by the canonical Accounting posting engine'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "GeneralLedgerEntry_canonical_insert_guard"
BEFORE INSERT ON "GeneralLedgerEntry"
FOR EACH ROW EXECUTE FUNCTION "accounting_require_canonical_ledger_insert"();

CREATE OR REPLACE FUNCTION "accounting_prevent_immutable_journal_child_mutation"()
RETURNS TRIGGER AS $$
DECLARE
  old_parent_status TEXT;
  new_parent_status TEXT;
BEGIN
  IF COALESCE(current_setting('monolith.accounting_seed_fixture', true), '') = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT status INTO new_parent_status
    FROM "JournalEntry"
    WHERE id = NEW."journalEntryId";
    IF new_parent_status IN ('SUBMITTED', 'POSTED')
       AND COALESCE(current_setting('monolith.accounting_canonical_posting', true), '') <> 'on' THEN
      RAISE EXCEPTION 'Submitted and posted journal facts may only be inserted by the canonical Accounting posting engine'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  SELECT status INTO old_parent_status
  FROM "JournalEntry"
  WHERE id = OLD."journalEntryId";
  IF old_parent_status IN ('SUBMITTED', 'POSTED') THEN
    RAISE EXCEPTION 'Submitted and posted journal facts are immutable; use reversal and replacement'
      USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW."journalEntryId" IS DISTINCT FROM OLD."journalEntryId" THEN
    SELECT status INTO new_parent_status
    FROM "JournalEntry"
    WHERE id = NEW."journalEntryId";
    IF new_parent_status IN ('SUBMITTED', 'POSTED') THEN
      RAISE EXCEPTION 'Submitted and posted journal facts are immutable; use reversal and replacement'
        USING ERRCODE = '55000';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER "JournalEntryLine_immutable_guard" ON "JournalEntryLine";
CREATE TRIGGER "JournalEntryLine_immutable_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "JournalEntryLine"
FOR EACH ROW EXECUTE FUNCTION "accounting_prevent_immutable_journal_child_mutation"();

DROP TRIGGER "GeneralLedgerEntry_immutable_guard" ON "GeneralLedgerEntry";
CREATE TRIGGER "GeneralLedgerEntry_immutable_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "GeneralLedgerEntry"
FOR EACH ROW EXECUTE FUNCTION "accounting_prevent_immutable_journal_child_mutation"();

CREATE OR REPLACE FUNCTION "accounting_prevent_immutable_journal_dimension_mutation"()
RETURNS TRIGGER AS $$
DECLARE
  line_id TEXT;
  parent_status TEXT;
BEGIN
  IF COALESCE(current_setting('monolith.accounting_seed_fixture', true), '') = 'on' THEN
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

CREATE TRIGGER "AccountingJournalLineDimension_immutable_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "AccountingJournalLineDimension"
FOR EACH ROW EXECUTE FUNCTION "accounting_prevent_immutable_journal_dimension_mutation"();

CREATE UNIQUE INDEX "JournalEntry_one_posted_reversal_per_original"
  ON "JournalEntry"("reversalOfId")
  WHERE "reversalOfId" IS NOT NULL AND status IN ('SUBMITTED', 'POSTED');

CREATE UNIQUE INDEX "JournalEntry_one_posted_replacement_per_original"
  ON "JournalEntry"("replacementOfId")
  WHERE "replacementOfId" IS NOT NULL AND status IN ('SUBMITTED', 'POSTED');

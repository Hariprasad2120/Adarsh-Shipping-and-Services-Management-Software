CREATE OR REPLACE FUNCTION "accounting_require_canonical_posting"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('SUBMITTED', 'POSTED')
     AND COALESCE(current_setting('monolith.accounting_canonical_posting', true), '') <> 'on'
     AND NOT (
       NEW.status = 'SUBMITTED'
       AND COALESCE(current_setting('monolith.accounting_manual_journal_transition', true), '') = 'on'
     )
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
    IF COALESCE(current_setting('monolith.accounting_manual_journal_transition', true), '') = 'on'
       AND OLD.status = 'SUBMITTED'
       AND TG_OP = 'UPDATE'
       AND NEW.status IN ('CANCELLED', 'SUPERSEDED') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Submitted and posted journal headers are immutable; use reversal and replacement'
      USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

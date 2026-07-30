-- Scheduled occurrences retain immutable terminal lineage. Pending/failed
-- occurrences may transition through the guarded worker, but deletion is never
-- a normal runtime operation.
CREATE OR REPLACE FUNCTION "accounting_phase4_occurrence_immutable_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(current_setting('monolith.accounting_seed_fixture', true), '') = 'on' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ACCOUNTING_SCHEDULED_OCCURRENCE_DELETE_BLOCKED';
  END IF;
  IF OLD.status IN ('GENERATED', 'SKIPPED') THEN
    RAISE EXCEPTION 'ACCOUNTING_SCHEDULED_OCCURRENCE_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "AccountingScheduledOccurrence_immutable_guard"
BEFORE UPDATE OR DELETE
ON "AccountingScheduledOccurrence"
FOR EACH ROW
EXECUTE FUNCTION "accounting_phase4_occurrence_immutable_guard"();

CREATE TABLE "AccountingCounterpartyEntityScope" (
  id TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "partyType" TEXT NOT NULL,
  "partyId" TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT FALSE,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "approvedById" TEXT NOT NULL,
  "approvedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingCounterpartyEntityScope_pkey" PRIMARY KEY (id),
  CONSTRAINT "AccountingCounterpartyEntityScope_values_check" CHECK (
    version > 0
    AND "partyType" IN ('CUSTOMER','SUPPLIER')
    AND ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom")
  )
);

ALTER TABLE "AccountingCounterpartyEntityScope"
  ADD CONSTRAINT "AccountingCounterpartyEntityScope_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AccountingCounterpartyEntityScope_legalEntityId_fkey"
    FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "AccountingCounterpartyEntityScope_version_key"
  ON "AccountingCounterpartyEntityScope"
    ("orgId", "legalEntityId", "partyType", "partyId", version);
CREATE INDEX "AccountingCounterpartyEntityScope_active_idx"
  ON "AccountingCounterpartyEntityScope"
    ("orgId", "legalEntityId", "partyType", "partyId", "isActive");

CREATE OR REPLACE FUNCTION "accounting_phase4_counterparty_scope_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  entity_org text;
  party_org text;
BEGIN
  SELECT "orgId" INTO entity_org
  FROM "AccountingLegalEntity"
  WHERE id = NEW."legalEntityId";
  IF entity_org IS NULL OR entity_org <> NEW."orgId" THEN
    RAISE EXCEPTION 'ACCOUNTING_COUNTERPARTY_LEGAL_ENTITY_SCOPE_MISMATCH';
  END IF;

  IF NEW."partyType" = 'CUSTOMER' THEN
    SELECT "orgId" INTO party_org FROM "CrmAccount" WHERE id = NEW."partyId";
  ELSIF NEW."partyType" = 'SUPPLIER' THEN
    SELECT "orgId" INTO party_org FROM "CrmVendor" WHERE id = NEW."partyId";
  ELSE
    RAISE EXCEPTION 'ACCOUNTING_COUNTERPARTY_TYPE_INVALID';
  END IF;
  IF party_org IS NULL OR party_org <> NEW."orgId" THEN
    RAISE EXCEPTION 'ACCOUNTING_COUNTERPARTY_ORGANISATION_SCOPE_MISMATCH';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "AccountingCounterpartyEntityScope_tenant_guard"
BEFORE INSERT OR UPDATE
ON "AccountingCounterpartyEntityScope"
FOR EACH ROW
EXECUTE FUNCTION "accounting_phase4_counterparty_scope_guard"();

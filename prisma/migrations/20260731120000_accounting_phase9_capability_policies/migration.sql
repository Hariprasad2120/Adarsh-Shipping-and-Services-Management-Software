-- Phase 9 Slice 9.1 capability-policy registry.
-- This migration is additive only and does not create or mutate accounting facts.

CREATE TABLE "AccountingCapabilityPolicy" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT,
  "capabilityCode" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "configuration" JSONB NOT NULL,
  "configurationHash" TEXT NOT NULL,
  "statutoryValidated" BOOLEAN NOT NULL DEFAULT false,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedById" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "revokedById" TEXT,
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  "supersedesId" TEXT,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingCapabilityPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingCapabilityPolicy_status_check" CHECK (
    "status" IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'REVOKED', 'SUPERSEDED')
  ),
  CONSTRAINT "AccountingCapabilityPolicy_version_check" CHECK ("version" > 0),
  CONSTRAINT "AccountingCapabilityPolicy_date_range_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom"
  )
);

CREATE UNIQUE INDEX "AccountingCapabilityPolicy_scope_version_key"
  ON "AccountingCapabilityPolicy"("orgId", "legalEntityId", "capabilityCode", "version");
CREATE INDEX "AccountingCapabilityPolicy_org_capability_status_idx"
  ON "AccountingCapabilityPolicy"("orgId", "capabilityCode", "status");
CREATE INDEX "AccountingCapabilityPolicy_effective_idx"
  ON "AccountingCapabilityPolicy"("orgId", "legalEntityId", "capabilityCode", "effectiveFrom", "effectiveTo");
CREATE INDEX "AccountingCapabilityPolicy_createdById_idx"
  ON "AccountingCapabilityPolicy"("createdById");
CREATE INDEX "AccountingCapabilityPolicy_approvedById_idx"
  ON "AccountingCapabilityPolicy"("approvedById");
CREATE INDEX "AccountingCapabilityPolicy_rejectedById_idx"
  ON "AccountingCapabilityPolicy"("rejectedById");
CREATE INDEX "AccountingCapabilityPolicy_revokedById_idx"
  ON "AccountingCapabilityPolicy"("revokedById");
CREATE INDEX "AccountingCapabilityPolicy_supersedesId_idx"
  ON "AccountingCapabilityPolicy"("supersedesId");

ALTER TABLE "AccountingCapabilityPolicy"
  ADD CONSTRAINT "AccountingCapabilityPolicy_org_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organisation"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingCapabilityPolicy"
  ADD CONSTRAINT "AccountingCapabilityPolicy_legalEntityId_fkey"
  FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingCapabilityPolicy"
  ADD CONSTRAINT "AccountingCapabilityPolicy_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingCapabilityPolicy"
  ADD CONSTRAINT "AccountingCapabilityPolicy_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingCapabilityPolicy"
  ADD CONSTRAINT "AccountingCapabilityPolicy_rejectedById_fkey"
  FOREIGN KEY ("rejectedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingCapabilityPolicy"
  ADD CONSTRAINT "AccountingCapabilityPolicy_revokedById_fkey"
  FOREIGN KEY ("revokedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingCapabilityPolicy"
  ADD CONSTRAINT "AccountingCapabilityPolicy_supersedesId_fkey"
  FOREIGN KEY ("supersedesId") REFERENCES "AccountingCapabilityPolicy"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "accounting_capability_policy_scope_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  entity_org TEXT;
BEGIN
  IF NEW."legalEntityId" IS NOT NULL THEN
    SELECT "orgId"
      INTO entity_org
    FROM "AccountingLegalEntity"
    WHERE id = NEW."legalEntityId";

    IF entity_org IS NULL OR entity_org <> NEW."orgId" THEN
      RAISE EXCEPTION 'ACCOUNTING_CAPABILITY_POLICY_SCOPE_MISMATCH';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "AccountingCapabilityPolicy_scope_guard"
BEFORE INSERT OR UPDATE ON "AccountingCapabilityPolicy"
FOR EACH ROW EXECUTE FUNCTION "accounting_capability_policy_scope_guard"();

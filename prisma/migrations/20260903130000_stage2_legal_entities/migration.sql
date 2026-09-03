-- Stage 2 — enterprise platform: organisation structure.
--
-- Adds the platform legal-entity spine (LegalEntity) plus optional BusinessUnit
-- and CostCentre layers, and a nullable Branch.legalEntityId (expand phase — not
-- yet made NOT NULL). Every existing organisation gets exactly one default
-- LegalEntity named after the organisation, and its branches are re-parented
-- onto it. Purely additive; no behaviour change.
--
-- ROLLBACK:
--   ALTER TABLE "Branch" DROP COLUMN IF EXISTS "legalEntityId";
--   DROP TABLE IF EXISTS "CostCentre";
--   DROP TABLE IF EXISTS "BusinessUnit";
--   DROP TABLE IF EXISTS "LegalEntity";

-- CreateTable
CREATE TABLE "LegalEntity" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "entityType" TEXT,
    "registrationNumber" TEXT,
    "taxIdentifiers" JSONB,
    "country" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LegalEntity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessUnit" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "legalEntityId" TEXT,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CostCentre" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "legalEntityId" TEXT,
    "businessUnitId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CostCentre_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN "legalEntityId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LegalEntity_orgId_name_key" ON "LegalEntity"("orgId", "name");
CREATE INDEX "LegalEntity_orgId_idx" ON "LegalEntity"("orgId");
CREATE INDEX "LegalEntity_orgId_isDefault_idx" ON "LegalEntity"("orgId", "isDefault");
CREATE UNIQUE INDEX "BusinessUnit_orgId_code_key" ON "BusinessUnit"("orgId", "code");
CREATE INDEX "BusinessUnit_orgId_idx" ON "BusinessUnit"("orgId");
CREATE INDEX "BusinessUnit_legalEntityId_idx" ON "BusinessUnit"("legalEntityId");
CREATE INDEX "BusinessUnit_parentId_idx" ON "BusinessUnit"("parentId");
CREATE UNIQUE INDEX "CostCentre_orgId_code_key" ON "CostCentre"("orgId", "code");
CREATE INDEX "CostCentre_orgId_idx" ON "CostCentre"("orgId");
CREATE INDEX "CostCentre_legalEntityId_idx" ON "CostCentre"("legalEntityId");
CREATE INDEX "CostCentre_businessUnitId_idx" ON "CostCentre"("businessUnitId");
CREATE INDEX "Branch_legalEntityId_idx" ON "Branch"("legalEntityId");

-- AddForeignKey
ALTER TABLE "LegalEntity" ADD CONSTRAINT "LegalEntity_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessUnit" ADD CONSTRAINT "BusinessUnit_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessUnit" ADD CONSTRAINT "BusinessUnit_legalEntityId_fkey"
    FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessUnit" ADD CONSTRAINT "BusinessUnit_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CostCentre" ADD CONSTRAINT "CostCentre_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CostCentre" ADD CONSTRAINT "CostCentre_legalEntityId_fkey"
    FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CostCentre" ADD CONSTRAINT "CostCentre_businessUnitId_fkey"
    FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_legalEntityId_fkey"
    FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: one default legal entity per organisation, named after the org.
INSERT INTO "LegalEntity" ("id", "orgId", "name", "legalName", "isDefault", "active", "sortOrder", "createdAt", "updatedAt")
SELECT
    'le_' || replace(gen_random_uuid()::text, '-', ''),
    o."id",
    o."name",
    o."name",
    true,
    true,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Organisation" o;

-- Backfill: re-parent every existing branch onto its organisation's default entity.
UPDATE "Branch" b
SET "legalEntityId" = le."id"
FROM "LegalEntity" le
WHERE le."orgId" = b."orgId" AND le."isDefault" = true AND b."legalEntityId" IS NULL;

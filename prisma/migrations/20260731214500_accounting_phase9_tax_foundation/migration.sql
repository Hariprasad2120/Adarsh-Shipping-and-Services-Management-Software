-- Phase 9.3 tax foundation: versioned tax profiles, rules, and components.

CREATE TABLE "AccountingTaxProfile" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "legalEntityId" TEXT,
    "taxRegistrationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "configuration" JSONB,
    "statutoryValidated" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountingTaxProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingTaxRule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "taxProfileId" TEXT NOT NULL,
    "legalEntityId" TEXT,
    "taxRegistrationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "placeOfSupplyType" TEXT NOT NULL,
    "counterpartyTreatment" TEXT NOT NULL,
    "supplyCategory" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "configuration" JSONB NOT NULL,
    "statutoryValidated" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountingTaxRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingTaxComponent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "taxRuleId" TEXT NOT NULL,
    "componentCode" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "ratePercent" DECIMAL(12,6) NOT NULL,
    "recoverablePercent" DECIMAL(12,6),
    "ledgerAccountRole" TEXT,
    "position" INTEGER NOT NULL DEFAULT 1,
    "configuration" JSONB,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountingTaxComponent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountingTaxProfile_scope_version_key" ON "AccountingTaxProfile"("orgId", "taxRegistrationId", "code", "version");
CREATE INDEX "AccountingTaxProfile_active_idx" ON "AccountingTaxProfile"("orgId", "taxRegistrationId", "isActive", "effectiveFrom");
CREATE INDEX "AccountingTaxProfile_legal_entity_idx" ON "AccountingTaxProfile"("orgId", "legalEntityId", "code");

CREATE UNIQUE INDEX "AccountingTaxRule_scope_version_key" ON "AccountingTaxRule"("orgId", "taxProfileId", "code", "version");
CREATE INDEX "AccountingTaxRule_active_idx" ON "AccountingTaxRule"("orgId", "documentType", "isActive", "effectiveFrom");
CREATE INDEX "AccountingTaxRule_registration_supply_idx" ON "AccountingTaxRule"("orgId", "taxRegistrationId", "supplyCategory");

CREATE UNIQUE INDEX "AccountingTaxComponent_rule_code_key" ON "AccountingTaxComponent"("taxRuleId", "componentCode");
CREATE UNIQUE INDEX "AccountingTaxComponent_rule_position_key" ON "AccountingTaxComponent"("taxRuleId", "position");
CREATE INDEX "AccountingTaxComponent_org_type_idx" ON "AccountingTaxComponent"("orgId", "componentType");

ALTER TABLE "AccountingTaxProfile"
    ADD CONSTRAINT "AccountingTaxProfile_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingTaxProfile"
    ADD CONSTRAINT "AccountingTaxProfile_legalEntityId_fkey"
    FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingTaxProfile"
    ADD CONSTRAINT "AccountingTaxProfile_taxRegistrationId_fkey"
    FOREIGN KEY ("taxRegistrationId") REFERENCES "AccountingTaxRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingTaxRule"
    ADD CONSTRAINT "AccountingTaxRule_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingTaxRule"
    ADD CONSTRAINT "AccountingTaxRule_taxProfileId_fkey"
    FOREIGN KEY ("taxProfileId") REFERENCES "AccountingTaxProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingTaxRule"
    ADD CONSTRAINT "AccountingTaxRule_legalEntityId_fkey"
    FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingTaxRule"
    ADD CONSTRAINT "AccountingTaxRule_taxRegistrationId_fkey"
    FOREIGN KEY ("taxRegistrationId") REFERENCES "AccountingTaxRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingTaxComponent"
    ADD CONSTRAINT "AccountingTaxComponent_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingTaxComponent"
    ADD CONSTRAINT "AccountingTaxComponent_taxRuleId_fkey"
    FOREIGN KEY ("taxRuleId") REFERENCES "AccountingTaxRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

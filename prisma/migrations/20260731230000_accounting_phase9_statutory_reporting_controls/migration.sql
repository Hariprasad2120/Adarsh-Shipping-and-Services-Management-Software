-- Phase 9.3 statutory reporting controls: return profiles and filing periods.

CREATE TABLE "AccountingStatutoryReturnProfile" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "legalEntityId" TEXT,
    "taxRegistrationId" TEXT NOT NULL,
    "returnType" TEXT NOT NULL,
    "filingFrequency" TEXT NOT NULL,
    "dueDayOfMonth" INTEGER,
    "configuration" JSONB,
    "statutoryValidated" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountingStatutoryReturnProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingStatutoryFilingPeriod" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "legalEntityId" TEXT,
    "taxRegistrationId" TEXT NOT NULL,
    "returnType" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "dueDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "acknowledgementRef" TEXT,
    "filedAt" TIMESTAMP(3),
    "filedById" TEXT,
    "configuration" JSONB,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountingStatutoryFilingPeriod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountingStatutoryReturnProfile_scope_effective_key" ON "AccountingStatutoryReturnProfile"("orgId", "taxRegistrationId", "returnType", "effectiveFrom");
CREATE INDEX "AccountingStatutoryReturnProfile_active_idx" ON "AccountingStatutoryReturnProfile"("orgId", "returnType", "isActive", "effectiveFrom");
CREATE INDEX "AccountingStatutoryReturnProfile_scope_idx" ON "AccountingStatutoryReturnProfile"("orgId", "legalEntityId", "filingFrequency");

CREATE UNIQUE INDEX "AccountingStatutoryFilingPeriod_profile_period_key" ON "AccountingStatutoryFilingPeriod"("orgId", "profileId", "periodStart", "periodEnd");
CREATE INDEX "AccountingStatutoryFilingPeriod_active_idx" ON "AccountingStatutoryFilingPeriod"("orgId", "returnType", "status", "periodStart");
CREATE INDEX "AccountingStatutoryFilingPeriod_due_idx" ON "AccountingStatutoryFilingPeriod"("orgId", "taxRegistrationId", "dueDate");
CREATE INDEX "AccountingStatutoryFilingPeriod_filedById_idx" ON "AccountingStatutoryFilingPeriod"("filedById");

ALTER TABLE "AccountingStatutoryReturnProfile"
    ADD CONSTRAINT "AccountingStatutoryReturnProfile_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingStatutoryReturnProfile"
    ADD CONSTRAINT "AccountingStatutoryReturnProfile_legalEntityId_fkey"
    FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingStatutoryReturnProfile"
    ADD CONSTRAINT "AccountingStatutoryReturnProfile_taxRegistrationId_fkey"
    FOREIGN KEY ("taxRegistrationId") REFERENCES "AccountingTaxRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingStatutoryFilingPeriod"
    ADD CONSTRAINT "AccountingStatutoryFilingPeriod_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingStatutoryFilingPeriod"
    ADD CONSTRAINT "AccountingStatutoryFilingPeriod_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "AccountingStatutoryReturnProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingStatutoryFilingPeriod"
    ADD CONSTRAINT "AccountingStatutoryFilingPeriod_legalEntityId_fkey"
    FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingStatutoryFilingPeriod"
    ADD CONSTRAINT "AccountingStatutoryFilingPeriod_taxRegistrationId_fkey"
    FOREIGN KEY ("taxRegistrationId") REFERENCES "AccountingTaxRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingStatutoryFilingPeriod"
    ADD CONSTRAINT "AccountingStatutoryFilingPeriod_filedById_fkey"
    FOREIGN KEY ("filedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

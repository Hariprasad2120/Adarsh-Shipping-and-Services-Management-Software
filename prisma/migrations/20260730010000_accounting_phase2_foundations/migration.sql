-- CreateEnum
CREATE TYPE "AccountingInventoryMode" AS ENUM ('DISABLED', 'SERVICE_ONLY', 'INVENTORY_ONLY', 'MIXED');

-- CreateEnum
CREATE TYPE "AccountingRoundingMode" AS ENUM ('HALF_UP');

-- CreateEnum
CREATE TYPE "AccountingLegalEntityStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AccountingPeriodStatus" AS ENUM ('OPEN', 'SOFT_LOCKED', 'HARD_LOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AccountingPeriodLockRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'APPLIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccountingExchangeRateStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AccountingIntegrationMessageStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "accountingPeriodId" TEXT,
ADD COLUMN     "functionalCurrencyCode" VARCHAR(3),
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "postedAt" TIMESTAMP(3),
ADD COLUMN     "postedById" TEXT,
ADD COLUMN     "reversalOfId" TEXT,
ADD COLUMN     "rowVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceSystem" TEXT,
ADD COLUMN     "sourceType" TEXT,
ADD COLUMN     "sourceVersion" INTEGER;

-- AlterTable
ALTER TABLE "JournalEntryLine" ADD COLUMN     "exchangeRate" DECIMAL(20,10),
ADD COLUMN     "transactionCredit" DECIMAL(20,4),
ADD COLUMN     "transactionCurrencyCode" VARCHAR(3),
ADD COLUMN     "transactionDebit" DECIMAL(20,4);

-- CreateTable
CREATE TABLE "AccountingOrganisationProfile" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "functionalCurrencyCode" VARCHAR(3) NOT NULL,
    "fiscalYearStartMonth" INTEGER NOT NULL,
    "fiscalYearStartDay" INTEGER NOT NULL,
    "inventoryMode" "AccountingInventoryMode" NOT NULL,
    "moneyScale" INTEGER NOT NULL,
    "quantityScale" INTEGER NOT NULL,
    "exchangeRateScale" INTEGER NOT NULL,
    "percentageScale" INTEGER NOT NULL,
    "roundingMode" "AccountingRoundingMode" NOT NULL DEFAULT 'HALF_UP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingOrganisationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingLegalEntity" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "status" "AccountingLegalEntityStatus" NOT NULL DEFAULT 'DRAFT',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" DATE,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingLegalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingTaxRegistration" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "registrationCode" TEXT NOT NULL,
    "registrationType" TEXT NOT NULL,
    "gstin" TEXT,
    "stateCode" TEXT,
    "legalName" TEXT,
    "tradeName" TEXT,
    "effectiveFrom" DATE,
    "effectiveTo" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingTaxRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingPeriod" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "hardLockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingPeriodLockRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "decidedById" TEXT,
    "reason" TEXT NOT NULL,
    "status" "AccountingPeriodLockRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "reopenFrom" TIMESTAMP(3),
    "reopenUntil" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "relockedAt" TIMESTAMP(3),
    "rowVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AccountingPeriodLockRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingCurrency" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "decimalPlaces" INTEGER NOT NULL,
    "isFunctional" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingCurrency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingExchangeRate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fromCurrencyId" TEXT NOT NULL,
    "toCurrencyId" TEXT NOT NULL,
    "rateDate" DATE NOT NULL,
    "rate" DECIMAL(20,10) NOT NULL,
    "source" TEXT NOT NULL,
    "status" "AccountingExchangeRateStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingAccountControl" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "defaultCurrencyId" TEXT,
    "systemRole" TEXT,
    "isSystemLocked" BOOLEAN NOT NULL DEFAULT false,
    "allowDirectPosting" BOOLEAN NOT NULL DEFAULT true,
    "requiresParty" BOOLEAN NOT NULL DEFAULT false,
    "requiresChaJob" BOOLEAN NOT NULL DEFAULT false,
    "requiresCostCentre" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingAccountControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingDimensionDefinition" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "valueSource" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingDimensionDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingDimensionValue" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "canonicalType" TEXT,
    "canonicalId" TEXT,
    "effectiveFrom" DATE,
    "effectiveTo" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingDimensionValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingJournalLineDimension" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "journalEntryLineId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "dimensionValueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingJournalLineDimension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingApprovalPolicy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "configuration" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" DATE,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingApprovalPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingNumberSeries" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "taxRegistrationId" TEXT,
    "documentType" TEXT NOT NULL,
    "prefixTemplate" TEXT NOT NULL,
    "nextNumber" BIGINT NOT NULL DEFAULT 1,
    "padding" INTEGER NOT NULL DEFAULT 1,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingNumberSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingIntegrationInbox" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "messageVersion" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" "AccountingIntegrationMessageStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingIntegrationInbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingIntegrationOutbox" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "AccountingIntegrationMessageStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingIntegrationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountingOrganisationProfile_orgId_key" ON "AccountingOrganisationProfile"("orgId");

-- CreateIndex
CREATE INDEX "AccountingOrganisationProfile_orgId_idx" ON "AccountingOrganisationProfile"("orgId");

-- CreateIndex
CREATE INDEX "AccountingLegalEntity_orgId_status_idx" ON "AccountingLegalEntity"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingLegalEntity_orgId_code_key" ON "AccountingLegalEntity"("orgId", "code");

-- CreateIndex
CREATE INDEX "AccountingTaxRegistration_orgId_legalEntityId_isActive_idx" ON "AccountingTaxRegistration"("orgId", "legalEntityId", "isActive");

-- CreateIndex
CREATE INDEX "AccountingTaxRegistration_orgId_stateCode_idx" ON "AccountingTaxRegistration"("orgId", "stateCode");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingTaxRegistration_orgId_registrationCode_key" ON "AccountingTaxRegistration"("orgId", "registrationCode");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingTaxRegistration_orgId_gstin_key" ON "AccountingTaxRegistration"("orgId", "gstin");

-- CreateIndex
CREATE INDEX "AccountingPeriod_orgId_status_startDate_endDate_idx" ON "AccountingPeriod"("orgId", "status", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "AccountingPeriod_orgId_fiscalYearId_idx" ON "AccountingPeriod"("orgId", "fiscalYearId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_fiscalYearId_periodNumber_key" ON "AccountingPeriod"("fiscalYearId", "periodNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_orgId_startDate_endDate_key" ON "AccountingPeriod"("orgId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "AccountingPeriodLockRequest_orgId_status_requestedAt_idx" ON "AccountingPeriodLockRequest"("orgId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "AccountingPeriodLockRequest_periodId_status_idx" ON "AccountingPeriodLockRequest"("periodId", "status");

-- CreateIndex
CREATE INDEX "AccountingPeriodLockRequest_requestedById_idx" ON "AccountingPeriodLockRequest"("requestedById");

-- CreateIndex
CREATE INDEX "AccountingPeriodLockRequest_decidedById_idx" ON "AccountingPeriodLockRequest"("decidedById");

-- CreateIndex
CREATE INDEX "AccountingCurrency_orgId_isEnabled_idx" ON "AccountingCurrency"("orgId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingCurrency_orgId_code_key" ON "AccountingCurrency"("orgId", "code");

-- CreateIndex
CREATE INDEX "AccountingExchangeRate_orgId_rateDate_status_idx" ON "AccountingExchangeRate"("orgId", "rateDate", "status");

-- CreateIndex
CREATE INDEX "AccountingExchangeRate_fromCurrencyId_toCurrencyId_rateDate_idx" ON "AccountingExchangeRate"("fromCurrencyId", "toCurrencyId", "rateDate");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingExchangeRate_orgId_fromCurrencyId_toCurrencyId_ra_key" ON "AccountingExchangeRate"("orgId", "fromCurrencyId", "toCurrencyId", "rateDate", "source");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingAccountControl_accountId_key" ON "AccountingAccountControl"("accountId");

-- CreateIndex
CREATE INDEX "AccountingAccountControl_orgId_isSystemLocked_idx" ON "AccountingAccountControl"("orgId", "isSystemLocked");

-- CreateIndex
CREATE INDEX "AccountingAccountControl_defaultCurrencyId_idx" ON "AccountingAccountControl"("defaultCurrencyId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingAccountControl_orgId_systemRole_key" ON "AccountingAccountControl"("orgId", "systemRole");

-- CreateIndex
CREATE INDEX "AccountingDimensionDefinition_orgId_isActive_idx" ON "AccountingDimensionDefinition"("orgId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingDimensionDefinition_orgId_code_key" ON "AccountingDimensionDefinition"("orgId", "code");

-- CreateIndex
CREATE INDEX "AccountingDimensionValue_orgId_isActive_idx" ON "AccountingDimensionValue"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "AccountingDimensionValue_orgId_canonicalType_canonicalId_idx" ON "AccountingDimensionValue"("orgId", "canonicalType", "canonicalId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingDimensionValue_definitionId_code_key" ON "AccountingDimensionValue"("definitionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingDimensionValue_orgId_definitionId_canonicalType_c_key" ON "AccountingDimensionValue"("orgId", "definitionId", "canonicalType", "canonicalId");

-- CreateIndex
CREATE INDEX "AccountingJournalLineDimension_orgId_definitionId_dimension_idx" ON "AccountingJournalLineDimension"("orgId", "definitionId", "dimensionValueId");

-- CreateIndex
CREATE INDEX "AccountingJournalLineDimension_dimensionValueId_idx" ON "AccountingJournalLineDimension"("dimensionValueId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingJournalLineDimension_journalEntryLineId_definitio_key" ON "AccountingJournalLineDimension"("journalEntryLineId", "definitionId");

-- CreateIndex
CREATE INDEX "AccountingApprovalPolicy_orgId_documentType_isActive_idx" ON "AccountingApprovalPolicy"("orgId", "documentType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingApprovalPolicy_orgId_code_version_key" ON "AccountingApprovalPolicy"("orgId", "code", "version");

-- CreateIndex
CREATE INDEX "AccountingNumberSeries_orgId_documentType_isActive_idx" ON "AccountingNumberSeries"("orgId", "documentType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingNumberSeries_orgId_taxRegistrationId_documentType_key" ON "AccountingNumberSeries"("orgId", "taxRegistrationId", "documentType", "effectiveFrom");

-- CreateIndex
CREATE INDEX "AccountingIntegrationInbox_orgId_status_availableAt_idx" ON "AccountingIntegrationInbox"("orgId", "status", "availableAt");

-- CreateIndex
CREATE INDEX "AccountingIntegrationInbox_orgId_messageType_createdAt_idx" ON "AccountingIntegrationInbox"("orgId", "messageType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingIntegrationInbox_orgId_sourceSystem_idempotencyKe_key" ON "AccountingIntegrationInbox"("orgId", "sourceSystem", "idempotencyKey");

-- CreateIndex
CREATE INDEX "AccountingIntegrationOutbox_orgId_status_availableAt_idx" ON "AccountingIntegrationOutbox"("orgId", "status", "availableAt");

-- CreateIndex
CREATE INDEX "AccountingIntegrationOutbox_orgId_aggregateType_aggregateId_idx" ON "AccountingIntegrationOutbox"("orgId", "aggregateType", "aggregateId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingIntegrationOutbox_orgId_destination_idempotencyKe_key" ON "AccountingIntegrationOutbox"("orgId", "destination", "idempotencyKey");

-- CreateIndex
CREATE INDEX "JournalEntry_orgId_accountingPeriodId_postingDate_status_idx" ON "JournalEntry"("orgId", "accountingPeriodId", "postingDate", "status");

-- CreateIndex
CREATE INDEX "JournalEntry_reversalOfId_idx" ON "JournalEntry"("reversalOfId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_orgId_idempotencyKey_key" ON "JournalEntry"("orgId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_orgId_sourceSystem_sourceType_sourceId_sourceV_key" ON "JournalEntry"("orgId", "sourceSystem", "sourceType", "sourceId", "sourceVersion");

-- AddForeignKey
ALTER TABLE "AccountingOrganisationProfile" ADD CONSTRAINT "AccountingOrganisationProfile_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingLegalEntity" ADD CONSTRAINT "AccountingLegalEntity_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingTaxRegistration" ADD CONSTRAINT "AccountingTaxRegistration_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingTaxRegistration" ADD CONSTRAINT "AccountingTaxRegistration_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPeriodLockRequest" ADD CONSTRAINT "AccountingPeriodLockRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPeriodLockRequest" ADD CONSTRAINT "AccountingPeriodLockRequest_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AccountingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPeriodLockRequest" ADD CONSTRAINT "AccountingPeriodLockRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPeriodLockRequest" ADD CONSTRAINT "AccountingPeriodLockRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingCurrency" ADD CONSTRAINT "AccountingCurrency_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingExchangeRate" ADD CONSTRAINT "AccountingExchangeRate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingExchangeRate" ADD CONSTRAINT "AccountingExchangeRate_fromCurrencyId_fkey" FOREIGN KEY ("fromCurrencyId") REFERENCES "AccountingCurrency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingExchangeRate" ADD CONSTRAINT "AccountingExchangeRate_toCurrencyId_fkey" FOREIGN KEY ("toCurrencyId") REFERENCES "AccountingCurrency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingExchangeRate" ADD CONSTRAINT "AccountingExchangeRate_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingAccountControl" ADD CONSTRAINT "AccountingAccountControl_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingAccountControl" ADD CONSTRAINT "AccountingAccountControl_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingAccountControl" ADD CONSTRAINT "AccountingAccountControl_defaultCurrencyId_fkey" FOREIGN KEY ("defaultCurrencyId") REFERENCES "AccountingCurrency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingDimensionDefinition" ADD CONSTRAINT "AccountingDimensionDefinition_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingDimensionValue" ADD CONSTRAINT "AccountingDimensionValue_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingDimensionValue" ADD CONSTRAINT "AccountingDimensionValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "AccountingDimensionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingJournalLineDimension" ADD CONSTRAINT "AccountingJournalLineDimension_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingJournalLineDimension" ADD CONSTRAINT "AccountingJournalLineDimension_journalEntryLineId_fkey" FOREIGN KEY ("journalEntryLineId") REFERENCES "JournalEntryLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingJournalLineDimension" ADD CONSTRAINT "AccountingJournalLineDimension_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "AccountingDimensionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingJournalLineDimension" ADD CONSTRAINT "AccountingJournalLineDimension_dimensionValueId_fkey" FOREIGN KEY ("dimensionValueId") REFERENCES "AccountingDimensionValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingApprovalPolicy" ADD CONSTRAINT "AccountingApprovalPolicy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingNumberSeries" ADD CONSTRAINT "AccountingNumberSeries_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingNumberSeries" ADD CONSTRAINT "AccountingNumberSeries_taxRegistrationId_fkey" FOREIGN KEY ("taxRegistrationId") REFERENCES "AccountingTaxRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingIntegrationInbox" ADD CONSTRAINT "AccountingIntegrationInbox_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingIntegrationOutbox" ADD CONSTRAINT "AccountingIntegrationOutbox_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "AccountingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Value and lifecycle invariants. These are additive because all new tables
-- are empty at deployment time and all new legacy-table columns are nullable
-- except rowVersion, which has a non-destructive default.
ALTER TABLE "AccountingOrganisationProfile"
  ADD CONSTRAINT "AccountingOrganisationProfile_fiscal_start_check"
    CHECK ("fiscalYearStartMonth" BETWEEN 1 AND 12 AND "fiscalYearStartDay" BETWEEN 1 AND 31),
  ADD CONSTRAINT "AccountingOrganisationProfile_scale_check"
    CHECK (
      "moneyScale" BETWEEN 0 AND 8
      AND "quantityScale" BETWEEN 0 AND 10
      AND "exchangeRateScale" BETWEEN 4 AND 12
      AND "percentageScale" BETWEEN 2 AND 8
    );

ALTER TABLE "AccountingLegalEntity"
  ADD CONSTRAINT "AccountingLegalEntity_effective_dates_check"
    CHECK ("effectiveTo" IS NULL OR "effectiveFrom" IS NULL OR "effectiveTo" >= "effectiveFrom");

ALTER TABLE "AccountingTaxRegistration"
  ADD CONSTRAINT "AccountingTaxRegistration_effective_dates_check"
    CHECK ("effectiveTo" IS NULL OR "effectiveFrom" IS NULL OR "effectiveTo" >= "effectiveFrom");

ALTER TABLE "AccountingPeriod"
  ADD CONSTRAINT "AccountingPeriod_dates_check" CHECK ("endDate" >= "startDate"),
  ADD CONSTRAINT "AccountingPeriod_number_check" CHECK ("periodNumber" BETWEEN 1 AND 99);

ALTER TABLE "AccountingPeriodLockRequest"
  ADD CONSTRAINT "AccountingPeriodLockRequest_actor_check"
    CHECK ("decidedById" IS NULL OR "decidedById" <> "requestedById"),
  ADD CONSTRAINT "AccountingPeriodLockRequest_window_check"
    CHECK ("reopenUntil" IS NULL OR "reopenFrom" IS NULL OR "reopenUntil" > "reopenFrom"),
  ADD CONSTRAINT "AccountingPeriodLockRequest_version_check" CHECK ("rowVersion" > 0);

ALTER TABLE "AccountingCurrency"
  ADD CONSTRAINT "AccountingCurrency_code_check" CHECK ("code" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "AccountingCurrency_decimal_places_check" CHECK ("decimalPlaces" BETWEEN 0 AND 8);

ALTER TABLE "AccountingExchangeRate"
  ADD CONSTRAINT "AccountingExchangeRate_positive_check" CHECK ("rate" > 0),
  ADD CONSTRAINT "AccountingExchangeRate_pair_check" CHECK ("fromCurrencyId" <> "toCurrencyId"),
  ADD CONSTRAINT "AccountingExchangeRate_approval_check"
    CHECK (
      ("status" = 'APPROVED' AND "approvedById" IS NOT NULL AND "approvedAt" IS NOT NULL)
      OR ("status" <> 'APPROVED')
    );

ALTER TABLE "AccountingAccountControl"
  ADD CONSTRAINT "AccountingAccountControl_version_check" CHECK ("rowVersion" > 0);

ALTER TABLE "AccountingDimensionValue"
  ADD CONSTRAINT "AccountingDimensionValue_effective_dates_check"
    CHECK ("effectiveTo" IS NULL OR "effectiveFrom" IS NULL OR "effectiveTo" >= "effectiveFrom"),
  ADD CONSTRAINT "AccountingDimensionValue_canonical_pair_check"
    CHECK (("canonicalType" IS NULL) = ("canonicalId" IS NULL));

ALTER TABLE "AccountingApprovalPolicy"
  ADD CONSTRAINT "AccountingApprovalPolicy_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "AccountingApprovalPolicy_effective_dates_check"
    CHECK ("effectiveTo" IS NULL OR "effectiveFrom" IS NULL OR "effectiveTo" >= "effectiveFrom");

ALTER TABLE "AccountingNumberSeries"
  ADD CONSTRAINT "AccountingNumberSeries_next_number_check" CHECK ("nextNumber" > 0),
  ADD CONSTRAINT "AccountingNumberSeries_padding_check" CHECK ("padding" BETWEEN 1 AND 20),
  ADD CONSTRAINT "AccountingNumberSeries_effective_dates_check"
    CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom"),
  ADD CONSTRAINT "AccountingNumberSeries_version_check" CHECK ("rowVersion" > 0);

ALTER TABLE "AccountingIntegrationInbox"
  ADD CONSTRAINT "AccountingIntegrationInbox_version_check" CHECK ("messageVersion" > 0),
  ADD CONSTRAINT "AccountingIntegrationInbox_attempt_check" CHECK ("attemptCount" >= 0);

ALTER TABLE "AccountingIntegrationOutbox"
  ADD CONSTRAINT "AccountingIntegrationOutbox_version_check" CHECK ("eventVersion" > 0),
  ADD CONSTRAINT "AccountingIntegrationOutbox_attempt_check" CHECK ("attemptCount" >= 0);

ALTER TABLE "JournalEntry"
  ADD CONSTRAINT "JournalEntry_row_version_check" CHECK ("rowVersion" > 0),
  ADD CONSTRAINT "JournalEntry_source_version_check" CHECK ("sourceVersion" IS NULL OR "sourceVersion" > 0),
  ADD CONSTRAINT "JournalEntry_reversal_self_check" CHECK ("reversalOfId" IS NULL OR "reversalOfId" <> "id");

ALTER TABLE "JournalEntryLine"
  ADD CONSTRAINT "JournalEntryLine_transaction_amounts_check"
    CHECK (
      COALESCE("transactionDebit", 0) >= 0
      AND COALESCE("transactionCredit", 0) >= 0
      AND NOT (
        COALESCE("transactionDebit", 0) > 0
        AND COALESCE("transactionCredit", 0) > 0
      )
    ),
  ADD CONSTRAINT "JournalEntryLine_exchange_rate_check"
    CHECK ("exchangeRate" IS NULL OR "exchangeRate" > 0);

-- PostgreSQL treats NULL values as distinct in normal unique indexes. These
-- partial indexes close the tenant-scoped cardinality gaps intentionally left
-- nullable by the Prisma model.
CREATE UNIQUE INDEX "AccountingLegalEntity_one_default_per_org"
  ON "AccountingLegalEntity" ("orgId") WHERE "isDefault" = true;

CREATE UNIQUE INDEX "AccountingCurrency_one_functional_per_org"
  ON "AccountingCurrency" ("orgId") WHERE "isFunctional" = true;

CREATE UNIQUE INDEX "AccountingApprovalPolicy_one_active_per_document"
  ON "AccountingApprovalPolicy" ("orgId", "documentType") WHERE "isActive" = true;

CREATE UNIQUE INDEX "AccountingNumberSeries_null_registration_key"
  ON "AccountingNumberSeries" ("orgId", "documentType", "effectiveFrom")
  WHERE "taxRegistrationId" IS NULL;

-- Cross-table organization checks supplement foreign keys so a valid ID from
-- another tenant cannot be attached to an Accounting row.
CREATE FUNCTION "enforce_accounting_tenant_links"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  linked_org TEXT;
  second_linked_org TEXT;
BEGIN
  IF TG_TABLE_NAME = 'AccountingTaxRegistration' THEN
    SELECT "orgId" INTO linked_org FROM "AccountingLegalEntity" WHERE "id" = NEW."legalEntityId";
  ELSIF TG_TABLE_NAME = 'AccountingPeriod' THEN
    SELECT "orgId" INTO linked_org FROM "FiscalYear" WHERE "id" = NEW."fiscalYearId";
  ELSIF TG_TABLE_NAME = 'AccountingPeriodLockRequest' THEN
    SELECT "orgId" INTO linked_org FROM "AccountingPeriod" WHERE "id" = NEW."periodId";
    SELECT "orgId" INTO second_linked_org FROM "User" WHERE "id" = NEW."requestedById";
    IF second_linked_org IS DISTINCT FROM NEW."orgId" THEN
      RAISE EXCEPTION 'Accounting tenant boundary violation for requestedById';
    END IF;
    IF NEW."decidedById" IS NOT NULL THEN
      SELECT "orgId" INTO second_linked_org FROM "User" WHERE "id" = NEW."decidedById";
      IF second_linked_org IS DISTINCT FROM NEW."orgId" THEN
        RAISE EXCEPTION 'Accounting tenant boundary violation for decidedById';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'AccountingExchangeRate' THEN
    SELECT "orgId" INTO linked_org FROM "AccountingCurrency" WHERE "id" = NEW."fromCurrencyId";
    SELECT "orgId" INTO second_linked_org FROM "AccountingCurrency" WHERE "id" = NEW."toCurrencyId";
    IF second_linked_org IS DISTINCT FROM NEW."orgId" THEN
      RAISE EXCEPTION 'Accounting tenant boundary violation for toCurrencyId';
    END IF;
    IF NEW."approvedById" IS NOT NULL THEN
      SELECT "orgId" INTO second_linked_org FROM "User" WHERE "id" = NEW."approvedById";
      IF second_linked_org IS DISTINCT FROM NEW."orgId" THEN
        RAISE EXCEPTION 'Accounting tenant boundary violation for approvedById';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'AccountingAccountControl' THEN
    SELECT "orgId" INTO linked_org FROM "Account" WHERE "id" = NEW."accountId";
    IF NEW."defaultCurrencyId" IS NOT NULL THEN
      SELECT "orgId" INTO second_linked_org FROM "AccountingCurrency" WHERE "id" = NEW."defaultCurrencyId";
      IF second_linked_org IS DISTINCT FROM NEW."orgId" THEN
        RAISE EXCEPTION 'Accounting tenant boundary violation for defaultCurrencyId';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'AccountingDimensionValue' THEN
    SELECT "orgId" INTO linked_org FROM "AccountingDimensionDefinition" WHERE "id" = NEW."definitionId";
  ELSIF TG_TABLE_NAME = 'AccountingJournalLineDimension' THEN
    SELECT je."orgId" INTO linked_org
    FROM "JournalEntryLine" jel
    JOIN "JournalEntry" je ON je."id" = jel."journalEntryId"
    WHERE jel."id" = NEW."journalEntryLineId";
    SELECT "orgId" INTO second_linked_org FROM "AccountingDimensionDefinition" WHERE "id" = NEW."definitionId";
    IF second_linked_org IS DISTINCT FROM NEW."orgId" THEN
      RAISE EXCEPTION 'Accounting tenant boundary violation for definitionId';
    END IF;
    SELECT "orgId" INTO second_linked_org FROM "AccountingDimensionValue" WHERE "id" = NEW."dimensionValueId";
    IF second_linked_org IS DISTINCT FROM NEW."orgId" THEN
      RAISE EXCEPTION 'Accounting tenant boundary violation for dimensionValueId';
    END IF;
  ELSIF TG_TABLE_NAME = 'AccountingNumberSeries' THEN
    IF NEW."taxRegistrationId" IS NOT NULL THEN
      SELECT "orgId" INTO linked_org FROM "AccountingTaxRegistration" WHERE "id" = NEW."taxRegistrationId";
    ELSE
      linked_org := NEW."orgId";
    END IF;
  ELSIF TG_TABLE_NAME = 'JournalEntry' THEN
    IF NEW."accountingPeriodId" IS NOT NULL THEN
      SELECT "orgId" INTO linked_org FROM "AccountingPeriod" WHERE "id" = NEW."accountingPeriodId";
    ELSE
      linked_org := NEW."orgId";
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported accounting tenant guard table: %', TG_TABLE_NAME;
  END IF;

  IF linked_org IS DISTINCT FROM NEW."orgId" THEN
    RAISE EXCEPTION 'Accounting tenant boundary violation for %', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "AccountingTaxRegistration_tenant_guard"
  BEFORE INSERT OR UPDATE ON "AccountingTaxRegistration"
  FOR EACH ROW EXECUTE FUNCTION "enforce_accounting_tenant_links"();
CREATE TRIGGER "AccountingPeriod_tenant_guard"
  BEFORE INSERT OR UPDATE ON "AccountingPeriod"
  FOR EACH ROW EXECUTE FUNCTION "enforce_accounting_tenant_links"();
CREATE TRIGGER "AccountingPeriodLockRequest_tenant_guard"
  BEFORE INSERT OR UPDATE ON "AccountingPeriodLockRequest"
  FOR EACH ROW EXECUTE FUNCTION "enforce_accounting_tenant_links"();
CREATE TRIGGER "AccountingExchangeRate_tenant_guard"
  BEFORE INSERT OR UPDATE ON "AccountingExchangeRate"
  FOR EACH ROW EXECUTE FUNCTION "enforce_accounting_tenant_links"();
CREATE TRIGGER "AccountingAccountControl_tenant_guard"
  BEFORE INSERT OR UPDATE ON "AccountingAccountControl"
  FOR EACH ROW EXECUTE FUNCTION "enforce_accounting_tenant_links"();
CREATE TRIGGER "AccountingDimensionValue_tenant_guard"
  BEFORE INSERT OR UPDATE ON "AccountingDimensionValue"
  FOR EACH ROW EXECUTE FUNCTION "enforce_accounting_tenant_links"();
CREATE TRIGGER "AccountingJournalLineDimension_tenant_guard"
  BEFORE INSERT OR UPDATE ON "AccountingJournalLineDimension"
  FOR EACH ROW EXECUTE FUNCTION "enforce_accounting_tenant_links"();
CREATE TRIGGER "AccountingNumberSeries_tenant_guard"
  BEFORE INSERT OR UPDATE ON "AccountingNumberSeries"
  FOR EACH ROW EXECUTE FUNCTION "enforce_accounting_tenant_links"();
CREATE TRIGGER "JournalEntry_accounting_period_tenant_guard"
  BEFORE INSERT OR UPDATE OF "orgId", "accountingPeriodId" ON "JournalEntry"
  FOR EACH ROW EXECUTE FUNCTION "enforce_accounting_tenant_links"();

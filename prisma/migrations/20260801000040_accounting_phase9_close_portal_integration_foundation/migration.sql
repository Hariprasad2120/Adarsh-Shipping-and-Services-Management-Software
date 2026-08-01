-- Accounting Phase 9.10-9.12 integration, close, report export, and portal publication foundation

CREATE TABLE "AccountingSourceMappingProfile" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT,
  "sourceSystem" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "profileCode" TEXT NOT NULL,
  "targetModule" TEXT NOT NULL,
  "targetDocumentType" TEXT,
  "configuration" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingSourceMappingProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingSourceMappingProfile_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingSourceMappingProfile_legal_entity_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingSourceMappingProfile_scope_key"
  ON "AccountingSourceMappingProfile"("orgId", "legalEntityId", "sourceSystem", "sourceType", "profileCode");

CREATE INDEX "AccountingSourceMappingProfile_active_idx"
  ON "AccountingSourceMappingProfile"("orgId", "sourceSystem", "sourceType", "isActive");

CREATE TABLE "AccountingPeriodCloseRun" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "accountingPeriodId" TEXT NOT NULL,
  "closeDate" DATE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "checklist" JSONB,
  "reportBundle" JSONB,
  "notes" TEXT,
  "closedById" TEXT,
  "closedAt" TIMESTAMP(3),
  "reopenedById" TEXT,
  "reopenedAt" TIMESTAMP(3),
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingPeriodCloseRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingPeriodCloseRun_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingPeriodCloseRun_legal_entity_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingPeriodCloseRun_period_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "AccountingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingPeriodCloseRun_scope_key"
  ON "AccountingPeriodCloseRun"("orgId", "legalEntityId", "accountingPeriodId");

CREATE INDEX "AccountingPeriodCloseRun_status_idx"
  ON "AccountingPeriodCloseRun"("orgId", "status", "closeDate");

CREATE TABLE "AccountingReportExportProfile" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT,
  "reportCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "exportFormat" TEXT NOT NULL,
  "deliveryMode" TEXT NOT NULL,
  "filters" JSONB,
  "isPortalVisible" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingReportExportProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingReportExportProfile_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingReportExportProfile_legal_entity_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingReportExportProfile_scope_key"
  ON "AccountingReportExportProfile"("orgId", "legalEntityId", "reportCode", "name");

CREATE INDEX "AccountingReportExportProfile_active_idx"
  ON "AccountingReportExportProfile"("orgId", "reportCode", "isActive");

CREATE TABLE "AccountingPortalPublicationProfile" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT,
  "documentType" TEXT NOT NULL,
  "audienceType" TEXT NOT NULL,
  "exportProfileId" TEXT,
  "deliveryMode" TEXT NOT NULL,
  "retentionDays" INTEGER,
  "configuration" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingPortalPublicationProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingPortalPublicationProfile_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingPortalPublicationProfile_legal_entity_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingPortalPublicationProfile_export_profile_fkey" FOREIGN KEY ("exportProfileId") REFERENCES "AccountingReportExportProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingPortalPublicationProfile_scope_key"
  ON "AccountingPortalPublicationProfile"("orgId", "legalEntityId", "documentType", "audienceType");

CREATE INDEX "AccountingPortalPublicationProfile_active_idx"
  ON "AccountingPortalPublicationProfile"("orgId", "audienceType", "isActive");

CREATE INDEX "AccountingPortalPublicationProfile_exportProfileId_idx"
  ON "AccountingPortalPublicationProfile"("exportProfileId");

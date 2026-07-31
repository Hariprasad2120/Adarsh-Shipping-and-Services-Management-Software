-- CreateEnum
CREATE TYPE "ChaCustomsMasterType" AS ENUM ('RITC_TARIFF', 'CESS_RATE', 'RODTEP', 'RODTEP_EOU', 'ROSCTL', 'DRAWBACK', 'SCHEME_CODE', 'SINGLE_WINDOW_CTH', 'AIDC', 'BCD', 'MASTER_NOTIFICATION', 'SUPPORTING_DOCUMENT', 'UOM');

-- CreateEnum
CREATE TYPE "ChaCustomsMasterSourceType" AS ENUM ('LEGACY_IMPORT_MASTER', 'XLSX_CSV_UPLOAD', 'MANUAL_ADMINISTRATION', 'VERIFIED_EXTERNAL_INTEGRATION', 'CONTROLLED_SEED_FIXTURE');

-- CreateEnum
CREATE TYPE "ChaCustomsMasterImportStatus" AS ENUM ('RECEIVED', 'VALIDATING', 'DRY_RUN_READY', 'IMPORTING', 'COMPLETED', 'COMPLETED_WITH_REJECTIONS', 'FAILED', 'ROLLED_BACK', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ChaCustomsMasterRecordStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ChaCustomsMasterValidationSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "ChaCustomsMasterImportRun" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "masterType" "ChaCustomsMasterType" NOT NULL,
    "sourceType" "ChaCustomsMasterSourceType" NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceReference" TEXT,
    "sourcePublicationDate" TIMESTAMP(3),
    "sourceEffectiveDate" TIMESTAMP(3),
    "datasetVersion" TEXT NOT NULL,
    "fileChecksum" TEXT,
    "status" "ChaCustomsMasterImportStatus" NOT NULL DEFAULT 'RECEIVED',
    "receivedRowCount" INTEGER NOT NULL DEFAULT 0,
    "validRowCount" INTEGER NOT NULL DEFAULT 0,
    "insertedRowCount" INTEGER NOT NULL DEFAULT 0,
    "updatedRowCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedRowCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedRowCount" INTEGER NOT NULL DEFAULT 0,
    "importedById" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "supersededByRunId" TEXT,
    "supersedesRunId" TEXT,
    "rolledBackAt" TIMESTAMP(3),
    "rollbackReason" TEXT,
    "sourceMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaCustomsMasterImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaCustomsMasterValidationError" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "importRunId" TEXT NOT NULL,
    "rowNumber" INTEGER,
    "field" TEXT,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "ChaCustomsMasterValidationSeverity" NOT NULL DEFAULT 'ERROR',
    "rawValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChaCustomsMasterValidationError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaRitcTariffMaster" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sourceRunId" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "tariffItem" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "uom" TEXT,
    "importPolicy" TEXT,
    "importPolicyCondition" TEXT,
    "exportPolicy" TEXT,
    "exportPolicyCondition" TEXT,
    "sims" BOOLEAN NOT NULL DEFAULT false,
    "nfmims" BOOLEAN NOT NULL DEFAULT false,
    "pims" BOOLEAN NOT NULL DEFAULT false,
    "bis" BOOLEAN NOT NULL DEFAULT false,
    "tobacco" BOOLEAN NOT NULL DEFAULT false,
    "status" "ChaCustomsMasterRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "rawSnapshot" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaRitcTariffMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaCessRateMaster" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sourceRunId" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "ritcCode" TEXT NOT NULL,
    "cessSerialNo" TEXT NOT NULL,
    "cessFlag" TEXT,
    "tarValue" DECIMAL(28,8),
    "tarAccountingUnit" TEXT,
    "cessRateAdvance" DECIMAL(28,8),
    "cessValue" DECIMAL(28,8),
    "cessAccountingUnit" TEXT,
    "status" "ChaCustomsMasterRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "rawSnapshot" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaCessRateMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaRodtepRateMaster" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sourceRunId" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "ritcNo" TEXT NOT NULL,
    "description" TEXT,
    "rate" DECIMAL(28,8),
    "ratePer" DECIMAL(28,8),
    "uqc" TEXT,
    "capRate" DECIMAL(28,8),
    "status" "ChaCustomsMasterRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "rawSnapshot" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaRodtepRateMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaRodtepEouRateMaster" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sourceRunId" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "ritcNo" TEXT NOT NULL,
    "description" TEXT,
    "rate" DECIMAL(28,8),
    "ratePer" DECIMAL(28,8),
    "uqc" TEXT,
    "capRate" DECIMAL(28,8),
    "status" "ChaCustomsMasterRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "rawSnapshot" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaRodtepEouRateMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaRosctlRateMaster" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sourceRunId" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "rosctlCode" TEXT NOT NULL,
    "description" TEXT,
    "percentage" DECIMAL(28,8),
    "rateAmount" DECIMAL(28,8),
    "accountingUnit" TEXT,
    "schedule" TEXT NOT NULL,
    "status" "ChaCustomsMasterRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "rawSnapshot" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaRosctlRateMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaDrawbackRateMaster" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sourceRunId" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "dbkHeader" TEXT,
    "dbkSerialNo" TEXT NOT NULL,
    "description" TEXT,
    "rateAdvance" DECIMAL(28,8),
    "specificValue" DECIMAL(28,8),
    "accountingUnit" TEXT,
    "perUnit" TEXT,
    "status" "ChaCustomsMasterRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "rawSnapshot" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaDrawbackRateMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaSchemeCodeMaster" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sourceRunId" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "eximCode" TEXT NOT NULL,
    "exportSchemeName" TEXT,
    "importSchemeName" TEXT,
    "schemeType" TEXT NOT NULL DEFAULT 'GENERAL',
    "applicableExpSchemes" TEXT,
    "description" TEXT,
    "expLicense" BOOLEAN NOT NULL DEFAULT false,
    "impLicense" BOOLEAN NOT NULL DEFAULT false,
    "licenseDepb" BOOLEAN NOT NULL DEFAULT false,
    "expEou" BOOLEAN NOT NULL DEFAULT false,
    "expDfiaLicense" BOOLEAN NOT NULL DEFAULT false,
    "expDrawback" BOOLEAN NOT NULL DEFAULT false,
    "status" "ChaCustomsMasterRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "rawSnapshot" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaSchemeCodeMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaSingleWindowCthMaster" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sourceRunId" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "fromCth" TEXT NOT NULL,
    "toCth" TEXT,
    "agencyName" TEXT,
    "agencyCode" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "remarks" TEXT,
    "status" "ChaCustomsMasterRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "rawSnapshot" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaSingleWindowCthMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaAidcRateMaster" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sourceRunId" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "notificationNo" TEXT NOT NULL,
    "notificationDate" TIMESTAMP(3),
    "serialNo" TEXT NOT NULL,
    "cth" TEXT NOT NULL,
    "itemDescription" TEXT,
    "rate" DECIMAL(28,8),
    "amount" DECIMAL(28,8),
    "uqc" TEXT,
    "flag" TEXT,
    "condition" TEXT,
    "cvdRate" DECIMAL(28,8),
    "cvdAmount" DECIMAL(28,8),
    "cvdUqc" TEXT,
    "cvdFlag" TEXT,
    "acdFlag" TEXT,
    "adFlag" TEXT,
    "status" "ChaCustomsMasterRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "rawSnapshot" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaAidcRateMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaBcdRateMaster" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sourceRunId" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "cth" TEXT NOT NULL,
    "itemDescription" TEXT,
    "bcdFlag" TEXT,
    "bcdRate" DECIMAL(28,8),
    "amount" DECIMAL(28,8),
    "uqc" TEXT,
    "preferential" TEXT,
    "pFlag" TEXT,
    "pRate" DECIMAL(28,8),
    "pAmount" DECIMAL(28,8),
    "pUqc" TEXT,
    "sUqc" TEXT,
    "status" "ChaCustomsMasterRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "rawSnapshot" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaBcdRateMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaCustomsNotificationMaster" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sourceRunId" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "notificationNo" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "notificationDate" TIMESTAMP(3),
    "serialNo" TEXT NOT NULL,
    "subSerialNo" TEXT NOT NULL DEFAULT '',
    "pflg" TEXT,
    "category" TEXT,
    "quota" TEXT,
    "port" TEXT,
    "countryFta" TEXT,
    "cth" TEXT,
    "listItem" TEXT,
    "itemDescription" TEXT,
    "rate" DECIMAL(28,8),
    "amount" DECIMAL(28,8),
    "uqc" TEXT,
    "flag" TEXT,
    "condition" TEXT,
    "cvdRate" DECIMAL(28,8),
    "cvdAmount" DECIMAL(28,8),
    "cvdUqc" TEXT,
    "cvdFlag" TEXT,
    "amendNotification" TEXT,
    "amendYear" TEXT,
    "amendSerialNo" TEXT,
    "adFlag" TEXT,
    "preferentialDutyFlag" TEXT,
    "bcdAmount" DECIMAL(28,8),
    "bcdUqc" TEXT,
    "bondCode" TEXT,
    "schemeCode" TEXT,
    "drawbackType" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "status" "ChaCustomsMasterRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "rawSnapshot" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaCustomsNotificationMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaSupportingDocumentMaster" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sourceRunId" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "documentCode" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "invoiceSerialNo" INTEGER,
    "itemSerialNo" INTEGER,
    "documentDescription" TEXT,
    "status" "ChaCustomsMasterRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "rawSnapshot" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaSupportingDocumentMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaUomMaster" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sourceRunId" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "quantityCode" TEXT NOT NULL,
    "quantityDescription" TEXT NOT NULL,
    "quantityType" TEXT,
    "status" "ChaCustomsMasterRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "rawSnapshot" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaUomMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChaCustomsMasterImportRun_orgId_masterType_status_idx" ON "ChaCustomsMasterImportRun"("orgId", "masterType", "status");

-- CreateIndex
CREATE INDEX "ChaCustomsMasterImportRun_orgId_sourceEffectiveDate_idx" ON "ChaCustomsMasterImportRun"("orgId", "sourceEffectiveDate");

-- CreateIndex
CREATE INDEX "ChaCustomsMasterImportRun_orgId_sourcePublicationDate_idx" ON "ChaCustomsMasterImportRun"("orgId", "sourcePublicationDate");

-- CreateIndex
CREATE INDEX "ChaCustomsMasterImportRun_status_startedAt_idx" ON "ChaCustomsMasterImportRun"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChaCustomsMasterImportRun_orgId_masterType_datasetVersion_key" ON "ChaCustomsMasterImportRun"("orgId", "masterType", "datasetVersion");

-- CreateIndex
CREATE INDEX "ChaCustomsMasterValidationError_orgId_importRunId_idx" ON "ChaCustomsMasterValidationError"("orgId", "importRunId");

-- CreateIndex
CREATE INDEX "ChaCustomsMasterValidationError_orgId_code_idx" ON "ChaCustomsMasterValidationError"("orgId", "code");

-- CreateIndex
CREATE INDEX "ChaCustomsMasterValidationError_importRunId_rowNumber_idx" ON "ChaCustomsMasterValidationError"("importRunId", "rowNumber");

-- CreateIndex
CREATE INDEX "ChaRitcTariffMaster_orgId_tariffItem_idx" ON "ChaRitcTariffMaster"("orgId", "tariffItem");

-- CreateIndex
CREATE INDEX "ChaRitcTariffMaster_orgId_status_idx" ON "ChaRitcTariffMaster"("orgId", "status");

-- CreateIndex
CREATE INDEX "ChaRitcTariffMaster_orgId_effectiveFrom_effectiveTo_idx" ON "ChaRitcTariffMaster"("orgId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "ChaRitcTariffMaster_orgId_description_idx" ON "ChaRitcTariffMaster"("orgId", "description");

-- CreateIndex
CREATE INDEX "ChaRitcTariffMaster_sourceRunId_idx" ON "ChaRitcTariffMaster"("sourceRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaRitcTariffMaster_orgId_tariffItem_datasetVersion_key" ON "ChaRitcTariffMaster"("orgId", "tariffItem", "datasetVersion");

-- CreateIndex
CREATE INDEX "ChaCessRateMaster_orgId_ritcCode_idx" ON "ChaCessRateMaster"("orgId", "ritcCode");

-- CreateIndex
CREATE INDEX "ChaCessRateMaster_orgId_status_idx" ON "ChaCessRateMaster"("orgId", "status");

-- CreateIndex
CREATE INDEX "ChaCessRateMaster_orgId_effectiveFrom_effectiveTo_idx" ON "ChaCessRateMaster"("orgId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "ChaCessRateMaster_sourceRunId_idx" ON "ChaCessRateMaster"("sourceRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaCessRateMaster_orgId_ritcCode_cessSerialNo_datasetVersio_key" ON "ChaCessRateMaster"("orgId", "ritcCode", "cessSerialNo", "datasetVersion");

-- CreateIndex
CREATE INDEX "ChaRodtepRateMaster_orgId_ritcNo_idx" ON "ChaRodtepRateMaster"("orgId", "ritcNo");

-- CreateIndex
CREATE INDEX "ChaRodtepRateMaster_orgId_status_idx" ON "ChaRodtepRateMaster"("orgId", "status");

-- CreateIndex
CREATE INDEX "ChaRodtepRateMaster_orgId_effectiveFrom_effectiveTo_idx" ON "ChaRodtepRateMaster"("orgId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "ChaRodtepRateMaster_orgId_description_idx" ON "ChaRodtepRateMaster"("orgId", "description");

-- CreateIndex
CREATE INDEX "ChaRodtepRateMaster_sourceRunId_idx" ON "ChaRodtepRateMaster"("sourceRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaRodtepRateMaster_orgId_ritcNo_datasetVersion_key" ON "ChaRodtepRateMaster"("orgId", "ritcNo", "datasetVersion");

-- CreateIndex
CREATE INDEX "ChaRodtepEouRateMaster_orgId_ritcNo_idx" ON "ChaRodtepEouRateMaster"("orgId", "ritcNo");

-- CreateIndex
CREATE INDEX "ChaRodtepEouRateMaster_orgId_status_idx" ON "ChaRodtepEouRateMaster"("orgId", "status");

-- CreateIndex
CREATE INDEX "ChaRodtepEouRateMaster_orgId_effectiveFrom_effectiveTo_idx" ON "ChaRodtepEouRateMaster"("orgId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "ChaRodtepEouRateMaster_orgId_description_idx" ON "ChaRodtepEouRateMaster"("orgId", "description");

-- CreateIndex
CREATE INDEX "ChaRodtepEouRateMaster_sourceRunId_idx" ON "ChaRodtepEouRateMaster"("sourceRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaRodtepEouRateMaster_orgId_ritcNo_datasetVersion_key" ON "ChaRodtepEouRateMaster"("orgId", "ritcNo", "datasetVersion");

-- CreateIndex
CREATE INDEX "ChaRosctlRateMaster_orgId_rosctlCode_idx" ON "ChaRosctlRateMaster"("orgId", "rosctlCode");

-- CreateIndex
CREATE INDEX "ChaRosctlRateMaster_orgId_status_idx" ON "ChaRosctlRateMaster"("orgId", "status");

-- CreateIndex
CREATE INDEX "ChaRosctlRateMaster_orgId_effectiveFrom_effectiveTo_idx" ON "ChaRosctlRateMaster"("orgId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "ChaRosctlRateMaster_orgId_description_idx" ON "ChaRosctlRateMaster"("orgId", "description");

-- CreateIndex
CREATE INDEX "ChaRosctlRateMaster_sourceRunId_idx" ON "ChaRosctlRateMaster"("sourceRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaRosctlRateMaster_orgId_rosctlCode_schedule_datasetVersio_key" ON "ChaRosctlRateMaster"("orgId", "rosctlCode", "schedule", "datasetVersion");

-- CreateIndex
CREATE INDEX "ChaDrawbackRateMaster_orgId_dbkSerialNo_idx" ON "ChaDrawbackRateMaster"("orgId", "dbkSerialNo");

-- CreateIndex
CREATE INDEX "ChaDrawbackRateMaster_orgId_status_idx" ON "ChaDrawbackRateMaster"("orgId", "status");

-- CreateIndex
CREATE INDEX "ChaDrawbackRateMaster_orgId_effectiveFrom_effectiveTo_idx" ON "ChaDrawbackRateMaster"("orgId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "ChaDrawbackRateMaster_orgId_description_idx" ON "ChaDrawbackRateMaster"("orgId", "description");

-- CreateIndex
CREATE INDEX "ChaDrawbackRateMaster_sourceRunId_idx" ON "ChaDrawbackRateMaster"("sourceRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaDrawbackRateMaster_orgId_dbkSerialNo_datasetVersion_key" ON "ChaDrawbackRateMaster"("orgId", "dbkSerialNo", "datasetVersion");

-- CreateIndex
CREATE INDEX "ChaSchemeCodeMaster_orgId_eximCode_idx" ON "ChaSchemeCodeMaster"("orgId", "eximCode");

-- CreateIndex
CREATE INDEX "ChaSchemeCodeMaster_orgId_status_idx" ON "ChaSchemeCodeMaster"("orgId", "status");

-- CreateIndex
CREATE INDEX "ChaSchemeCodeMaster_orgId_effectiveFrom_effectiveTo_idx" ON "ChaSchemeCodeMaster"("orgId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "ChaSchemeCodeMaster_orgId_description_idx" ON "ChaSchemeCodeMaster"("orgId", "description");

-- CreateIndex
CREATE INDEX "ChaSchemeCodeMaster_sourceRunId_idx" ON "ChaSchemeCodeMaster"("sourceRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaSchemeCodeMaster_orgId_eximCode_schemeType_datasetVersio_key" ON "ChaSchemeCodeMaster"("orgId", "eximCode", "schemeType", "datasetVersion");

-- CreateIndex
CREATE INDEX "ChaSingleWindowCthMaster_orgId_fromCth_idx" ON "ChaSingleWindowCthMaster"("orgId", "fromCth");

-- CreateIndex
CREATE INDEX "ChaSingleWindowCthMaster_orgId_status_idx" ON "ChaSingleWindowCthMaster"("orgId", "status");

-- CreateIndex
CREATE INDEX "ChaSingleWindowCthMaster_orgId_effectiveFrom_effectiveTo_idx" ON "ChaSingleWindowCthMaster"("orgId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "ChaSingleWindowCthMaster_orgId_agencyCode_idx" ON "ChaSingleWindowCthMaster"("orgId", "agencyCode");

-- CreateIndex
CREATE INDEX "ChaSingleWindowCthMaster_sourceRunId_idx" ON "ChaSingleWindowCthMaster"("sourceRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaSingleWindowCthMaster_orgId_fromCth_agencyCode_datasetVe_key" ON "ChaSingleWindowCthMaster"("orgId", "fromCth", "agencyCode", "datasetVersion");

-- CreateIndex
CREATE INDEX "ChaAidcRateMaster_orgId_cth_idx" ON "ChaAidcRateMaster"("orgId", "cth");

-- CreateIndex
CREATE INDEX "ChaAidcRateMaster_orgId_notificationNo_serialNo_idx" ON "ChaAidcRateMaster"("orgId", "notificationNo", "serialNo");

-- CreateIndex
CREATE INDEX "ChaAidcRateMaster_orgId_status_idx" ON "ChaAidcRateMaster"("orgId", "status");

-- CreateIndex
CREATE INDEX "ChaAidcRateMaster_orgId_effectiveFrom_effectiveTo_idx" ON "ChaAidcRateMaster"("orgId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "ChaAidcRateMaster_orgId_itemDescription_idx" ON "ChaAidcRateMaster"("orgId", "itemDescription");

-- CreateIndex
CREATE INDEX "ChaAidcRateMaster_sourceRunId_idx" ON "ChaAidcRateMaster"("sourceRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaAidcRateMaster_orgId_notificationNo_serialNo_cth_dataset_key" ON "ChaAidcRateMaster"("orgId", "notificationNo", "serialNo", "cth", "datasetVersion");

-- CreateIndex
CREATE INDEX "ChaBcdRateMaster_orgId_cth_idx" ON "ChaBcdRateMaster"("orgId", "cth");

-- CreateIndex
CREATE INDEX "ChaBcdRateMaster_orgId_status_idx" ON "ChaBcdRateMaster"("orgId", "status");

-- CreateIndex
CREATE INDEX "ChaBcdRateMaster_orgId_effectiveFrom_effectiveTo_idx" ON "ChaBcdRateMaster"("orgId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "ChaBcdRateMaster_orgId_itemDescription_idx" ON "ChaBcdRateMaster"("orgId", "itemDescription");

-- CreateIndex
CREATE INDEX "ChaBcdRateMaster_sourceRunId_idx" ON "ChaBcdRateMaster"("sourceRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaBcdRateMaster_orgId_cth_datasetVersion_key" ON "ChaBcdRateMaster"("orgId", "cth", "datasetVersion");

-- CreateIndex
CREATE INDEX "ChaCustomsNotificationMaster_orgId_notificationNo_serialNo_idx" ON "ChaCustomsNotificationMaster"("orgId", "notificationNo", "serialNo");

-- CreateIndex
CREATE INDEX "ChaCustomsNotificationMaster_orgId_cth_idx" ON "ChaCustomsNotificationMaster"("orgId", "cth");

-- CreateIndex
CREATE INDEX "ChaCustomsNotificationMaster_orgId_status_idx" ON "ChaCustomsNotificationMaster"("orgId", "status");

-- CreateIndex
CREATE INDEX "ChaCustomsNotificationMaster_orgId_effectiveFrom_effectiveT_idx" ON "ChaCustomsNotificationMaster"("orgId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "ChaCustomsNotificationMaster_orgId_itemDescription_idx" ON "ChaCustomsNotificationMaster"("orgId", "itemDescription");

-- CreateIndex
CREATE INDEX "ChaCustomsNotificationMaster_sourceRunId_idx" ON "ChaCustomsNotificationMaster"("sourceRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaCustomsNotificationMaster_orgId_notificationNo_notificat_key" ON "ChaCustomsNotificationMaster"("orgId", "notificationNo", "notificationType", "serialNo", "subSerialNo", "datasetVersion");

-- CreateIndex
CREATE INDEX "ChaSupportingDocumentMaster_orgId_documentCode_idx" ON "ChaSupportingDocumentMaster"("orgId", "documentCode");

-- CreateIndex
CREATE INDEX "ChaSupportingDocumentMaster_orgId_status_idx" ON "ChaSupportingDocumentMaster"("orgId", "status");

-- CreateIndex
CREATE INDEX "ChaSupportingDocumentMaster_orgId_effectiveFrom_effectiveTo_idx" ON "ChaSupportingDocumentMaster"("orgId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "ChaSupportingDocumentMaster_orgId_documentName_idx" ON "ChaSupportingDocumentMaster"("orgId", "documentName");

-- CreateIndex
CREATE INDEX "ChaSupportingDocumentMaster_sourceRunId_idx" ON "ChaSupportingDocumentMaster"("sourceRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaSupportingDocumentMaster_orgId_documentCode_invoiceSeria_key" ON "ChaSupportingDocumentMaster"("orgId", "documentCode", "invoiceSerialNo", "itemSerialNo", "datasetVersion");

-- CreateIndex
CREATE INDEX "ChaUomMaster_orgId_quantityCode_idx" ON "ChaUomMaster"("orgId", "quantityCode");

-- CreateIndex
CREATE INDEX "ChaUomMaster_orgId_status_idx" ON "ChaUomMaster"("orgId", "status");

-- CreateIndex
CREATE INDEX "ChaUomMaster_orgId_effectiveFrom_effectiveTo_idx" ON "ChaUomMaster"("orgId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "ChaUomMaster_orgId_quantityDescription_idx" ON "ChaUomMaster"("orgId", "quantityDescription");

-- CreateIndex
CREATE INDEX "ChaUomMaster_sourceRunId_idx" ON "ChaUomMaster"("sourceRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaUomMaster_orgId_quantityCode_datasetVersion_key" ON "ChaUomMaster"("orgId", "quantityCode", "datasetVersion");

-- AddForeignKey
ALTER TABLE "ChaCustomsMasterImportRun" ADD CONSTRAINT "ChaCustomsMasterImportRun_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaCustomsMasterValidationError" ADD CONSTRAINT "ChaCustomsMasterValidationError_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaCustomsMasterValidationError" ADD CONSTRAINT "ChaCustomsMasterValidationError_importRunId_fkey" FOREIGN KEY ("importRunId") REFERENCES "ChaCustomsMasterImportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaRitcTariffMaster" ADD CONSTRAINT "ChaRitcTariffMaster_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaRitcTariffMaster" ADD CONSTRAINT "ChaRitcTariffMaster_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "ChaCustomsMasterImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaCessRateMaster" ADD CONSTRAINT "ChaCessRateMaster_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaCessRateMaster" ADD CONSTRAINT "ChaCessRateMaster_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "ChaCustomsMasterImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaRodtepRateMaster" ADD CONSTRAINT "ChaRodtepRateMaster_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaRodtepRateMaster" ADD CONSTRAINT "ChaRodtepRateMaster_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "ChaCustomsMasterImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaRodtepEouRateMaster" ADD CONSTRAINT "ChaRodtepEouRateMaster_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaRodtepEouRateMaster" ADD CONSTRAINT "ChaRodtepEouRateMaster_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "ChaCustomsMasterImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaRosctlRateMaster" ADD CONSTRAINT "ChaRosctlRateMaster_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaRosctlRateMaster" ADD CONSTRAINT "ChaRosctlRateMaster_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "ChaCustomsMasterImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaDrawbackRateMaster" ADD CONSTRAINT "ChaDrawbackRateMaster_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaDrawbackRateMaster" ADD CONSTRAINT "ChaDrawbackRateMaster_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "ChaCustomsMasterImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaSchemeCodeMaster" ADD CONSTRAINT "ChaSchemeCodeMaster_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaSchemeCodeMaster" ADD CONSTRAINT "ChaSchemeCodeMaster_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "ChaCustomsMasterImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaSingleWindowCthMaster" ADD CONSTRAINT "ChaSingleWindowCthMaster_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaSingleWindowCthMaster" ADD CONSTRAINT "ChaSingleWindowCthMaster_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "ChaCustomsMasterImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaAidcRateMaster" ADD CONSTRAINT "ChaAidcRateMaster_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaAidcRateMaster" ADD CONSTRAINT "ChaAidcRateMaster_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "ChaCustomsMasterImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaBcdRateMaster" ADD CONSTRAINT "ChaBcdRateMaster_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaBcdRateMaster" ADD CONSTRAINT "ChaBcdRateMaster_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "ChaCustomsMasterImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaCustomsNotificationMaster" ADD CONSTRAINT "ChaCustomsNotificationMaster_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaCustomsNotificationMaster" ADD CONSTRAINT "ChaCustomsNotificationMaster_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "ChaCustomsMasterImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaSupportingDocumentMaster" ADD CONSTRAINT "ChaSupportingDocumentMaster_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaSupportingDocumentMaster" ADD CONSTRAINT "ChaSupportingDocumentMaster_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "ChaCustomsMasterImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaUomMaster" ADD CONSTRAINT "ChaUomMaster_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaUomMaster" ADD CONSTRAINT "ChaUomMaster_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "ChaCustomsMasterImportRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

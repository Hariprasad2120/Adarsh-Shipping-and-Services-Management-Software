-- CreateEnum
CREATE TYPE "ChaCustomsFilingDirection" AS ENUM ('IMPORT', 'EXPORT');

-- CreateEnum
CREATE TYPE "ChaCustomsFilingProfileStatus" AS ENUM ('DRAFT', 'READY_FOR_CHECKLIST', 'CHECKLIST_GENERATED', 'FLAT_FILE_GENERATED', 'SIGNED', 'SUBMITTED', 'ACKNOWLEDGED', 'QUERY', 'REJECTED', 'PROCESSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChaCustomsSubtabStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ChaCustomsArtifactKind" AS ENUM ('CHECKLIST', 'FLAT_FILE');

-- CreateEnum
CREATE TYPE "ChaCustomsArtifactStatus" AS ENUM ('DRAFT', 'GENERATED', 'SIGNED', 'SUPERSEDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChaCustomsExternalSubmissionStatus" AS ENUM ('PENDING', 'SENT', 'ACKNOWLEDGED', 'QUERY', 'REJECTED', 'PROCESSED', 'RETRYABLE', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChaCustomsExternalEventKind" AS ENUM ('REQUEST_PREPARED', 'SUBMITTED', 'ACKNOWLEDGED', 'QUERY_RECEIVED', 'REJECTION_RECEIVED', 'PROCESSED', 'RETRY_SCHEDULED', 'FAILED');

-- CreateTable
CREATE TABLE "ChaCustomsFilingProfile" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "movementDirection" "ChaCustomsFilingDirection" NOT NULL,
    "filingType" TEXT,
    "transportMode" TEXT,
    "customsHouse" TEXT,
    "customsHouseCode" TEXT,
    "customsSiteCode" TEXT,
    "icegateProfileReference" TEXT,
    "currentDraftVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "ChaCustomsFilingProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedById" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockVersion" INTEGER NOT NULL DEFAULT 1,
    "calculationRulesetVersion" TEXT,
    "masterDatasetVersions" JSONB,
    "beMainStatus" "ChaCustomsSubtabStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "igmStatus" "ChaCustomsSubtabStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "importInvoiceStatus" "ChaCustomsSubtabStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "importItemStatus" "ChaCustomsSubtabStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "importDeclarationStatus" "ChaCustomsSubtabStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "importDocumentStatus" "ChaCustomsSubtabStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "sbMainStatus" "ChaCustomsSubtabStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "exportInvoiceStatus" "ChaCustomsSubtabStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "exportItemStatus" "ChaCustomsSubtabStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "exportDocumentStatus" "ChaCustomsSubtabStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "checklistStatus" "ChaCustomsSubtabStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "flatFileStatus" "ChaCustomsSubtabStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaCustomsFilingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaImportFilingHeader" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "beType" TEXT,
    "beNumber" TEXT,
    "beDate" TIMESTAMP(3),
    "examinationDate" TIMESTAMP(3),
    "outOfChargeDate" TIMESTAMP(3),
    "dutyPaidDate" TIMESTAMP(3),
    "deliveredDate" TIMESTAMP(3),
    "filingType" TEXT,
    "warehouseCode" TEXT,
    "warehouseCustomsSiteId" TEXT,
    "packageCount" DECIMAL(20,6),
    "packageCode" TEXT,
    "grossWeight" DECIMAL(20,6),
    "netWeight" DECIMAL(20,6),
    "uom" TEXT,
    "icegateIdSnapshot" TEXT,
    "chaPanSnapshot" TEXT,
    "atpNameSnapshot" TEXT,
    "atpPanSnapshot" TEXT,
    "importerNameSnapshot" TEXT,
    "importerIecSnapshot" TEXT,
    "importerBranchSerialNo" TEXT,
    "importerCategory" TEXT,
    "importerType" TEXT,
    "importerClass" TEXT,
    "importerAddressSnapshot" TEXT,
    "importerCitySnapshot" TEXT,
    "importerStateSnapshot" TEXT,
    "importerPinCodeSnapshot" TEXT,
    "importerAdCodeSnapshot" TEXT,
    "importerOriginState" TEXT,
    "importerGstnType" TEXT,
    "importerTaxRegistrationNo" TEXT,
    "portOfShipment" TEXT,
    "portOfShipmentCode" TEXT,
    "countryOfShipment" TEXT,
    "countryOfShipmentCode" TEXT,
    "portOfOrigin" TEXT,
    "portOfOriginCode" TEXT,
    "countryOfOrigin" TEXT,
    "countryOfOriginCode" TEXT,
    "firstCheck" BOOLEAN NOT NULL DEFAULT false,
    "greenChannel" BOOLEAN NOT NULL DEFAULT false,
    "kacchaBe" BOOLEAN NOT NULL DEFAULT false,
    "provisionalAssessment" BOOLEAN NOT NULL DEFAULT false,
    "highSeaSale" BOOLEAN NOT NULL DEFAULT false,
    "exBond" BOOLEAN NOT NULL DEFAULT false,
    "ucrType" TEXT,
    "ucrNo" TEXT,
    "paymentMethod" TEXT,
    "bondDetailsSnapshot" JSONB,
    "certificateDetailsSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaImportFilingHeader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaImportIgmHeader" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "igmNo" TEXT,
    "fileType" TEXT,
    "igmDate" TIMESTAMP(3),
    "inwardDate" TIMESTAMP(3),
    "gatewayPort" TEXT,
    "gatewayMode" TEXT,
    "marksAndNos" TEXT,
    "section48" BOOLEAN NOT NULL DEFAULT false,
    "section48Text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaImportIgmHeader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaImportIgmBillRow" (
    "id" TEXT NOT NULL,
    "igmHeaderId" TEXT NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "mblNo" TEXT,
    "noMbl" BOOLEAN NOT NULL DEFAULT false,
    "mblDate" TIMESTAMP(3),
    "hblNo" TEXT,
    "hblDate" TIMESTAMP(3),
    "packageCount" DECIMAL(20,6),
    "packageCode" TEXT,
    "grossWeight" DECIMAL(20,6),
    "netWeight" DECIMAL(20,6),
    "uom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaImportIgmBillRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaImportContainer" (
    "id" TEXT NOT NULL,
    "igmHeaderId" TEXT NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "containerNo" TEXT NOT NULL,
    "containerSize" TEXT,
    "sealNo" TEXT,
    "packageCount" DECIMAL(20,6),
    "grossWeight" DECIMAL(20,6),
    "netWeight" DECIMAL(20,6),
    "rawSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaImportContainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaImportInvoice" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3),
    "natureOfPayment" TEXT,
    "natureOfTransaction" TEXT,
    "currency" TEXT,
    "exchangeRate" DECIMAL(30,12),
    "invoiceValue" DECIMAL(28,8),
    "invoiceValueInr" DECIMAL(28,8),
    "incoTerms" TEXT,
    "valuationMethod" TEXT,
    "supplierNameSnapshot" TEXT,
    "supplierAddressSnapshot" TEXT,
    "supplierCountrySnapshot" TEXT,
    "supplierZipCodeSnapshot" TEXT,
    "useForAllInvoice" BOOLEAN NOT NULL DEFAULT false,
    "useAsDefaultManufacturer" BOOLEAN NOT NULL DEFAULT false,
    "sellerSnapshot" JSONB,
    "brokerSnapshot" JSONB,
    "thirdPartySnapshot" JSONB,
    "aeoSnapshot" JSONB,
    "svbSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaImportInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaImportInvoiceCharge" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "chargeType" TEXT NOT NULL,
    "currency" TEXT,
    "exchangeRate" DECIMAL(30,12),
    "rate" DECIMAL(28,8),
    "amount" DECIMAL(28,8),
    "amountInr" DECIMAL(28,8),
    "isActual" BOOLEAN NOT NULL DEFAULT false,
    "rawSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaImportInvoiceCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaImportItem" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "sequenceNo" INTEGER NOT NULL,
    "invoiceSequenceNo" INTEGER,
    "ritcNo" TEXT,
    "itemDescription" TEXT,
    "schemeCode" TEXT,
    "quantity" DECIMAL(20,6),
    "unit" TEXT,
    "unitPrice" DECIMAL(28,8),
    "per" DECIMAL(20,6),
    "itemAmount" DECIMAL(28,8),
    "itemAmountInr" DECIMAL(28,8),
    "assessableValue" DECIMAL(28,8),
    "totalPmv" DECIMAL(28,8),
    "endUse" TEXT,
    "masterSnapshot" JSONB,
    "dutySnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaImportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaImportDeclaration" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "statementType" TEXT,
    "statementCode" TEXT,
    "statementText" TEXT,
    "declarationType" TEXT,
    "declarationNo" TEXT,
    "declarationDate" TIMESTAMP(3),
    "invoiceSequenceNo" INTEGER,
    "itemSequenceNo" INTEGER,
    "rawSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaImportDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaImportSupportingDocument" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "documentCode" TEXT NOT NULL,
    "documentNameSnapshot" TEXT,
    "irnNo" TEXT,
    "drnNo" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "declarationType" TEXT,
    "fileType" TEXT,
    "placeOfIssue" TEXT,
    "invoiceSequenceNo" INTEGER,
    "itemSequenceNo" INTEGER,
    "icegateIdSnapshot" TEXT,
    "documentVersionId" TEXT,
    "rawSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaImportSupportingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaExportFilingHeader" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sbType" TEXT,
    "sbNumber" TEXT,
    "sbDate" TIMESTAMP(3),
    "bookingNo" TEXT,
    "bookingDate" TIMESTAMP(3),
    "examinationDate" TIMESTAMP(3),
    "leoDate" TIMESTAMP(3),
    "icegateIdSnapshot" TEXT,
    "chaExporterPanSnapshot" TEXT,
    "exporterNameSnapshot" TEXT,
    "exporterIecSnapshot" TEXT,
    "exporterBranchSerialNo" TEXT,
    "exporterType" TEXT,
    "exporterClass" TEXT,
    "exporterAddressSnapshot" TEXT,
    "exporterCitySnapshot" TEXT,
    "exporterStateSnapshot" TEXT,
    "exporterPinCodeSnapshot" TEXT,
    "exporterAdCodeSnapshot" TEXT,
    "exporterOriginState" TEXT,
    "exporterGstnType" TEXT,
    "exporterTaxRegistrationNo" TEXT,
    "consigneeNameSnapshot" TEXT,
    "consigneeAddressSnapshot" TEXT,
    "consigneeCountrySnapshot" TEXT,
    "buyerNameSnapshot" TEXT,
    "buyerCountrySnapshot" TEXT,
    "portOfDischarge" TEXT,
    "portOfDischargeCode" TEXT,
    "dischargeCountry" TEXT,
    "portOfDestination" TEXT,
    "portOfDestinationCode" TEXT,
    "destinationCountry" TEXT,
    "annexureCSnapshot" JSONB,
    "packageSnapshot" JSONB,
    "containerSnapshot" JSONB,
    "eouSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaExportFilingHeader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaExportInvoice" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3),
    "contractNo" TEXT,
    "natureOfPayment" TEXT,
    "periodOfPayment" TEXT,
    "currency" TEXT,
    "exchangeRate" DECIMAL(30,12),
    "productValue" DECIMAL(28,8),
    "productValueInr" DECIMAL(28,8),
    "incoTerms" TEXT,
    "addFreight" TEXT,
    "buyerSnapshot" JSONB,
    "thirdPartySnapshot" JSONB,
    "aeoSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaExportInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaExportInvoiceCharge" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "chargeType" TEXT NOT NULL,
    "currency" TEXT,
    "exchangeRate" DECIMAL(30,12),
    "rate" DECIMAL(28,8),
    "amount" DECIMAL(28,8),
    "amountInr" DECIMAL(28,8),
    "isDeduction" BOOLEAN NOT NULL DEFAULT false,
    "rawSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaExportInvoiceCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaExportItem" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "sequenceNo" INTEGER NOT NULL,
    "invoiceSequenceNo" INTEGER,
    "productSequenceNo" INTEGER,
    "ritcNo" TEXT,
    "itemDescription" TEXT,
    "schemeCode" TEXT,
    "quantity" DECIMAL(20,6),
    "unit" TEXT,
    "unitPrice" DECIMAL(28,8),
    "per" DECIMAL(20,6),
    "itemAmount" DECIMAL(28,8),
    "itemAmountInr" DECIMAL(28,8),
    "totalPmv" DECIMAL(28,8),
    "endUse" TEXT,
    "taxableValue" DECIMAL(28,8),
    "igstRate" DECIMAL(28,8),
    "igstAmount" DECIMAL(28,8),
    "drawbackSnapshot" JSONB,
    "rodtepSnapshot" JSONB,
    "rosctlSnapshot" JSONB,
    "singleWindowSnapshot" JSONB,
    "masterSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaExportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaExportSupportingDocument" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "documentCode" TEXT NOT NULL,
    "documentNameSnapshot" TEXT,
    "irnNo" TEXT,
    "drnNo" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "declarationType" TEXT,
    "fileType" TEXT,
    "placeOfIssue" TEXT,
    "invoiceSequenceNo" INTEGER,
    "itemSequenceNo" INTEGER,
    "icegateIdSnapshot" TEXT,
    "issuingPartyCode" TEXT,
    "issuingPartyNameSnapshot" TEXT,
    "issuingPartyAddressSnapshot" TEXT,
    "beneficiaryCode" TEXT,
    "beneficiaryNameSnapshot" TEXT,
    "beneficiaryAddressSnapshot" TEXT,
    "documentVersionId" TEXT,
    "rawSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaExportSupportingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaCustomsChecklistGeneration" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "status" "ChaCustomsArtifactStatus" NOT NULL DEFAULT 'GENERATED',
    "checklistId" TEXT,
    "fileVersionId" TEXT,
    "fileKey" TEXT,
    "fileName" TEXT,
    "checksum" TEXT,
    "generatedById" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "ChaCustomsChecklistGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaCustomsFlatFileGeneration" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "status" "ChaCustomsArtifactStatus" NOT NULL DEFAULT 'GENERATED',
    "fileKey" TEXT,
    "fileName" TEXT,
    "checksum" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "generatedById" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedAt" TIMESTAMP(3),
    "signedById" TEXT,
    "signingStatus" TEXT,
    "signatureReference" TEXT,
    "signatureMetadata" JSONB,
    "supersededAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "ChaCustomsFlatFileGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaCustomsExternalSubmission" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "flatFileGenerationId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "submissionMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" "ChaCustomsExternalSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastSafeMessage" TEXT,
    "requestRedactedSnapshot" JSONB,
    "responseRedactedSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaCustomsExternalSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaCustomsExternalEvent" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "eventKind" "ChaCustomsExternalEventKind" NOT NULL,
    "externalStatus" TEXT,
    "safeMessage" TEXT,
    "requestRedactedSnapshot" JSONB,
    "responseRedactedSnapshot" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "retryAfter" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "ChaCustomsExternalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChaCustomsFilingProfile_jobId_key" ON "ChaCustomsFilingProfile"("jobId");

-- CreateIndex
CREATE INDEX "ChaCustomsFilingProfile_movementDirection_status_idx" ON "ChaCustomsFilingProfile"("movementDirection", "status");

-- CreateIndex
CREATE INDEX "ChaCustomsFilingProfile_status_idx" ON "ChaCustomsFilingProfile"("status");

-- CreateIndex
CREATE INDEX "ChaCustomsFilingProfile_isLocked_idx" ON "ChaCustomsFilingProfile"("isLocked");

-- CreateIndex
CREATE UNIQUE INDEX "ChaImportFilingHeader_profileId_key" ON "ChaImportFilingHeader"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaImportIgmHeader_profileId_key" ON "ChaImportIgmHeader"("profileId");

-- CreateIndex
CREATE INDEX "ChaImportIgmBillRow_igmHeaderId_sequenceNo_idx" ON "ChaImportIgmBillRow"("igmHeaderId", "sequenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "ChaImportIgmBillRow_igmHeaderId_sequenceNo_key" ON "ChaImportIgmBillRow"("igmHeaderId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaImportContainer_igmHeaderId_sequenceNo_idx" ON "ChaImportContainer"("igmHeaderId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaImportContainer_igmHeaderId_containerNo_idx" ON "ChaImportContainer"("igmHeaderId", "containerNo");

-- CreateIndex
CREATE UNIQUE INDEX "ChaImportContainer_igmHeaderId_sequenceNo_key" ON "ChaImportContainer"("igmHeaderId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaImportInvoice_profileId_sequenceNo_idx" ON "ChaImportInvoice"("profileId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaImportInvoice_profileId_invoiceNo_idx" ON "ChaImportInvoice"("profileId", "invoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "ChaImportInvoice_profileId_sequenceNo_key" ON "ChaImportInvoice"("profileId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaImportInvoiceCharge_invoiceId_sequenceNo_idx" ON "ChaImportInvoiceCharge"("invoiceId", "sequenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "ChaImportInvoiceCharge_invoiceId_sequenceNo_key" ON "ChaImportInvoiceCharge"("invoiceId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaImportItem_profileId_sequenceNo_idx" ON "ChaImportItem"("profileId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaImportItem_profileId_ritcNo_idx" ON "ChaImportItem"("profileId", "ritcNo");

-- CreateIndex
CREATE INDEX "ChaImportItem_invoiceId_sequenceNo_idx" ON "ChaImportItem"("invoiceId", "sequenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "ChaImportItem_profileId_sequenceNo_key" ON "ChaImportItem"("profileId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaImportDeclaration_profileId_sequenceNo_idx" ON "ChaImportDeclaration"("profileId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaImportDeclaration_profileId_invoiceSequenceNo_itemSequen_idx" ON "ChaImportDeclaration"("profileId", "invoiceSequenceNo", "itemSequenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "ChaImportDeclaration_profileId_sequenceNo_key" ON "ChaImportDeclaration"("profileId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaImportSupportingDocument_profileId_sequenceNo_idx" ON "ChaImportSupportingDocument"("profileId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaImportSupportingDocument_profileId_documentCode_idx" ON "ChaImportSupportingDocument"("profileId", "documentCode");

-- CreateIndex
CREATE INDEX "ChaImportSupportingDocument_documentVersionId_idx" ON "ChaImportSupportingDocument"("documentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaImportSupportingDocument_profileId_sequenceNo_key" ON "ChaImportSupportingDocument"("profileId", "sequenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "ChaExportFilingHeader_profileId_key" ON "ChaExportFilingHeader"("profileId");

-- CreateIndex
CREATE INDEX "ChaExportInvoice_profileId_sequenceNo_idx" ON "ChaExportInvoice"("profileId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaExportInvoice_profileId_invoiceNo_idx" ON "ChaExportInvoice"("profileId", "invoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "ChaExportInvoice_profileId_sequenceNo_key" ON "ChaExportInvoice"("profileId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaExportInvoiceCharge_invoiceId_sequenceNo_idx" ON "ChaExportInvoiceCharge"("invoiceId", "sequenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "ChaExportInvoiceCharge_invoiceId_sequenceNo_key" ON "ChaExportInvoiceCharge"("invoiceId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaExportItem_profileId_sequenceNo_idx" ON "ChaExportItem"("profileId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaExportItem_profileId_ritcNo_idx" ON "ChaExportItem"("profileId", "ritcNo");

-- CreateIndex
CREATE INDEX "ChaExportItem_invoiceId_sequenceNo_idx" ON "ChaExportItem"("invoiceId", "sequenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "ChaExportItem_profileId_sequenceNo_key" ON "ChaExportItem"("profileId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaExportSupportingDocument_profileId_sequenceNo_idx" ON "ChaExportSupportingDocument"("profileId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaExportSupportingDocument_profileId_documentCode_idx" ON "ChaExportSupportingDocument"("profileId", "documentCode");

-- CreateIndex
CREATE INDEX "ChaExportSupportingDocument_documentVersionId_idx" ON "ChaExportSupportingDocument"("documentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ChaExportSupportingDocument_profileId_sequenceNo_key" ON "ChaExportSupportingDocument"("profileId", "sequenceNo");

-- CreateIndex
CREATE INDEX "ChaCustomsChecklistGeneration_profileId_generatedAt_idx" ON "ChaCustomsChecklistGeneration"("profileId", "generatedAt");

-- CreateIndex
CREATE INDEX "ChaCustomsChecklistGeneration_profileId_status_idx" ON "ChaCustomsChecklistGeneration"("profileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChaCustomsChecklistGeneration_profileId_versionNo_key" ON "ChaCustomsChecklistGeneration"("profileId", "versionNo");

-- CreateIndex
CREATE INDEX "ChaCustomsFlatFileGeneration_profileId_generatedAt_idx" ON "ChaCustomsFlatFileGeneration"("profileId", "generatedAt");

-- CreateIndex
CREATE INDEX "ChaCustomsFlatFileGeneration_profileId_status_idx" ON "ChaCustomsFlatFileGeneration"("profileId", "status");

-- CreateIndex
CREATE INDEX "ChaCustomsFlatFileGeneration_checksum_idx" ON "ChaCustomsFlatFileGeneration"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "ChaCustomsFlatFileGeneration_profileId_versionNo_key" ON "ChaCustomsFlatFileGeneration"("profileId", "versionNo");

-- CreateIndex
CREATE UNIQUE INDEX "ChaCustomsExternalSubmission_idempotencyKey_key" ON "ChaCustomsExternalSubmission"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ChaCustomsExternalSubmission_profileId_createdAt_idx" ON "ChaCustomsExternalSubmission"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "ChaCustomsExternalSubmission_profileId_status_idx" ON "ChaCustomsExternalSubmission"("profileId", "status");

-- CreateIndex
CREATE INDEX "ChaCustomsExternalSubmission_flatFileGenerationId_idx" ON "ChaCustomsExternalSubmission"("flatFileGenerationId");

-- CreateIndex
CREATE INDEX "ChaCustomsExternalEvent_submissionId_occurredAt_idx" ON "ChaCustomsExternalEvent"("submissionId", "occurredAt");

-- CreateIndex
CREATE INDEX "ChaCustomsExternalEvent_eventKind_occurredAt_idx" ON "ChaCustomsExternalEvent"("eventKind", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChaCustomsExternalEvent_submissionId_sequenceNo_key" ON "ChaCustomsExternalEvent"("submissionId", "sequenceNo");

-- RenameForeignKey
ALTER TABLE "AccountingMigrationAttachment" RENAME CONSTRAINT "AccountingMigrationAttachment_record_fkey" TO "AccountingMigrationAttachment_recordId_fkey";

-- RenameForeignKey
ALTER TABLE "AccountingMigrationCheckpoint" RENAME CONSTRAINT "AccountingMigrationCheckpoint_batch_fkey" TO "AccountingMigrationCheckpoint_batchId_fkey";

-- RenameForeignKey
ALTER TABLE "AccountingMigrationException" RENAME CONSTRAINT "AccountingMigrationException_batch_fkey" TO "AccountingMigrationException_batchId_fkey";

-- RenameForeignKey
ALTER TABLE "AccountingMigrationException" RENAME CONSTRAINT "AccountingMigrationException_record_fkey" TO "AccountingMigrationException_recordId_fkey";

-- RenameForeignKey
ALTER TABLE "AccountingMigrationRecord" RENAME CONSTRAINT "AccountingMigrationRecord_batch_fkey" TO "AccountingMigrationRecord_batchId_fkey";

-- AddForeignKey
ALTER TABLE "ChaCustomsFilingProfile" ADD CONSTRAINT "ChaCustomsFilingProfile_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaImportFilingHeader" ADD CONSTRAINT "ChaImportFilingHeader_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ChaCustomsFilingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaImportIgmHeader" ADD CONSTRAINT "ChaImportIgmHeader_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ChaCustomsFilingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaImportIgmBillRow" ADD CONSTRAINT "ChaImportIgmBillRow_igmHeaderId_fkey" FOREIGN KEY ("igmHeaderId") REFERENCES "ChaImportIgmHeader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaImportContainer" ADD CONSTRAINT "ChaImportContainer_igmHeaderId_fkey" FOREIGN KEY ("igmHeaderId") REFERENCES "ChaImportIgmHeader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaImportInvoice" ADD CONSTRAINT "ChaImportInvoice_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ChaCustomsFilingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaImportInvoiceCharge" ADD CONSTRAINT "ChaImportInvoiceCharge_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ChaImportInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaImportItem" ADD CONSTRAINT "ChaImportItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ChaCustomsFilingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaImportItem" ADD CONSTRAINT "ChaImportItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ChaImportInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaImportDeclaration" ADD CONSTRAINT "ChaImportDeclaration_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ChaCustomsFilingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaImportSupportingDocument" ADD CONSTRAINT "ChaImportSupportingDocument_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ChaCustomsFilingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaExportFilingHeader" ADD CONSTRAINT "ChaExportFilingHeader_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ChaCustomsFilingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaExportInvoice" ADD CONSTRAINT "ChaExportInvoice_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ChaCustomsFilingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaExportInvoiceCharge" ADD CONSTRAINT "ChaExportInvoiceCharge_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ChaExportInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaExportItem" ADD CONSTRAINT "ChaExportItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ChaCustomsFilingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaExportItem" ADD CONSTRAINT "ChaExportItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ChaExportInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaExportSupportingDocument" ADD CONSTRAINT "ChaExportSupportingDocument_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ChaCustomsFilingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaCustomsChecklistGeneration" ADD CONSTRAINT "ChaCustomsChecklistGeneration_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ChaCustomsFilingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaCustomsFlatFileGeneration" ADD CONSTRAINT "ChaCustomsFlatFileGeneration_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ChaCustomsFilingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaCustomsExternalSubmission" ADD CONSTRAINT "ChaCustomsExternalSubmission_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ChaCustomsFilingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaCustomsExternalSubmission" ADD CONSTRAINT "ChaCustomsExternalSubmission_flatFileGenerationId_fkey" FOREIGN KEY ("flatFileGenerationId") REFERENCES "ChaCustomsFlatFileGeneration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaCustomsExternalEvent" ADD CONSTRAINT "ChaCustomsExternalEvent_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ChaCustomsExternalSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

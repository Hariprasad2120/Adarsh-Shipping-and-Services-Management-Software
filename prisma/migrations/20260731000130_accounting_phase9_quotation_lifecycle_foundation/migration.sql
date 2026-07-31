-- Phase 9.14 quotation lifecycle foundation
ALTER TABLE "Quotation"
ADD COLUMN "legalEntityId" TEXT,
ADD COLUMN "customerContactId" TEXT,
ADD COLUMN "referenceNumber" TEXT,
ADD COLUMN "currencyCode" VARCHAR(3) NOT NULL DEFAULT 'INR',
ADD COLUMN "exchangeRate" DECIMAL(28,8),
ADD COLUMN "exchangeRateEvidence" JSONB,
ADD COLUMN "grossSubtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN "discountType" TEXT DEFAULT 'AMOUNT',
ADD COLUMN "taxableSubtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN "gstComponentTotals" JSONB,
ADD COLUMN "additionalCharges" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN "roundingAdjustment" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN "paymentTermSnapshot" JSONB,
ADD COLUMN "priceListId" TEXT,
ADD COLUMN "priceListSnapshot" JSONB,
ADD COLUMN "salespersonId" TEXT,
ADD COLUMN "jobId" TEXT,
ADD COLUMN "subject" TEXT,
ADD COLUMN "notes" TEXT,
ADD COLUMN "termsAndConditions" TEXT,
ADD COLUMN "internalRemarks" TEXT,
ADD COLUMN "customerVisibleRemarks" TEXT,
ADD COLUMN "billingAddressSnapshot" JSONB,
ADD COLUMN "shippingAddressSnapshot" JSONB,
ADD COLUMN "customerSnapshot" JSONB,
ADD COLUMN "branchSnapshot" JSONB,
ADD COLUMN "legalEntitySnapshot" JSONB,
ADD COLUMN "customerContactSnapshot" JSONB,
ADD COLUMN "approvalPolicyId" TEXT,
ADD COLUMN "approvalPolicyVersion" INTEGER,
ADD COLUMN "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "submittedById" TEXT,
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "approvedById" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvalHistory" JSONB,
ADD COLUMN "approvalState" JSONB,
ADD COLUMN "returnReason" TEXT,
ADD COLUMN "returnedAt" TIMESTAMP(3),
ADD COLUMN "returnedById" TEXT,
ADD COLUMN "sentById" TEXT,
ADD COLUMN "sentAt" TIMESTAMP(3),
ADD COLUMN "sendStatus" TEXT,
ADD COLUMN "sendDelivery" JSONB,
ADD COLUMN "sentVersionSnapshot" JSONB,
ADD COLUMN "acceptedById" TEXT,
ADD COLUMN "acceptedAt" TIMESTAMP(3),
ADD COLUMN "acceptanceSource" TEXT,
ADD COLUMN "acceptanceComment" TEXT,
ADD COLUMN "declinedById" TEXT,
ADD COLUMN "declinedAt" TIMESTAMP(3),
ADD COLUMN "declineSource" TEXT,
ADD COLUMN "declineReason" TEXT,
ADD COLUMN "cancelledById" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "attachmentReferences" JSONB,
ADD COLUMN "templateVersion" TEXT,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "rowVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "updatedById" TEXT;

ALTER TABLE "SalesInvoice"
ADD COLUMN "sourceQuotationId" TEXT,
ADD COLUMN "sourceQuotationVersion" INTEGER,
ADD COLUMN "sourceQuotationNumber" TEXT,
ADD COLUMN "sourceQuotationSnapshot" JSONB;

ALTER TABLE "SalesInvoiceItem"
ADD COLUMN "sourceQuotationItemId" TEXT,
ADD COLUMN "sourceQuotationQuantity" DECIMAL(20,6);

ALTER TABLE "QuotationItem"
ADD COLUMN "itemMasterId" TEXT,
ADD COLUMN "descriptionSnapshot" TEXT,
ADD COLUMN "discountType" TEXT DEFAULT 'AMOUNT',
ADD COLUMN "discountValue" DECIMAL(20,6),
ADD COLUMN "taxCategorySnapshot" JSONB,
ADD COLUMN "taxGroupSnapshot" JSONB,
ADD COLUMN "gstComponents" JSONB,
ADD COLUMN "taxMode" TEXT NOT NULL DEFAULT 'EXCLUSIVE',
ADD COLUMN "taxableAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN "lineTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN "jobId" TEXT,
ADD COLUMN "reportingTags" JSONB,
ADD COLUMN "customFieldValues" JSONB,
ADD COLUMN "itemSnapshot" JSONB,
ADD COLUMN "convertedQuantity" DECIMAL(20,6) NOT NULL DEFAULT 0;

ALTER TABLE "QuotationItem"
ALTER COLUMN "qty" TYPE DECIMAL(20,6) USING "qty"::numeric,
ALTER COLUMN "rate" TYPE DECIMAL(20,6) USING "rate"::numeric,
ALTER COLUMN "discount" TYPE DECIMAL(20,6) USING "discount"::numeric,
ALTER COLUMN "taxRate" TYPE DECIMAL(10,4) USING "taxRate"::numeric;

ALTER TABLE "Quotation"
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE INDEX "Quotation_org_legalEntity_status_idx" ON "Quotation"("orgId", "legalEntityId", "status");
CREATE INDEX "Quotation_contact_idx" ON "Quotation"("customerContactId");
CREATE INDEX "Quotation_salesperson_idx" ON "Quotation"("salespersonId");
CREATE INDEX "Quotation_job_idx" ON "Quotation"("jobId");
CREATE INDEX "Quotation_validUntil_status_idx" ON "Quotation"("validUntil", "status");
CREATE INDEX "QuotationItem_itemMaster_idx" ON "QuotationItem"("itemMasterId");

UPDATE "Quotation"
SET
  "grossSubtotal" = "subTotal",
  "taxableSubtotal" = "subTotal",
  "updatedById" = "createdById",
  "rowVersion" = 1,
  "version" = 1
WHERE true;

UPDATE "QuotationItem"
SET
  "taxableAmount" = "amount",
  "lineTotal" = "amount" + "taxAmount"
WHERE true;

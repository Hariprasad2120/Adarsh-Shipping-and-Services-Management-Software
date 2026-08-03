-- Phase 9.14 quotation to sales-order lineage
ALTER TABLE "CrmInvoice"
ADD COLUMN "sourceAccountingQuotationId" TEXT,
ADD COLUMN "sourceAccountingQuotationNumber" TEXT,
ADD COLUMN "sourceAccountingQuotationVersion" INTEGER,
ADD COLUMN "sourceAccountingQuotationSnapshot" JSONB;

CREATE INDEX "CrmInvoice_org_type_sourceAccountingQuotation_idx"
ON "CrmInvoice"("orgId", "type", "sourceAccountingQuotationId");

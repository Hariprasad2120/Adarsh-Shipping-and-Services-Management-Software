-- Additive quote-to-sales-order lineage for Phase 9 sales lifecycle continuation.
ALTER TABLE "CrmInvoice"
ADD COLUMN "sourceQuotationId" TEXT,
ADD COLUMN "sourceQuotationVersion" INTEGER,
ADD COLUMN "sourceQuotationNumber" TEXT,
ADD COLUMN "sourceQuotationSnapshot" JSONB;

ALTER TABLE "CrmInvoiceItem"
ADD COLUMN "sourceQuotationItemId" TEXT,
ADD COLUMN "sourceQuotationQuantity" DECIMAL(20, 6);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'CrmInvoice'
      AND column_name = 'sourceAccountingQuotationId'
  ) THEN
    EXECUTE '
      UPDATE "CrmInvoice"
      SET
        "sourceQuotationId" = COALESCE("sourceQuotationId", "sourceAccountingQuotationId"),
        "sourceQuotationVersion" = COALESCE("sourceQuotationVersion", "sourceAccountingQuotationVersion"),
        "sourceQuotationNumber" = COALESCE("sourceQuotationNumber", "sourceAccountingQuotationNumber"),
        "sourceQuotationSnapshot" = COALESCE("sourceQuotationSnapshot", "sourceAccountingQuotationSnapshot")
      WHERE
        "sourceAccountingQuotationId" IS NOT NULL
        OR "sourceAccountingQuotationVersion" IS NOT NULL
        OR "sourceAccountingQuotationNumber" IS NOT NULL
        OR "sourceAccountingQuotationSnapshot" IS NOT NULL
    ';
  END IF;
END $$;

CREATE INDEX "CrmInvoice_sourceQuotationId_idx" ON "CrmInvoice"("sourceQuotationId");
CREATE INDEX "CrmInvoiceItem_sourceQuotationItemId_idx" ON "CrmInvoiceItem"("sourceQuotationItemId");

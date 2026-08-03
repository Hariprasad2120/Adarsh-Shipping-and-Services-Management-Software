-- AlterTable
ALTER TABLE "PurchaseInvoice"
ADD COLUMN "sourcePurchaseOrderId" TEXT,
ADD COLUMN "sourcePurchaseOrderNumber" TEXT,
ADD COLUMN "sourcePurchaseOrderSnapshot" JSONB;

-- AlterTable
ALTER TABLE "PurchaseInvoiceItem"
ADD COLUMN "sourcePurchaseOrderItemId" TEXT;

-- CreateIndex
CREATE INDEX "PurchaseInvoice_sourcePurchaseOrderId_idx" ON "PurchaseInvoice"("sourcePurchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseInvoiceItem_sourcePurchaseOrderItemId_idx" ON "PurchaseInvoiceItem"("sourcePurchaseOrderItemId");

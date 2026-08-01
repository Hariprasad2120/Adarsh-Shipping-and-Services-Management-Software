-- Phase 9.13: persist shared Accounting payment-method selections on
-- canonical invoices and notes.
ALTER TABLE "SalesInvoice"
ADD COLUMN "paymentMethod" TEXT;

ALTER TABLE "PurchaseInvoice"
ADD COLUMN "paymentMethod" TEXT;

ALTER TABLE "CustomerNote"
ADD COLUMN "paymentMethod" TEXT;

ALTER TABLE "VendorNote"
ADD COLUMN "paymentMethod" TEXT;

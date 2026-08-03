-- Phase 9.14 sales-order to invoice lineage
ALTER TABLE "SalesInvoice"
ADD COLUMN "sourceSalesOrderId" TEXT,
ADD COLUMN "sourceSalesOrderNumber" TEXT,
ADD COLUMN "sourceSalesOrderVersion" INTEGER,
ADD COLUMN "sourceSalesOrderSnapshot" JSONB;

ALTER TABLE "SalesInvoiceItem"
ADD COLUMN "sourceSalesOrderItemId" TEXT,
ADD COLUMN "sourceSalesOrderQuantity" DECIMAL(20,6);

ALTER TABLE "CrmInvoice"
ADD COLUMN "sourceSalesOrderId" TEXT,
ADD COLUMN "sourceSalesOrderNumber" TEXT,
ADD COLUMN "sourceSalesOrderVersion" INTEGER,
ADD COLUMN "sourceSalesOrderSnapshot" JSONB;

ALTER TABLE "CrmInvoiceItem"
ADD COLUMN "sourceSalesOrderItemId" TEXT,
ADD COLUMN "sourceSalesOrderQuantity" DECIMAL(20,6);

CREATE INDEX "SalesInvoice_sourceSalesOrder_idx"
ON "SalesInvoice"("sourceSalesOrderId");

CREATE INDEX "CrmInvoice_org_type_sourceSalesOrder_idx"
ON "CrmInvoice"("orgId", "type", "sourceSalesOrderId");

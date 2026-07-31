-- Accounting Phase 9.13 persisted item master foundation

CREATE TABLE "AccountingItemMaster" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "purchaseDescription" TEXT,
  "purchaseRate" DECIMAL(28,8) NOT NULL DEFAULT 0,
  "salesDescription" TEXT,
  "salesRate" DECIMAL(28,8) NOT NULL DEFAULT 0,
  "hsnSac" TEXT,
  "usageUnit" TEXT,
  "itemType" TEXT NOT NULL,
  "taxPreference" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "priceList" JSONB,
  "priceListAuto" BOOLEAN NOT NULL DEFAULT true,
  "imageDataUrl" TEXT,
  "salesAccount" TEXT,
  "purchaseAccount" TEXT,
  "taxRate" TEXT,
  "exemptionReason" TEXT,
  "preferredVendorId" TEXT,
  "preferredVendorName" TEXT,
  "salesInformation" BOOLEAN NOT NULL DEFAULT true,
  "purchaseInformation" BOOLEAN NOT NULL DEFAULT true,
  "inventoryTracking" BOOLEAN NOT NULL DEFAULT false,
  "openingStock" DECIMAL(20,6),
  "reorderPoint" DECIMAL(20,6),
  "chargeCategory" TEXT,
  "applicableFor" TEXT,
  "defaultContainerType" TEXT,
  "customFields" JSONB,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingItemMaster_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingItemMaster_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingItemMaster_preferred_vendor_fkey" FOREIGN KEY ("preferredVendorId") REFERENCES "CrmVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "AccountingItemMaster_status_idx"
  ON "AccountingItemMaster"("orgId", "status");

CREATE INDEX "AccountingItemMaster_type_status_idx"
  ON "AccountingItemMaster"("orgId", "itemType", "status");

CREATE INDEX "AccountingItemMaster_preferredVendorId_idx"
  ON "AccountingItemMaster"("preferredVendorId");

CREATE UNIQUE INDEX "AccountingItemMaster_org_sku_key"
  ON "AccountingItemMaster"("orgId", "sku");

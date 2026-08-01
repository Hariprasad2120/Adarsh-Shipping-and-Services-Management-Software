-- Accounting Phase 9.9 customer and vendor finance foundation

CREATE TABLE "AccountingCustomerProfile" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "crmAccountId" TEXT NOT NULL,
  "receivableAccountId" TEXT NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "creditLimit" DECIMAL(28,8),
  "paymentTermsDays" INTEGER,
  "collectionPolicyVersion" INTEGER NOT NULL DEFAULT 1,
  "dunningPolicyCode" TEXT,
  "creditHold" BOOLEAN NOT NULL DEFAULT false,
  "statementDeliveryMode" TEXT NOT NULL DEFAULT 'EMAIL',
  "configuration" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingCustomerProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingCustomerProfile_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingCustomerProfile_customer_fkey" FOREIGN KEY ("crmAccountId") REFERENCES "CrmAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingCustomerProfile_receivable_account_fkey" FOREIGN KEY ("receivableAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingCustomerProfile_customer_key"
  ON "AccountingCustomerProfile"("orgId", "crmAccountId");

CREATE UNIQUE INDEX "AccountingCustomerProfile_crmAccountId_key"
  ON "AccountingCustomerProfile"("crmAccountId");

CREATE INDEX "AccountingCustomerProfile_active_idx"
  ON "AccountingCustomerProfile"("orgId", "isActive");

CREATE INDEX "AccountingCustomerProfile_receivableAccountId_idx"
  ON "AccountingCustomerProfile"("receivableAccountId");

CREATE TABLE "AccountingVendorProfile" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "crmVendorId" TEXT NOT NULL,
  "payableAccountId" TEXT NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "paymentTermsDays" INTEGER,
  "paymentPolicyVersion" INTEGER NOT NULL DEFAULT 1,
  "taxProfileId" TEXT,
  "paymentHold" BOOLEAN NOT NULL DEFAULT false,
  "paymentMethod" TEXT,
  "configuration" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingVendorProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingVendorProfile_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingVendorProfile_vendor_fkey" FOREIGN KEY ("crmVendorId") REFERENCES "CrmVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingVendorProfile_payable_account_fkey" FOREIGN KEY ("payableAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingVendorProfile_tax_profile_fkey" FOREIGN KEY ("taxProfileId") REFERENCES "AccountingTaxProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingVendorProfile_vendor_key"
  ON "AccountingVendorProfile"("orgId", "crmVendorId");

CREATE UNIQUE INDEX "AccountingVendorProfile_crmVendorId_key"
  ON "AccountingVendorProfile"("crmVendorId");

CREATE INDEX "AccountingVendorProfile_active_idx"
  ON "AccountingVendorProfile"("orgId", "isActive");

CREATE INDEX "AccountingVendorProfile_payableAccountId_idx"
  ON "AccountingVendorProfile"("payableAccountId");

CREATE INDEX "AccountingVendorProfile_taxProfileId_idx"
  ON "AccountingVendorProfile"("taxProfileId");

-- Accounting Phase 9.13 shared commercial master-data foundation

CREATE TABLE "AccountingPaymentTerm" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "dueDays" INTEGER NOT NULL,
  "earlyDiscountDays" INTEGER,
  "earlyDiscountPercent" DECIMAL(12,4),
  "configuration" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingPaymentTerm_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingPaymentTerm_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingPaymentTerm_org_code_key"
  ON "AccountingPaymentTerm"("orgId", "code");

CREATE INDEX "AccountingPaymentTerm_active_idx"
  ON "AccountingPaymentTerm"("orgId", "isActive");

CREATE TABLE "AccountingPaymentMethod" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "methodType" TEXT NOT NULL,
  "clearingAccountId" TEXT,
  "configuration" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingPaymentMethod_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingPaymentMethod_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingPaymentMethod_clearing_account_fkey" FOREIGN KEY ("clearingAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingPaymentMethod_org_code_key"
  ON "AccountingPaymentMethod"("orgId", "code");

CREATE INDEX "AccountingPaymentMethod_active_idx"
  ON "AccountingPaymentMethod"("orgId", "isActive");

CREATE INDEX "AccountingPaymentMethod_clearingAccountId_idx"
  ON "AccountingPaymentMethod"("clearingAccountId");

CREATE TABLE "AccountingPriceList" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "adjustmentMode" TEXT NOT NULL,
  "defaultAdjustmentPercent" DECIMAL(12,4),
  "configuration" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingPriceList_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingPriceList_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingPriceList_org_code_key"
  ON "AccountingPriceList"("orgId", "code");

CREATE INDEX "AccountingPriceList_active_idx"
  ON "AccountingPriceList"("orgId", "isActive");

CREATE TABLE "AccountingUnitOfMeasure" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "symbol" TEXT,
  "decimalPlaces" INTEGER NOT NULL DEFAULT 0,
  "configuration" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingUnitOfMeasure_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingUnitOfMeasure_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingUnitOfMeasure_org_code_key"
  ON "AccountingUnitOfMeasure"("orgId", "code");

CREATE INDEX "AccountingUnitOfMeasure_active_idx"
  ON "AccountingUnitOfMeasure"("orgId", "isActive");

CREATE TABLE "AccountingReportingTag" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "configuration" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingReportingTag_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingReportingTag_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingReportingTag_org_code_key"
  ON "AccountingReportingTag"("orgId", "code");

CREATE INDEX "AccountingReportingTag_active_idx"
  ON "AccountingReportingTag"("orgId", "isActive");

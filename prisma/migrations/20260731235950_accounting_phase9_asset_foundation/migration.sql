-- Accounting Phase 9.6 asset accounting and depreciation foundation

CREATE TABLE "AccountingFinancialAsset" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "legacyAssetId" TEXT NOT NULL,
  "assetCode" TEXT NOT NULL,
  "assetName" TEXT NOT NULL,
  "capitalizationDate" DATE NOT NULL,
  "capitalizationAmount" DECIMAL(28,8) NOT NULL,
  "salvageValue" DECIMAL(28,8),
  "usefulLifeMonths" INTEGER,
  "sourceAssetVersion" INTEGER,
  "policyJson" JSONB,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdById" TEXT NOT NULL,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingFinancialAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingFinancialAsset_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingFinancialAsset_legal_entity_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingFinancialAsset_legacy_asset_fkey" FOREIGN KEY ("legacyAssetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingFinancialAsset_creator_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingFinancialAsset_legacy_asset_key"
  ON "AccountingFinancialAsset"("orgId", "legacyAssetId");

CREATE UNIQUE INDEX "AccountingFinancialAsset_asset_code_key"
  ON "AccountingFinancialAsset"("orgId", "assetCode");

CREATE INDEX "AccountingFinancialAsset_status_idx"
  ON "AccountingFinancialAsset"("orgId", "legalEntityId", "status");

CREATE INDEX "AccountingFinancialAsset_createdById_idx"
  ON "AccountingFinancialAsset"("createdById");

CREATE TABLE "AccountingAssetBook" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "financialAssetId" TEXT NOT NULL,
  "bookCode" TEXT NOT NULL,
  "bookType" TEXT NOT NULL,
  "depreciationMethod" TEXT NOT NULL,
  "depreciationRate" DECIMAL(12,6),
  "usefulLifeMonths" INTEGER,
  "capitalizationAmount" DECIMAL(28,8) NOT NULL,
  "salvageValue" DECIMAL(28,8),
  "accumulatedDepreciation" DECIMAL(28,8) NOT NULL DEFAULT 0,
  "netBookValue" DECIMAL(28,8) NOT NULL,
  "assetAccountId" TEXT,
  "depreciationExpenseAccountId" TEXT,
  "accumulatedDepAccountId" TEXT,
  "policyJson" JSONB,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingAssetBook_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingAssetBook_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingAssetBook_legal_entity_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingAssetBook_financial_asset_fkey" FOREIGN KEY ("financialAssetId") REFERENCES "AccountingFinancialAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingAssetBook_asset_account_fkey" FOREIGN KEY ("assetAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingAssetBook_expense_account_fkey" FOREIGN KEY ("depreciationExpenseAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingAssetBook_accumulated_account_fkey" FOREIGN KEY ("accumulatedDepAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingAssetBook_asset_book_code_key"
  ON "AccountingAssetBook"("orgId", "financialAssetId", "bookCode");

CREATE INDEX "AccountingAssetBook_type_idx"
  ON "AccountingAssetBook"("orgId", "legalEntityId", "bookType", "isActive");

CREATE INDEX "AccountingAssetBook_assetAccountId_idx"
  ON "AccountingAssetBook"("assetAccountId");

CREATE INDEX "AccountingAssetBook_depreciationExpenseAccountId_idx"
  ON "AccountingAssetBook"("depreciationExpenseAccountId");

CREATE INDEX "AccountingAssetBook_accumulatedDepAccountId_idx"
  ON "AccountingAssetBook"("accumulatedDepAccountId");

CREATE TABLE "AccountingDepreciationRun" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "assetBookId" TEXT NOT NULL,
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "depreciationDate" DATE NOT NULL,
  "depreciationAmount" DECIMAL(28,8) NOT NULL,
  "accumulatedAfter" DECIMAL(28,8) NOT NULL,
  "netBookValueAfter" DECIMAL(28,8) NOT NULL,
  "runStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "journalEntryId" TEXT,
  "policySnapshot" JSONB,
  "idempotencyKey" TEXT NOT NULL,
  "processedById" TEXT,
  "processedAt" TIMESTAMP(3),
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingDepreciationRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingDepreciationRun_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingDepreciationRun_legal_entity_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingDepreciationRun_asset_book_fkey" FOREIGN KEY ("assetBookId") REFERENCES "AccountingAssetBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingDepreciationRun_journal_entry_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingDepreciationRun_processed_by_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingDepreciationRun_idempotency_key"
  ON "AccountingDepreciationRun"("orgId", "idempotencyKey");

CREATE UNIQUE INDEX "AccountingDepreciationRun_book_period_key"
  ON "AccountingDepreciationRun"("assetBookId", "periodStart", "periodEnd");

CREATE INDEX "AccountingDepreciationRun_status_idx"
  ON "AccountingDepreciationRun"("orgId", "runStatus", "depreciationDate");

CREATE INDEX "AccountingDepreciationRun_journalEntryId_idx"
  ON "AccountingDepreciationRun"("journalEntryId");

CREATE INDEX "AccountingDepreciationRun_processedById_idx"
  ON "AccountingDepreciationRun"("processedById");

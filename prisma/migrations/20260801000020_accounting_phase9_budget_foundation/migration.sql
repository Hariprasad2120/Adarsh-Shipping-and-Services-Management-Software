-- Accounting Phase 9.8 budget and management-control foundation

CREATE TABLE "AccountingBudget" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "fiscalYearId" TEXT NOT NULL,
  "scenarioCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "periodGranularity" TEXT NOT NULL,
  "configuration" JSONB,
  "approvedByMgmt" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "createdById" TEXT NOT NULL,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingBudget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingBudget_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingBudget_legal_entity_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingBudget_fiscal_year_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingBudget_creator_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingBudget_scope_version_key"
  ON "AccountingBudget"("orgId", "legalEntityId", "fiscalYearId", "scenarioCode", "version");

CREATE INDEX "AccountingBudget_active_idx"
  ON "AccountingBudget"("orgId", "legalEntityId", "isActive", "effectiveFrom");

CREATE INDEX "AccountingBudget_createdById_idx"
  ON "AccountingBudget"("createdById");

CREATE TABLE "AccountingBudgetLine" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "budgetId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "lineNumber" INTEGER NOT NULL,
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "accountId" TEXT NOT NULL,
  "dimensionValueId" TEXT,
  "amount" DECIMAL(28,8) NOT NULL,
  "quantity" DECIMAL(20,6),
  "assumptions" JSONB,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingBudgetLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingBudgetLine_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingBudgetLine_budget_fkey" FOREIGN KEY ("budgetId") REFERENCES "AccountingBudget"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingBudgetLine_legal_entity_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingBudgetLine_account_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingBudgetLine_dimension_value_fkey" FOREIGN KEY ("dimensionValueId") REFERENCES "AccountingDimensionValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingBudgetLine_budget_line_key"
  ON "AccountingBudgetLine"("budgetId", "lineNumber");

CREATE INDEX "AccountingBudgetLine_period_idx"
  ON "AccountingBudgetLine"("orgId", "periodStart", "periodEnd");

CREATE INDEX "AccountingBudgetLine_accountId_idx"
  ON "AccountingBudgetLine"("accountId");

CREATE INDEX "AccountingBudgetLine_dimensionValueId_idx"
  ON "AccountingBudgetLine"("dimensionValueId");

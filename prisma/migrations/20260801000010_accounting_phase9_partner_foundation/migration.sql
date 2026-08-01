-- Accounting Phase 9.7 partnership accounting foundation

CREATE TABLE "AccountingPartner" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "legacyPartnerId" TEXT NOT NULL,
  "partnerCode" TEXT NOT NULL,
  "partnerName" TEXT NOT NULL,
  "capitalAccountId" TEXT NOT NULL,
  "currentAccountId" TEXT NOT NULL,
  "drawingsAccountId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "policyJson" JSONB,
  "createdById" TEXT NOT NULL,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingPartner_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingPartner_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingPartner_legal_entity_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingPartner_legacy_partner_fkey" FOREIGN KEY ("legacyPartnerId") REFERENCES "PartnerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingPartner_capital_account_fkey" FOREIGN KEY ("capitalAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingPartner_current_account_fkey" FOREIGN KEY ("currentAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingPartner_drawings_account_fkey" FOREIGN KEY ("drawingsAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingPartner_creator_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingPartner_legacy_partner_key"
  ON "AccountingPartner"("orgId", "legacyPartnerId");

CREATE UNIQUE INDEX "AccountingPartner_code_key"
  ON "AccountingPartner"("orgId", "partnerCode");

CREATE INDEX "AccountingPartner_status_idx"
  ON "AccountingPartner"("orgId", "legalEntityId", "status");

CREATE INDEX "AccountingPartner_createdById_idx"
  ON "AccountingPartner"("createdById");

CREATE TABLE "AccountingPartnerTerm" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "profitSharingRatio" DECIMAL(12,6) NOT NULL,
  "interestOnCapitalRate" DECIMAL(12,6),
  "interestOnDrawingsRate" DECIMAL(12,6),
  "salaryAmount" DECIMAL(28,8),
  "salaryExpenseAccountId" TEXT,
  "interestExpenseAccountId" TEXT,
  "interestIncomeAccountId" TEXT,
  "configuration" JSONB,
  "approvedByCA" BOOLEAN NOT NULL DEFAULT false,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingPartnerTerm_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingPartnerTerm_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingPartnerTerm_legal_entity_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingPartnerTerm_partner_fkey" FOREIGN KEY ("partnerId") REFERENCES "AccountingPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingPartnerTerm_salary_expense_fkey" FOREIGN KEY ("salaryExpenseAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingPartnerTerm_interest_expense_fkey" FOREIGN KEY ("interestExpenseAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingPartnerTerm_interest_income_fkey" FOREIGN KEY ("interestIncomeAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingPartnerTerm_version_key"
  ON "AccountingPartnerTerm"("orgId", "partnerId", "version");

CREATE INDEX "AccountingPartnerTerm_active_idx"
  ON "AccountingPartnerTerm"("orgId", "legalEntityId", "isActive", "effectiveFrom");

CREATE INDEX "AccountingPartnerTerm_salaryExpenseAccountId_idx"
  ON "AccountingPartnerTerm"("salaryExpenseAccountId");

CREATE INDEX "AccountingPartnerTerm_interestExpenseAccountId_idx"
  ON "AccountingPartnerTerm"("interestExpenseAccountId");

CREATE INDEX "AccountingPartnerTerm_interestIncomeAccountId_idx"
  ON "AccountingPartnerTerm"("interestIncomeAccountId");

CREATE TABLE "AccountingAppropriation" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "termId" TEXT NOT NULL,
  "appropriationType" TEXT NOT NULL,
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "amount" DECIMAL(28,8) NOT NULL,
  "basis" JSONB,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "journalEntryId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingAppropriation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingAppropriation_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingAppropriation_legal_entity_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingAppropriation_partner_fkey" FOREIGN KEY ("partnerId") REFERENCES "AccountingPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingAppropriation_term_fkey" FOREIGN KEY ("termId") REFERENCES "AccountingPartnerTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingAppropriation_journal_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingAppropriation_creator_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingAppropriation_idempotency_key"
  ON "AccountingAppropriation"("orgId", "idempotencyKey");

CREATE UNIQUE INDEX "AccountingAppropriation_period_key"
  ON "AccountingAppropriation"("partnerId", "appropriationType", "periodStart", "periodEnd");

CREATE INDEX "AccountingAppropriation_status_idx"
  ON "AccountingAppropriation"("orgId", "legalEntityId", "status", "periodEnd");

CREATE INDEX "AccountingAppropriation_journalEntryId_idx"
  ON "AccountingAppropriation"("journalEntryId");

CREATE INDEX "AccountingAppropriation_createdById_idx"
  ON "AccountingAppropriation"("createdById");

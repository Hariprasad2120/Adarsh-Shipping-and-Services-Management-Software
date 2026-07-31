-- Phase 9.4 banking and reconciliation foundation.

CREATE TABLE "AccountingBankAccount" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "taxRegistrationId" TEXT,
    "ledgerAccountId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchName" TEXT,
    "accountNumberMasked" TEXT NOT NULL,
    "ifsc" TEXT,
    "currencyCode" VARCHAR(3) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "configuration" JSONB,
    "statutoryValidated" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountingBankAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingBankStatementImport" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "sourceFileHash" TEXT NOT NULL,
    "sourceFormat" TEXT NOT NULL,
    "statementStart" DATE,
    "statementEnd" DATE,
    "openingBalance" DECIMAL(28,8),
    "closingBalance" DECIMAL(28,8),
    "importStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "importExceptions" JSONB,
    "importedById" TEXT NOT NULL,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountingBankStatementImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingBankStatementLine" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "lineDate" DATE NOT NULL,
    "valueDate" DATE,
    "sequenceNumber" INTEGER NOT NULL,
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "debitAmount" DECIMAL(28,8),
    "creditAmount" DECIMAL(28,8),
    "runningBalance" DECIMAL(28,8),
    "importExceptionCode" TEXT,
    "reconciliationStatus" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "canonicalTargetType" TEXT,
    "canonicalTargetIdentifier" TEXT,
    "rawPayload" JSONB,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountingBankStatementLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingReconciliationSession" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "statementImportId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "statementClosingBalance" DECIMAL(28,8),
    "ledgerClosingBalance" DECIMAL(28,8),
    "differenceAmount" DECIMAL(28,8),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "proof" JSONB,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountingReconciliationSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingBankMatch" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "statementLineId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetDocumentId" TEXT,
    "targetJournalEntryId" TEXT,
    "matchedAmount" DECIMAL(28,8) NOT NULL,
    "confidenceScore" DECIMAL(12,6),
    "reasonCode" TEXT,
    "createdById" TEXT NOT NULL,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountingBankMatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountingBankAccount_org_code_key" ON "AccountingBankAccount"("orgId", "code");
CREATE UNIQUE INDEX "AccountingBankAccount_org_ledger_key" ON "AccountingBankAccount"("orgId", "ledgerAccountId");
CREATE INDEX "AccountingBankAccount_active_idx" ON "AccountingBankAccount"("orgId", "legalEntityId", "isActive");

CREATE UNIQUE INDEX "AccountingBankStatementImport_hash_key" ON "AccountingBankStatementImport"("orgId", "bankAccountId", "sourceFileHash");
CREATE INDEX "AccountingBankStatementImport_status_idx" ON "AccountingBankStatementImport"("orgId", "bankAccountId", "importStatus", "createdAt");
CREATE INDEX "AccountingBankStatementImport_importedById_idx" ON "AccountingBankStatementImport"("importedById");

CREATE UNIQUE INDEX "AccountingBankStatementLine_import_sequence_key" ON "AccountingBankStatementLine"("importId", "sequenceNumber");
CREATE INDEX "AccountingBankStatementLine_status_idx" ON "AccountingBankStatementLine"("orgId", "bankAccountId", "lineDate", "reconciliationStatus");

CREATE UNIQUE INDEX "AccountingReconciliationSession_scope_key" ON "AccountingReconciliationSession"("orgId", "bankAccountId", "statementImportId");
CREATE INDEX "AccountingReconciliationSession_status_idx" ON "AccountingReconciliationSession"("orgId", "bankAccountId", "status", "periodStart");
CREATE INDEX "AccountingReconciliationSession_completedById_idx" ON "AccountingReconciliationSession"("completedById");

CREATE UNIQUE INDEX "AccountingBankMatch_unique_target_key" ON "AccountingBankMatch"("sessionId", "statementLineId", "targetType", "targetDocumentId", "targetJournalEntryId");
CREATE INDEX "AccountingBankMatch_session_idx" ON "AccountingBankMatch"("orgId", "sessionId", "createdAt");
CREATE INDEX "AccountingBankMatch_targetDocumentId_idx" ON "AccountingBankMatch"("targetDocumentId");
CREATE INDEX "AccountingBankMatch_targetJournalEntryId_idx" ON "AccountingBankMatch"("targetJournalEntryId");
CREATE INDEX "AccountingBankMatch_createdById_idx" ON "AccountingBankMatch"("createdById");

ALTER TABLE "AccountingBankAccount"
    ADD CONSTRAINT "AccountingBankAccount_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingBankAccount"
    ADD CONSTRAINT "AccountingBankAccount_legalEntityId_fkey"
    FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingBankAccount"
    ADD CONSTRAINT "AccountingBankAccount_taxRegistrationId_fkey"
    FOREIGN KEY ("taxRegistrationId") REFERENCES "AccountingTaxRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingBankAccount"
    ADD CONSTRAINT "AccountingBankAccount_ledgerAccountId_fkey"
    FOREIGN KEY ("ledgerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingBankStatementImport"
    ADD CONSTRAINT "AccountingBankStatementImport_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingBankStatementImport"
    ADD CONSTRAINT "AccountingBankStatementImport_legalEntityId_fkey"
    FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingBankStatementImport"
    ADD CONSTRAINT "AccountingBankStatementImport_bankAccountId_fkey"
    FOREIGN KEY ("bankAccountId") REFERENCES "AccountingBankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingBankStatementImport"
    ADD CONSTRAINT "AccountingBankStatementImport_importedById_fkey"
    FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingBankStatementLine"
    ADD CONSTRAINT "AccountingBankStatementLine_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingBankStatementLine"
    ADD CONSTRAINT "AccountingBankStatementLine_legalEntityId_fkey"
    FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingBankStatementLine"
    ADD CONSTRAINT "AccountingBankStatementLine_importId_fkey"
    FOREIGN KEY ("importId") REFERENCES "AccountingBankStatementImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountingBankStatementLine"
    ADD CONSTRAINT "AccountingBankStatementLine_bankAccountId_fkey"
    FOREIGN KEY ("bankAccountId") REFERENCES "AccountingBankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingReconciliationSession"
    ADD CONSTRAINT "AccountingReconciliationSession_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingReconciliationSession"
    ADD CONSTRAINT "AccountingReconciliationSession_legalEntityId_fkey"
    FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingReconciliationSession"
    ADD CONSTRAINT "AccountingReconciliationSession_bankAccountId_fkey"
    FOREIGN KEY ("bankAccountId") REFERENCES "AccountingBankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingReconciliationSession"
    ADD CONSTRAINT "AccountingReconciliationSession_statementImportId_fkey"
    FOREIGN KEY ("statementImportId") REFERENCES "AccountingBankStatementImport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingReconciliationSession"
    ADD CONSTRAINT "AccountingReconciliationSession_completedById_fkey"
    FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingBankMatch"
    ADD CONSTRAINT "AccountingBankMatch_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingBankMatch"
    ADD CONSTRAINT "AccountingBankMatch_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "AccountingReconciliationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountingBankMatch"
    ADD CONSTRAINT "AccountingBankMatch_statementLineId_fkey"
    FOREIGN KEY ("statementLineId") REFERENCES "AccountingBankStatementLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountingBankMatch"
    ADD CONSTRAINT "AccountingBankMatch_targetDocumentId_fkey"
    FOREIGN KEY ("targetDocumentId") REFERENCES "AccountingDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingBankMatch"
    ADD CONSTRAINT "AccountingBankMatch_targetJournalEntryId_fkey"
    FOREIGN KEY ("targetJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingBankMatch"
    ADD CONSTRAINT "AccountingBankMatch_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

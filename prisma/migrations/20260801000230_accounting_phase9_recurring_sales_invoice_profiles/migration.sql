-- Additive recurring sales-invoice profile lifecycle for Phase 9 sales workflows.
CREATE TABLE "RecurringSalesInvoiceProfile" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "branchId" TEXT,
  "customerId" TEXT NOT NULL,
  "profileName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "frequency" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "startDate" DATE NOT NULL,
  "endDate" DATE,
  "nextInvoiceDate" DATE NOT NULL,
  "lastInvoiceDate" DATE,
  "currencyCode" TEXT NOT NULL DEFAULT 'INR',
  "autoSend" BOOLEAN NOT NULL DEFAULT false,
  "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
  "autoChargeTokenRef" TEXT,
  "paymentTermName" TEXT,
  "subject" TEXT,
  "remarks" TEXT,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "lastFailureAt" TIMESTAMP(3),
  "lastFailureReason" TEXT,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecurringSalesInvoiceProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringSalesInvoiceLine" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "itemName" TEXT NOT NULL,
  "description" TEXT,
  "qty" DECIMAL(20,6) NOT NULL,
  "rate" DECIMAL(20,6) NOT NULL,
  "taxRate" DECIMAL(10,4) NOT NULL DEFAULT 18.0,
  "unit" TEXT,
  "currencyCode" TEXT NOT NULL DEFAULT 'INR',
  "exchangeRate" DECIMAL(20,6) NOT NULL DEFAULT 1.0,
  CONSTRAINT "RecurringSalesInvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringSalesInvoiceRun" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "dueDate" DATE NOT NULL,
  "runStatus" TEXT NOT NULL DEFAULT 'GENERATED',
  "generatedSalesInvoiceId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "resultJson" JSONB,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecurringSalesInvoiceRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecurringSalesInvoiceRun_orgId_profileId_dueDate_key"
ON "RecurringSalesInvoiceRun"("orgId", "profileId", "dueDate");

CREATE UNIQUE INDEX "RecurringSalesInvoiceRun_orgId_idempotencyKey_key"
ON "RecurringSalesInvoiceRun"("orgId", "idempotencyKey");

CREATE INDEX "RecurringSalesInvoiceProfile_orgId_idx"
ON "RecurringSalesInvoiceProfile"("orgId");

CREATE INDEX "RecurringSalesInvoiceProfile_branchId_idx"
ON "RecurringSalesInvoiceProfile"("branchId");

CREATE INDEX "RecurringSalesInvoiceProfile_customerId_idx"
ON "RecurringSalesInvoiceProfile"("customerId");

CREATE INDEX "RecurringSalesInvoiceProfile_orgId_status_nextInvoiceDate_idx"
ON "RecurringSalesInvoiceProfile"("orgId", "status", "nextInvoiceDate");

CREATE INDEX "RecurringSalesInvoiceLine_profileId_idx"
ON "RecurringSalesInvoiceLine"("profileId");

CREATE INDEX "RecurringSalesInvoiceRun_orgId_idx"
ON "RecurringSalesInvoiceRun"("orgId");

CREATE INDEX "RecurringSalesInvoiceRun_profileId_createdAt_idx"
ON "RecurringSalesInvoiceRun"("profileId", "createdAt");

ALTER TABLE "RecurringSalesInvoiceProfile"
ADD CONSTRAINT "RecurringSalesInvoiceProfile_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringSalesInvoiceProfile"
ADD CONSTRAINT "RecurringSalesInvoiceProfile_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RecurringSalesInvoiceProfile"
ADD CONSTRAINT "RecurringSalesInvoiceProfile_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringSalesInvoiceLine"
ADD CONSTRAINT "RecurringSalesInvoiceLine_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "RecurringSalesInvoiceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringSalesInvoiceRun"
ADD CONSTRAINT "RecurringSalesInvoiceRun_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringSalesInvoiceRun"
ADD CONSTRAINT "RecurringSalesInvoiceRun_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "RecurringSalesInvoiceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

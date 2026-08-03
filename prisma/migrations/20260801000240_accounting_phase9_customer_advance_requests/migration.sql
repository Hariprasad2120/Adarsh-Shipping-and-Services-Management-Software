-- CreateTable
CREATE TABLE "AccountingCustomerAdvanceRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "customerId" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "requestType" TEXT NOT NULL DEFAULT 'CUSTOMER_ADVANCE',
    "postingDate" DATE NOT NULL,
    "dueDate" DATE,
    "requestedAmount" DECIMAL(18,4) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "referenceNo" TEXT,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingCustomerAdvanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingCustomerAdvanceReceipt" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,
    "paymentEntryId" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingCustomerAdvanceReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountingCustomerAdvanceRequest_orgId_requestNumber_key" ON "AccountingCustomerAdvanceRequest"("orgId", "requestNumber");

-- CreateIndex
CREATE INDEX "AccountingCustomerAdvanceRequest_orgId_status_postingDate_idx" ON "AccountingCustomerAdvanceRequest"("orgId", "status", "postingDate");

-- CreateIndex
CREATE INDEX "AccountingCustomerAdvanceRequest_branchId_idx" ON "AccountingCustomerAdvanceRequest"("branchId");

-- CreateIndex
CREATE INDEX "AccountingCustomerAdvanceRequest_customerId_idx" ON "AccountingCustomerAdvanceRequest"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingCustomerAdvanceReceipt_paymentEntryId_key" ON "AccountingCustomerAdvanceReceipt"("paymentEntryId");

-- CreateIndex
CREATE INDEX "AccountingCustomerAdvanceReceipt_orgId_advanceId_idx" ON "AccountingCustomerAdvanceReceipt"("orgId", "advanceId");

-- AddForeignKey
ALTER TABLE "AccountingCustomerAdvanceRequest" ADD CONSTRAINT "AccountingCustomerAdvanceRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingCustomerAdvanceRequest" ADD CONSTRAINT "AccountingCustomerAdvanceRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingCustomerAdvanceRequest" ADD CONSTRAINT "AccountingCustomerAdvanceRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingCustomerAdvanceReceipt" ADD CONSTRAINT "AccountingCustomerAdvanceReceipt_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingCustomerAdvanceReceipt" ADD CONSTRAINT "AccountingCustomerAdvanceReceipt_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "AccountingCustomerAdvanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingCustomerAdvanceReceipt" ADD CONSTRAINT "AccountingCustomerAdvanceReceipt_paymentEntryId_fkey" FOREIGN KEY ("paymentEntryId") REFERENCES "PaymentEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

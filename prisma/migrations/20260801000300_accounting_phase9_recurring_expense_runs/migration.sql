-- AlterTable
ALTER TABLE "RecurringExpense"
ADD COLUMN "paymentMethod" TEXT,
ADD COLUMN "paymentTermName" TEXT;

-- CreateTable
CREATE TABLE "RecurringExpenseRun" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "runStatus" TEXT NOT NULL,
    "generatedPurchaseInvoiceId" TEXT,
    "failureReason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringExpenseRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecurringExpenseRun_orgId_idempotencyKey_key" ON "RecurringExpenseRun"("orgId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "RecurringExpenseRun_orgId_templateId_dueDate_idx" ON "RecurringExpenseRun"("orgId", "templateId", "dueDate");

-- AddForeignKey
ALTER TABLE "RecurringExpenseRun" ADD CONSTRAINT "RecurringExpenseRun_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpenseRun" ADD CONSTRAINT "RecurringExpenseRun_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RecurringExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

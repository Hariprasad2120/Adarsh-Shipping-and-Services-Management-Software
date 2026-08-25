-- Payroll loan EMI recovery: GL account credited when a payroll-deducted
-- EMI is posted. Falls back to defaultSalaryPayableAccountId when unset.
ALTER TABLE "AccountingSettings" ADD COLUMN "employeeLoanReceivableAccountId" TEXT;

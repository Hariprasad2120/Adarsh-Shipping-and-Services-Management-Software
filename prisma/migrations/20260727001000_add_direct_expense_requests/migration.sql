-- Support direct expense requests that may or may not be linked to a CHA job.
ALTER TABLE "ChaExpenseRequest"
ALTER COLUMN "jobId" DROP NOT NULL,
ADD COLUMN "expenseScope" TEXT NOT NULL DEFAULT 'JOB',
ADD COLUMN "directPurpose" TEXT,
ADD COLUMN "approvalRoute" TEXT NOT NULL DEFAULT 'MANAGER_THEN_ACCOUNTS',
ADD COLUMN "routedManagerId" TEXT;

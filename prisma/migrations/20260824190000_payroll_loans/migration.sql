-- Payroll Phase 22: employee loans
CREATE TABLE "PayrollLoan" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "loanNumber" TEXT NOT NULL,
    "loanName" TEXT NOT NULL,
    "principalAmount" DOUBLE PRECISION NOT NULL,
    "emiAmount" DOUBLE PRECISION NOT NULL,
    "disbursedAt" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollLoan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayrollLoanRepayment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "repaymentDate" DATE NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollLoanRepayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayrollLoan_orgId_loanNumber_key" ON "PayrollLoan"("orgId", "loanNumber");
CREATE INDEX "PayrollLoan_orgId_employeeId_idx" ON "PayrollLoan"("orgId", "employeeId");
CREATE INDEX "PayrollLoanRepayment_loanId_idx" ON "PayrollLoanRepayment"("loanId");

ALTER TABLE "PayrollLoanRepayment" ADD CONSTRAINT "PayrollLoanRepayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "PayrollLoan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Payroll Phase 12: FBP eligibility flag on salary components
ALTER TABLE "SalaryComponent" ADD COLUMN "fbpEligible" BOOLEAN NOT NULL DEFAULT false;

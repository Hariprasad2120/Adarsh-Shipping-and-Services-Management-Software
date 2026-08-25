-- Payroll Phase 26: statutory EPF configuration
CREATE TABLE "PayrollStatutoryEpfConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "epfNumber" TEXT,
    "deductionCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "employeeContributionPercent" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "employerContributionPercent" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "restrictToWageCeiling" BOOLEAN NOT NULL DEFAULT true,
    "wageCeiling" DOUBLE PRECISION NOT NULL DEFAULT 15000,
    "includeEmployerPfInCtc" BOOLEAN NOT NULL DEFAULT true,
    "includeEdliInCtc" BOOLEAN NOT NULL DEFAULT true,
    "includeAdminChargesInCtc" BOOLEAN NOT NULL DEFAULT true,
    "allowEmployeeOverride" BOOLEAN NOT NULL DEFAULT false,
    "prorateRestrictedWage" BOOLEAN NOT NULL DEFAULT true,
    "considerLopForApplicability" BOOLEAN NOT NULL DEFAULT false,
    "eligibleForAbry" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollStatutoryEpfConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayrollStatutoryEpfConfig_orgId_key" ON "PayrollStatutoryEpfConfig"("orgId");

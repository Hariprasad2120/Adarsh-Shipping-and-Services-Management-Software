-- PT, LWF, Bonus, annual tax slabs, Form16 filing status, and scoped
-- payroll automation.

CREATE TABLE "PayrollStatutoryPtSlab" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "minGross" DOUBLE PRECISION NOT NULL,
    "maxGross" DOUBLE PRECISION,
    "monthlyAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollStatutoryPtSlab_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PayrollStatutoryPtSlab_orgId_state_idx" ON "PayrollStatutoryPtSlab"("orgId", "state");

CREATE TABLE "PayrollStatutoryLwfConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "employeeAmount" DOUBLE PRECISION NOT NULL,
    "employerAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollStatutoryLwfConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayrollStatutoryLwfConfig_orgId_state_key" ON "PayrollStatutoryLwfConfig"("orgId", "state");

CREATE TABLE "PayrollStatutoryBonusConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "percent" DOUBLE PRECISION NOT NULL DEFAULT 8.33,
    "eligibilityWageCeiling" DOUBLE PRECISION NOT NULL DEFAULT 21000,
    "calculationWageCeiling" DOUBLE PRECISION NOT NULL DEFAULT 7000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollStatutoryBonusConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayrollStatutoryBonusConfig_orgId_key" ON "PayrollStatutoryBonusConfig"("orgId");

CREATE TABLE "PayrollStatutoryTaxSlab" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "regime" TEXT NOT NULL,
    "minIncome" DOUBLE PRECISION NOT NULL,
    "maxIncome" DOUBLE PRECISION,
    "ratePercent" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollStatutoryTaxSlab_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PayrollStatutoryTaxSlab_orgId_fiscalYear_regime_idx" ON "PayrollStatutoryTaxSlab"("orgId", "fiscalYear", "regime");

CREATE TABLE "PayrollStatutoryTaxRegimeConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "regime" TEXT NOT NULL,
    "standardDeduction" DOUBLE PRECISION NOT NULL,
    "rebateThreshold" DOUBLE PRECISION NOT NULL,
    "cessPercent" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollStatutoryTaxRegimeConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayrollStatutoryTaxRegimeConfig_orgId_fiscalYear_regime_key" ON "PayrollStatutoryTaxRegimeConfig"("orgId", "fiscalYear", "regime");

CREATE TABLE "PayrollForm16Filing" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_FILED',
    "generatedAt" TIMESTAMP(3),
    "filedAt" TIMESTAMP(3),
    "acknowledgementNumber" TEXT,
    "filedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollForm16Filing_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayrollForm16Filing_orgId_employeeId_fiscalYear_key" ON "PayrollForm16Filing"("orgId", "employeeId", "fiscalYear");
CREATE INDEX "PayrollForm16Filing_orgId_fiscalYear_idx" ON "PayrollForm16Filing"("orgId", "fiscalYear");

CREATE TABLE "PayrollAutomationRule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "actionType" TEXT NOT NULL,
    "actionConfig" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollAutomationRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PayrollAutomationRule_orgId_trigger_enabled_idx" ON "PayrollAutomationRule"("orgId", "trigger", "enabled");

CREATE TABLE "PayrollAutomationLog" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "detail" TEXT,

    CONSTRAINT "PayrollAutomationLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PayrollAutomationLog_orgId_triggeredAt_idx" ON "PayrollAutomationLog"("orgId", "triggeredAt");
CREATE INDEX "PayrollAutomationLog_ruleId_triggeredAt_idx" ON "PayrollAutomationLog"("ruleId", "triggeredAt");

ALTER TABLE "PayrollAutomationLog" ADD CONSTRAINT "PayrollAutomationLog_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "PayrollAutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountingSettings" ADD COLUMN "lwfPayableAccountId" TEXT;
ALTER TABLE "AccountingSettings" ADD COLUMN "bonusPayableAccountId" TEXT;

-- Payroll Phase 9: pay schedule
CREATE TABLE "PayrollScheduleSettings" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "payFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "workingDays" TEXT[],
    "payDayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "firstPayPeriod" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollScheduleSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayrollScheduleSettings_orgId_key" ON "PayrollScheduleSettings"("orgId");

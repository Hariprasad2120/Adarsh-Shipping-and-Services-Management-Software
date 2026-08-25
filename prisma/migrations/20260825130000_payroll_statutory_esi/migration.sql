-- ESI statutory config: nationally uniform rates, safe to default (unlike
-- PT/LWF which are state-specific).
CREATE TABLE "PayrollStatutoryEsiConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "employeeContributionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "employerContributionPercent" DOUBLE PRECISION NOT NULL DEFAULT 3.25,
    "wageCeiling" DOUBLE PRECISION NOT NULL DEFAULT 21000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollStatutoryEsiConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayrollStatutoryEsiConfig_orgId_key" ON "PayrollStatutoryEsiConfig"("orgId");

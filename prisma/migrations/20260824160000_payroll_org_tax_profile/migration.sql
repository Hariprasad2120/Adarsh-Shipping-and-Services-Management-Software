-- Payroll Phase 11: organisation TDS deductor profile
CREATE TABLE "PayrollOrganisationTaxProfile" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "pan" TEXT,
    "tan" TEXT,
    "tdsCircleAoCode" TEXT,
    "taxPaymentFrequency" TEXT,
    "deductorType" TEXT,
    "deductorName" TEXT,
    "deductorFatherName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollOrganisationTaxProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayrollOrganisationTaxProfile_orgId_key" ON "PayrollOrganisationTaxProfile"("orgId");

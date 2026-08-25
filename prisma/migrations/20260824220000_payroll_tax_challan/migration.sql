-- Payroll Phase 31: tax payment challans
CREATE TABLE "PayrollTaxChallan" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "challanNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" DATE NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollTaxChallan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayrollTaxChallanAssociation" (
    "id" TEXT NOT NULL,
    "challanId" TEXT NOT NULL,
    "liabilityMonth" DATE NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollTaxChallanAssociation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayrollTaxChallan_orgId_challanNumber_key" ON "PayrollTaxChallan"("orgId", "challanNumber");
CREATE INDEX "PayrollTaxChallan_orgId_idx" ON "PayrollTaxChallan"("orgId");
CREATE INDEX "PayrollTaxChallanAssociation_challanId_idx" ON "PayrollTaxChallanAssociation"("challanId");

ALTER TABLE "PayrollTaxChallanAssociation" ADD CONSTRAINT "PayrollTaxChallanAssociation_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "PayrollTaxChallan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

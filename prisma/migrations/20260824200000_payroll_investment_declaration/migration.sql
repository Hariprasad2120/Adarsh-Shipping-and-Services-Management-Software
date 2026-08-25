-- Payroll Phase 24-25: IT declaration / proof of investment
CREATE TABLE "EmployeeInvestmentDeclaration" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "taxRegime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeInvestmentDeclaration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployeeInvestmentDeclarationLine" (
    "id" TEXT NOT NULL,
    "declarationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "declaredAmount" DOUBLE PRECISION NOT NULL,
    "approvedAmount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeInvestmentDeclarationLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmployeeInvestmentDeclaration_orgId_employeeId_fiscalYear_key" ON "EmployeeInvestmentDeclaration"("orgId", "employeeId", "fiscalYear");
CREATE INDEX "EmployeeInvestmentDeclarationLine_declarationId_idx" ON "EmployeeInvestmentDeclarationLine"("declarationId");

ALTER TABLE "EmployeeInvestmentDeclarationLine" ADD CONSTRAINT "EmployeeInvestmentDeclarationLine_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "EmployeeInvestmentDeclaration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

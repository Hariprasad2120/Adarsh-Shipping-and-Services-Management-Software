-- Payroll Phase 7: configurable salary components
CREATE TABLE "SalaryComponent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "calculationType" TEXT NOT NULL,
    "percentOfBasic" DOUBLE PRECISION,
    "considerForEpf" BOOLEAN NOT NULL DEFAULT false,
    "considerForEsi" BOOLEAN NOT NULL DEFAULT false,
    "includeInCtc" BOOLEAN NOT NULL DEFAULT true,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryComponent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalaryComponent_orgId_category_name_key" ON "SalaryComponent"("orgId", "category", "name");

CREATE INDEX "SalaryComponent_orgId_category_idx" ON "SalaryComponent"("orgId", "category");

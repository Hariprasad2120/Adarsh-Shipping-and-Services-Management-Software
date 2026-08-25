-- Payroll Phase 8: salary templates
CREATE TABLE "SalaryTemplate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalaryTemplateComponent" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "salaryComponentId" TEXT NOT NULL,
    "monthlyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SalaryTemplateComponent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalaryTemplate_orgId_name_key" ON "SalaryTemplate"("orgId", "name");
CREATE INDEX "SalaryTemplate_orgId_idx" ON "SalaryTemplate"("orgId");

CREATE UNIQUE INDEX "SalaryTemplateComponent_templateId_salaryComponentId_key" ON "SalaryTemplateComponent"("templateId", "salaryComponentId");
CREATE INDEX "SalaryTemplateComponent_templateId_idx" ON "SalaryTemplateComponent"("templateId");

ALTER TABLE "SalaryTemplateComponent" ADD CONSTRAINT "SalaryTemplateComponent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SalaryTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalaryTemplateComponent" ADD CONSTRAINT "SalaryTemplateComponent_salaryComponentId_fkey" FOREIGN KEY ("salaryComponentId") REFERENCES "SalaryComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

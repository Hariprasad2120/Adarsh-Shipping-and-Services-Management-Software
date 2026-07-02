-- Add filingFlowCategory to ChaJobType
ALTER TABLE "ChaJobType"
  ADD COLUMN "filingFlowCategory" TEXT;

-- Add filingFlowCategory to FilingWorkflowTemplate
ALTER TABLE "FilingWorkflowTemplate"
  ADD COLUMN "filingFlowCategory" TEXT;

-- Add index for fast template lookup by org + flow category
CREATE INDEX "FilingWorkflowTemplate_orgId_filingFlowCategory_idx" ON "FilingWorkflowTemplate"("orgId", "filingFlowCategory");

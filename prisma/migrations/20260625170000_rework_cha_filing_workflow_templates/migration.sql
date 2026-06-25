ALTER TABLE "FilingWorkflowTemplate"
ADD COLUMN "clearanceTypeId" TEXT;

ALTER TABLE "FilingWorkflowNode"
ADD COLUMN "nodeType" TEXT NOT NULL DEFAULT 'CHECKLIST_NODE',
ADD COLUMN "sectionKey" TEXT,
ADD COLUMN "sectionName" TEXT,
ADD COLUMN "branchKey" TEXT,
ADD COLUMN "branchName" TEXT,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "approvalRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "FilingWorkflowTemplate_clearanceTypeId_idx" ON "FilingWorkflowTemplate"("clearanceTypeId");

ALTER TABLE "FilingWorkflowTemplate"
ADD CONSTRAINT "FilingWorkflowTemplate_clearanceTypeId_fkey"
FOREIGN KEY ("clearanceTypeId") REFERENCES "ChaJobType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

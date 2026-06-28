-- Performance: add composite indexes for FilingWorkflowVersion ordering queries
CREATE INDEX IF NOT EXISTS "FilingWorkflowVersion_templateId_versionNumber_idx"
  ON "FilingWorkflowVersion"("templateId", "versionNumber");

CREATE INDEX IF NOT EXISTS "FilingWorkflowVersion_templateId_isPublished_idx"
  ON "FilingWorkflowVersion"("templateId", "isPublished");

-- Performance: add status index for FilingWorkflowInstance
CREATE INDEX IF NOT EXISTS "FilingWorkflowInstance_status_idx"
  ON "FilingWorkflowInstance"("status");

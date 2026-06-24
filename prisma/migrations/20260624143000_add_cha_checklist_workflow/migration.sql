-- Add file-based CHA checklist workflow without disturbing legacy checklist import records.

CREATE TABLE "ChaChecklist" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "currentFileVersionId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING_UPLOAD',
  "currentApprovalStage" TEXT NOT NULL DEFAULT 'UPLOAD',
  "customerApprovalAttempted" BOOLEAN NOT NULL DEFAULT false,
  "customerRejectedOnce" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ChaChecklist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChaChecklistFileVersion" (
  "id" TEXT NOT NULL,
  "checklistId" TEXT NOT NULL,
  "fileKey" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "versionNumber" INTEGER NOT NULL,
  "remarks" TEXT,

  CONSTRAINT "ChaChecklistFileVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChaChecklistDecision" (
  "id" TEXT NOT NULL,
  "checklistId" TEXT NOT NULL,
  "fileVersionId" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "action" TEXT NOT NULL DEFAULT 'PENDING',
  "remarks" TEXT,
  "actedById" TEXT,
  "assignedToId" TEXT,
  "actedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ChaChecklistDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChaChecklist_jobId_key" ON "ChaChecklist"("jobId");
CREATE INDEX "ChaChecklist_status_idx" ON "ChaChecklist"("status");
CREATE INDEX "ChaChecklist_currentApprovalStage_idx" ON "ChaChecklist"("currentApprovalStage");
CREATE UNIQUE INDEX "ChaChecklistFileVersion_checklistId_versionNumber_key" ON "ChaChecklistFileVersion"("checklistId", "versionNumber");
CREATE INDEX "ChaChecklistFileVersion_checklistId_uploadedAt_idx" ON "ChaChecklistFileVersion"("checklistId", "uploadedAt");
CREATE INDEX "ChaChecklistDecision_checklistId_stage_action_idx" ON "ChaChecklistDecision"("checklistId", "stage", "action");
CREATE INDEX "ChaChecklistDecision_fileVersionId_idx" ON "ChaChecklistDecision"("fileVersionId");
CREATE INDEX "ChaChecklistDecision_assignedToId_action_idx" ON "ChaChecklistDecision"("assignedToId", "action");

ALTER TABLE "ChaChecklist"
ADD CONSTRAINT "ChaChecklist_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChaChecklistFileVersion"
ADD CONSTRAINT "ChaChecklistFileVersion_checklistId_fkey"
FOREIGN KEY ("checklistId") REFERENCES "ChaChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChaChecklistDecision"
ADD CONSTRAINT "ChaChecklistDecision_checklistId_fkey"
FOREIGN KEY ("checklistId") REFERENCES "ChaChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChaChecklistDecision"
ADD CONSTRAINT "ChaChecklistDecision_fileVersionId_fkey"
FOREIGN KEY ("fileVersionId") REFERENCES "ChaChecklistFileVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChaChecklist"
ADD CONSTRAINT "ChaChecklist_currentFileVersionId_fkey"
FOREIGN KEY ("currentFileVersionId") REFERENCES "ChaChecklistFileVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

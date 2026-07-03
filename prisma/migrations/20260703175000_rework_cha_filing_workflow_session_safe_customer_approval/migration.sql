-- AlterTable
ALTER TABLE "CrmContact" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "purpose" TEXT;

-- AlterTable
ALTER TABLE "ChaChecklist" ADD COLUMN     "customerApprovalVisibleAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FilingWorkflowTemplate" ADD COLUMN     "mailTemplatesJson" JSONB,
ADD COLUMN     "settingsJson" JSONB;

-- AlterTable
ALTER TABLE "FilingWorkflowNode" ADD COLUMN     "actionConfigJson" JSONB,
ADD COLUMN     "approvalConfigJson" JSONB,
ADD COLUMN     "conditionalSectionsJson" JSONB,
ADD COLUMN     "documentRequirementsJson" JSONB,
ADD COLUMN     "fieldDefinitionsJson" JSONB,
ADD COLUMN     "notificationConfigJson" JSONB;

-- AlterTable
ALTER TABLE "FilingWorkflowEdge" ADD COLUMN     "requiresReason" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transitionConfigJson" JSONB,
ADD COLUMN     "transitionType" TEXT NOT NULL DEFAULT 'FORWARD';

-- AlterTable
ALTER TABLE "FilingWorkflowInstance" ADD COLUMN     "contextJson" JSONB;

-- AlterTable
ALTER TABLE "FilingNodeRun" ADD COLUMN     "resolutionJson" JSONB;

-- AlterTable
ALTER TABLE "FilingAttachment" ADD COLUMN     "conditionalSectionKey" TEXT,
ADD COLUMN     "documentRequirementKey" TEXT,
ADD COLUMN     "documentRequirementLabel" TEXT;

-- CreateTable
CREATE TABLE "ChaChecklistMailLog" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "fileVersionId" TEXT NOT NULL,
    "sentById" TEXT NOT NULL,
    "recipients" TEXT[],
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentFileKey" TEXT,
    "attachmentFileName" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvalVisibleAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'CHA_CHECKLIST',

    CONSTRAINT "ChaChecklistMailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilingFieldValue" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "nodeRunId" TEXT,
    "nodeId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "valueJson" JSONB,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilingFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilingToggleState" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "nodeRunId" TEXT,
    "nodeId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "stateJson" JSONB,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilingToggleState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilingWorkflowQuery" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "nodeRunId" TEXT,
    "nodeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reminderTime" TEXT,
    "lastReminderAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "closedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilingWorkflowQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChaChecklistMailLog_checklistId_sentAt_idx" ON "ChaChecklistMailLog"("checklistId", "sentAt");

-- CreateIndex
CREATE INDEX "ChaChecklistMailLog_fileVersionId_idx" ON "ChaChecklistMailLog"("fileVersionId");

-- CreateIndex
CREATE INDEX "ChaChecklistMailLog_sentById_idx" ON "ChaChecklistMailLog"("sentById");

-- CreateIndex
CREATE INDEX "FilingFieldValue_nodeRunId_idx" ON "FilingFieldValue"("nodeRunId");

-- CreateIndex
CREATE INDEX "FilingFieldValue_updatedById_idx" ON "FilingFieldValue"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "FilingFieldValue_instanceId_nodeId_fieldKey_key" ON "FilingFieldValue"("instanceId", "nodeId", "fieldKey");

-- CreateIndex
CREATE INDEX "FilingToggleState_nodeRunId_idx" ON "FilingToggleState"("nodeRunId");

-- CreateIndex
CREATE INDEX "FilingToggleState_updatedById_idx" ON "FilingToggleState"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "FilingToggleState_instanceId_nodeId_sectionKey_key" ON "FilingToggleState"("instanceId", "nodeId", "sectionKey");

-- CreateIndex
CREATE INDEX "FilingWorkflowQuery_instanceId_status_idx" ON "FilingWorkflowQuery"("instanceId", "status");

-- CreateIndex
CREATE INDEX "FilingWorkflowQuery_nodeRunId_idx" ON "FilingWorkflowQuery"("nodeRunId");

-- AddForeignKey
ALTER TABLE "ChaChecklistMailLog" ADD CONSTRAINT "ChaChecklistMailLog_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "ChaChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaChecklistMailLog" ADD CONSTRAINT "ChaChecklistMailLog_fileVersionId_fkey" FOREIGN KEY ("fileVersionId") REFERENCES "ChaChecklistFileVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaChecklistMailLog" ADD CONSTRAINT "ChaChecklistMailLog_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingFieldValue" ADD CONSTRAINT "FilingFieldValue_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "FilingWorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingFieldValue" ADD CONSTRAINT "FilingFieldValue_nodeRunId_fkey" FOREIGN KEY ("nodeRunId") REFERENCES "FilingNodeRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingFieldValue" ADD CONSTRAINT "FilingFieldValue_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "FilingWorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingFieldValue" ADD CONSTRAINT "FilingFieldValue_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingToggleState" ADD CONSTRAINT "FilingToggleState_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "FilingWorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingToggleState" ADD CONSTRAINT "FilingToggleState_nodeRunId_fkey" FOREIGN KEY ("nodeRunId") REFERENCES "FilingNodeRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingToggleState" ADD CONSTRAINT "FilingToggleState_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "FilingWorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingToggleState" ADD CONSTRAINT "FilingToggleState_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingWorkflowQuery" ADD CONSTRAINT "FilingWorkflowQuery_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "FilingWorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingWorkflowQuery" ADD CONSTRAINT "FilingWorkflowQuery_nodeRunId_fkey" FOREIGN KEY ("nodeRunId") REFERENCES "FilingNodeRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingWorkflowQuery" ADD CONSTRAINT "FilingWorkflowQuery_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "FilingWorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingWorkflowQuery" ADD CONSTRAINT "FilingWorkflowQuery_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingWorkflowQuery" ADD CONSTRAINT "FilingWorkflowQuery_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


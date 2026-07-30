-- Historical repair:
-- Commit 56c5815a introduced the filing-workflow models, but its committed
-- migration only altered tables that had been created outside migration
-- history. Create the evidenced baseline immediately before the first ALTER.
--
-- IF NOT EXISTS keeps this additive migration safe for databases where the
-- original migrations were already applied against out-of-band tables. The
-- existing migrations remain unchanged so their deployed checksums are stable.

CREATE TABLE IF NOT EXISTS "FilingWorkflowTemplate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilingWorkflowTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FilingWorkflowVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilingWorkflowVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FilingWorkflowNode" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isStart" BOOLEAN NOT NULL DEFAULT false,
    "slaDuration" INTEGER NOT NULL DEFAULT 2,
    "slaUnit" TEXT NOT NULL DEFAULT 'BUSINESS_DAYS',
    "commentsRequired" BOOLEAN NOT NULL DEFAULT false,
    "canBeSkipped" BOOLEAN NOT NULL DEFAULT false,
    "canBeRevisited" BOOLEAN NOT NULL DEFAULT true,
    "requireAllMandatoryChecklistItems" BOOLEAN NOT NULL DEFAULT true,
    "requireMandatoryPhotos" BOOLEAN NOT NULL DEFAULT true,
    "allowedRoles" TEXT[] NOT NULL,

    CONSTRAINT "FilingWorkflowNode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FilingWorkflowEdge" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "targetKey" TEXT NOT NULL,
    "label" TEXT,

    CONSTRAINT "FilingWorkflowEdge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FilingChecklistItem" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "requiresRemarks" BOOLEAN NOT NULL DEFAULT false,
    "allowsUpload" BOOLEAN NOT NULL DEFAULT false,
    "hasPhotoRequirement" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FilingChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FilingPhotoRequirement" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "minPhotos" INTEGER NOT NULL DEFAULT 1,
    "maxPhotos" INTEGER,
    "acceptedFileTypes" TEXT[] NOT NULL,
    "isVisibleInTimeline" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FilingPhotoRequirement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FilingWorkflowInstance" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentNodeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilingWorkflowInstance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FilingNodeRun" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "slaDueDate" TIMESTAMP(3),
    "completedById" TEXT,
    "remarks" TEXT,

    CONSTRAINT "FilingNodeRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FilingChecklistResponse" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "nodeRunId" TEXT,
    "checklistItemId" TEXT NOT NULL,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "fileKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilingChecklistResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FilingAttachment" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "nodeRunId" TEXT,
    "photoRequirementId" TEXT,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilingAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FilingSection49Flag" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "toggledById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilingSection49Flag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FilingWorkflowTemplate_orgId_name_key"
    ON "FilingWorkflowTemplate"("orgId", "name");
CREATE INDEX IF NOT EXISTS "FilingWorkflowTemplate_orgId_idx"
    ON "FilingWorkflowTemplate"("orgId");

CREATE UNIQUE INDEX IF NOT EXISTS "FilingWorkflowVersion_templateId_versionNumber_key"
    ON "FilingWorkflowVersion"("templateId", "versionNumber");
CREATE INDEX IF NOT EXISTS "FilingWorkflowVersion_templateId_idx"
    ON "FilingWorkflowVersion"("templateId");

CREATE UNIQUE INDEX IF NOT EXISTS "FilingWorkflowNode_versionId_key_key"
    ON "FilingWorkflowNode"("versionId", "key");
CREATE INDEX IF NOT EXISTS "FilingWorkflowNode_versionId_idx"
    ON "FilingWorkflowNode"("versionId");

CREATE UNIQUE INDEX IF NOT EXISTS "FilingWorkflowEdge_versionId_sourceKey_targetKey_key"
    ON "FilingWorkflowEdge"("versionId", "sourceKey", "targetKey");
CREATE INDEX IF NOT EXISTS "FilingWorkflowEdge_versionId_idx"
    ON "FilingWorkflowEdge"("versionId");

CREATE INDEX IF NOT EXISTS "FilingChecklistItem_nodeId_idx"
    ON "FilingChecklistItem"("nodeId");
CREATE INDEX IF NOT EXISTS "FilingPhotoRequirement_nodeId_idx"
    ON "FilingPhotoRequirement"("nodeId");

CREATE UNIQUE INDEX IF NOT EXISTS "FilingWorkflowInstance_jobId_key"
    ON "FilingWorkflowInstance"("jobId");
CREATE INDEX IF NOT EXISTS "FilingWorkflowInstance_jobId_idx"
    ON "FilingWorkflowInstance"("jobId");
CREATE INDEX IF NOT EXISTS "FilingWorkflowInstance_templateId_idx"
    ON "FilingWorkflowInstance"("templateId");
CREATE INDEX IF NOT EXISTS "FilingWorkflowInstance_versionId_idx"
    ON "FilingWorkflowInstance"("versionId");

CREATE INDEX IF NOT EXISTS "FilingNodeRun_instanceId_idx"
    ON "FilingNodeRun"("instanceId");
CREATE INDEX IF NOT EXISTS "FilingNodeRun_nodeId_idx"
    ON "FilingNodeRun"("nodeId");
CREATE INDEX IF NOT EXISTS "FilingNodeRun_completedById_idx"
    ON "FilingNodeRun"("completedById");

CREATE UNIQUE INDEX IF NOT EXISTS "FilingChecklistResponse_instanceId_checklistItemId_key"
    ON "FilingChecklistResponse"("instanceId", "checklistItemId");
CREATE INDEX IF NOT EXISTS "FilingChecklistResponse_instanceId_idx"
    ON "FilingChecklistResponse"("instanceId");
CREATE INDEX IF NOT EXISTS "FilingChecklistResponse_checklistItemId_idx"
    ON "FilingChecklistResponse"("checklistItemId");

CREATE INDEX IF NOT EXISTS "FilingAttachment_instanceId_idx"
    ON "FilingAttachment"("instanceId");
CREATE INDEX IF NOT EXISTS "FilingAttachment_photoRequirementId_idx"
    ON "FilingAttachment"("photoRequirementId");
CREATE INDEX IF NOT EXISTS "FilingAttachment_uploadedById_idx"
    ON "FilingAttachment"("uploadedById");

CREATE UNIQUE INDEX IF NOT EXISTS "FilingSection49Flag_jobId_key"
    ON "FilingSection49Flag"("jobId");
CREATE INDEX IF NOT EXISTS "FilingSection49Flag_jobId_idx"
    ON "FilingSection49Flag"("jobId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingWorkflowTemplate_orgId_fkey'
          AND conrelid = '"FilingWorkflowTemplate"'::regclass
    ) THEN
        ALTER TABLE "FilingWorkflowTemplate"
        ADD CONSTRAINT "FilingWorkflowTemplate_orgId_fkey"
        FOREIGN KEY ("orgId") REFERENCES "Organisation"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingWorkflowVersion_templateId_fkey'
          AND conrelid = '"FilingWorkflowVersion"'::regclass
    ) THEN
        ALTER TABLE "FilingWorkflowVersion"
        ADD CONSTRAINT "FilingWorkflowVersion_templateId_fkey"
        FOREIGN KEY ("templateId") REFERENCES "FilingWorkflowTemplate"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingWorkflowNode_versionId_fkey'
          AND conrelid = '"FilingWorkflowNode"'::regclass
    ) THEN
        ALTER TABLE "FilingWorkflowNode"
        ADD CONSTRAINT "FilingWorkflowNode_versionId_fkey"
        FOREIGN KEY ("versionId") REFERENCES "FilingWorkflowVersion"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingWorkflowEdge_versionId_fkey'
          AND conrelid = '"FilingWorkflowEdge"'::regclass
    ) THEN
        ALTER TABLE "FilingWorkflowEdge"
        ADD CONSTRAINT "FilingWorkflowEdge_versionId_fkey"
        FOREIGN KEY ("versionId") REFERENCES "FilingWorkflowVersion"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingChecklistItem_nodeId_fkey'
          AND conrelid = '"FilingChecklistItem"'::regclass
    ) THEN
        ALTER TABLE "FilingChecklistItem"
        ADD CONSTRAINT "FilingChecklistItem_nodeId_fkey"
        FOREIGN KEY ("nodeId") REFERENCES "FilingWorkflowNode"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingPhotoRequirement_nodeId_fkey'
          AND conrelid = '"FilingPhotoRequirement"'::regclass
    ) THEN
        ALTER TABLE "FilingPhotoRequirement"
        ADD CONSTRAINT "FilingPhotoRequirement_nodeId_fkey"
        FOREIGN KEY ("nodeId") REFERENCES "FilingWorkflowNode"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingWorkflowInstance_jobId_fkey'
          AND conrelid = '"FilingWorkflowInstance"'::regclass
    ) THEN
        ALTER TABLE "FilingWorkflowInstance"
        ADD CONSTRAINT "FilingWorkflowInstance_jobId_fkey"
        FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingWorkflowInstance_templateId_fkey'
          AND conrelid = '"FilingWorkflowInstance"'::regclass
    ) THEN
        ALTER TABLE "FilingWorkflowInstance"
        ADD CONSTRAINT "FilingWorkflowInstance_templateId_fkey"
        FOREIGN KEY ("templateId") REFERENCES "FilingWorkflowTemplate"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingWorkflowInstance_versionId_fkey'
          AND conrelid = '"FilingWorkflowInstance"'::regclass
    ) THEN
        ALTER TABLE "FilingWorkflowInstance"
        ADD CONSTRAINT "FilingWorkflowInstance_versionId_fkey"
        FOREIGN KEY ("versionId") REFERENCES "FilingWorkflowVersion"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingNodeRun_instanceId_fkey'
          AND conrelid = '"FilingNodeRun"'::regclass
    ) THEN
        ALTER TABLE "FilingNodeRun"
        ADD CONSTRAINT "FilingNodeRun_instanceId_fkey"
        FOREIGN KEY ("instanceId") REFERENCES "FilingWorkflowInstance"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingNodeRun_nodeId_fkey'
          AND conrelid = '"FilingNodeRun"'::regclass
    ) THEN
        ALTER TABLE "FilingNodeRun"
        ADD CONSTRAINT "FilingNodeRun_nodeId_fkey"
        FOREIGN KEY ("nodeId") REFERENCES "FilingWorkflowNode"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingNodeRun_completedById_fkey'
          AND conrelid = '"FilingNodeRun"'::regclass
    ) THEN
        ALTER TABLE "FilingNodeRun"
        ADD CONSTRAINT "FilingNodeRun_completedById_fkey"
        FOREIGN KEY ("completedById") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingChecklistResponse_instanceId_fkey'
          AND conrelid = '"FilingChecklistResponse"'::regclass
    ) THEN
        ALTER TABLE "FilingChecklistResponse"
        ADD CONSTRAINT "FilingChecklistResponse_instanceId_fkey"
        FOREIGN KEY ("instanceId") REFERENCES "FilingWorkflowInstance"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingChecklistResponse_nodeRunId_fkey'
          AND conrelid = '"FilingChecklistResponse"'::regclass
    ) THEN
        ALTER TABLE "FilingChecklistResponse"
        ADD CONSTRAINT "FilingChecklistResponse_nodeRunId_fkey"
        FOREIGN KEY ("nodeRunId") REFERENCES "FilingNodeRun"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingChecklistResponse_checklistItemId_fkey'
          AND conrelid = '"FilingChecklistResponse"'::regclass
    ) THEN
        ALTER TABLE "FilingChecklistResponse"
        ADD CONSTRAINT "FilingChecklistResponse_checklistItemId_fkey"
        FOREIGN KEY ("checklistItemId") REFERENCES "FilingChecklistItem"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingAttachment_instanceId_fkey'
          AND conrelid = '"FilingAttachment"'::regclass
    ) THEN
        ALTER TABLE "FilingAttachment"
        ADD CONSTRAINT "FilingAttachment_instanceId_fkey"
        FOREIGN KEY ("instanceId") REFERENCES "FilingWorkflowInstance"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingAttachment_nodeRunId_fkey'
          AND conrelid = '"FilingAttachment"'::regclass
    ) THEN
        ALTER TABLE "FilingAttachment"
        ADD CONSTRAINT "FilingAttachment_nodeRunId_fkey"
        FOREIGN KEY ("nodeRunId") REFERENCES "FilingNodeRun"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingAttachment_photoRequirementId_fkey'
          AND conrelid = '"FilingAttachment"'::regclass
    ) THEN
        ALTER TABLE "FilingAttachment"
        ADD CONSTRAINT "FilingAttachment_photoRequirementId_fkey"
        FOREIGN KEY ("photoRequirementId") REFERENCES "FilingPhotoRequirement"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingAttachment_uploadedById_fkey'
          AND conrelid = '"FilingAttachment"'::regclass
    ) THEN
        ALTER TABLE "FilingAttachment"
        ADD CONSTRAINT "FilingAttachment_uploadedById_fkey"
        FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingSection49Flag_jobId_fkey'
          AND conrelid = '"FilingSection49Flag"'::regclass
    ) THEN
        ALTER TABLE "FilingSection49Flag"
        ADD CONSTRAINT "FilingSection49Flag_jobId_fkey"
        FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'FilingSection49Flag_toggledById_fkey'
          AND conrelid = '"FilingSection49Flag"'::regclass
    ) THEN
        ALTER TABLE "FilingSection49Flag"
        ADD CONSTRAINT "FilingSection49Flag_toggledById_fkey"
        FOREIGN KEY ("toggledById") REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END
$$;

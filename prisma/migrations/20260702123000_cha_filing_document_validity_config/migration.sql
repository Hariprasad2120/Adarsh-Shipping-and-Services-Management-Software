ALTER TABLE "ChaDocumentRequirementItem"
  ADD COLUMN "acceptedFileTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "minUploadCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "maxUploadCount" INTEGER,
  ADD COLUMN "requiresValidityDate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "defaultValidityDuration" INTEGER,
  ADD COLUMN "defaultValidityUnit" TEXT,
  ADD COLUMN "warningBeforeDuration" INTEGER,
  ADD COLUMN "warningBeforeUnit" TEXT,
  ADD COLUMN "notifyBeforeExpiry" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notificationRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "showInJobDocuments" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showInTimeline" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ChaDocumentVersion"
  ADD COLUMN "validityDate" TIMESTAMP(3),
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'DOCUMENTS_PAGE',
  ADD COLUMN "workflowTemplateId" TEXT,
  ADD COLUMN "workflowVersionId" TEXT,
  ADD COLUMN "workflowNodeId" TEXT,
  ADD COLUMN "workflowNodeRunId" TEXT,
  ADD COLUMN "filingChecklistItemId" TEXT,
  ADD COLUMN "filingPhotoRequirementId" TEXT,
  ADD COLUMN "timelineVisible" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "FilingChecklistItem"
  ADD COLUMN "documentType" TEXT,
  ADD COLUMN "requiresValidity" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "validityDuration" INTEGER,
  ADD COLUMN "validityUnit" TEXT,
  ADD COLUMN "warningBeforeDuration" INTEGER,
  ADD COLUMN "warningBeforeUnit" TEXT,
  ADD COLUMN "notifyBeforeExpiry" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notificationRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "showInDocumentsPage" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showInTimeline" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "FilingPhotoRequirement"
  ADD COLUMN "documentType" TEXT,
  ADD COLUMN "requiresValidity" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "validityDuration" INTEGER,
  ADD COLUMN "validityUnit" TEXT,
  ADD COLUMN "warningBeforeDuration" INTEGER,
  ADD COLUMN "warningBeforeUnit" TEXT,
  ADD COLUMN "notifyBeforeExpiry" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notificationRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "showInDocumentsPage" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "FilingAttachment"
  ADD COLUMN "validityDate" TIMESTAMP(3);

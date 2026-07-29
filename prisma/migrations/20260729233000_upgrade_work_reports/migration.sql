-- Expand daily work reports with repeatable line items, automatic location
-- evidence, configurable fields, staged approvals, and OT eligibility settings.
ALTER TABLE "WorkReport"
ADD COLUMN "items" JSONB,
ADD COLUMN "customValues" JSONB,
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION,
ADD COLUMN "locationAccuracy" DOUBLE PRECISION,
ADD COLUMN "locationCapturedAt" TIMESTAMP(3);

ALTER TABLE "WorkReportApproval"
ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "decidedAt" TIMESTAMP(3);

CREATE TABLE "WorkReportSettings" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "approvalLevels" INTEGER NOT NULL DEFAULT 1,
    "requireApprovedReportForOt" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkReportSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkReportField" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkReportField_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkReportSettings_orgId_key"
ON "WorkReportSettings"("orgId");

CREATE UNIQUE INDEX "WorkReportField_orgId_key_key"
ON "WorkReportField"("orgId", "key");

CREATE INDEX "WorkReportField_orgId_active_position_idx"
ON "WorkReportField"("orgId", "active", "position");

CREATE INDEX "WorkReport_orgId_userId_date_status_idx"
ON "WorkReport"("orgId", "userId", "date", "status");

CREATE INDEX "WorkReportApproval_reportId_level_idx"
ON "WorkReportApproval"("reportId", "level");

CREATE INDEX "WorkReportApproval_approverId_status_idx"
ON "WorkReportApproval"("approverId", "status");

ALTER TABLE "WorkReportApproval"
ADD CONSTRAINT "WorkReportApproval_approverId_fkey"
FOREIGN KEY ("approverId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkReportSettings"
ADD CONSTRAINT "WorkReportSettings_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organisation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkReportField"
ADD CONSTRAINT "WorkReportField_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organisation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

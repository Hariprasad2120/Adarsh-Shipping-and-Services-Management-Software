ALTER TABLE "JobWorkspaceProfile"
ADD COLUMN "chatSpaceName" TEXT,
ADD COLUMN "chatSpaceDeletedAt" TIMESTAMP(3),
ADD COLUMN "chatSpaceDeleteStatus" TEXT NOT NULL DEFAULT 'SKIPPED',
ADD COLUMN "chatSpaceDeleteError" TEXT;

UPDATE "JobWorkspaceProfile"
SET "chatSpaceName" = "googleSpaceId"
WHERE "chatSpaceName" IS NULL
  AND "googleSpaceId" IS NOT NULL;

UPDATE "JobWorkspaceProfile"
SET "chatSpaceDeleteStatus" = 'PENDING'
WHERE "chatSpaceName" IS NOT NULL
  AND "chatSpaceDeleteStatus" = 'SKIPPED';

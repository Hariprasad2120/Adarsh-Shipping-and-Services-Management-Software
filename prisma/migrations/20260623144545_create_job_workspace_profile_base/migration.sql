-- Historical repair:
-- Commit 5a94d53d introduced JobWorkspaceProfile without a migration. Create
-- the evidenced baseline before the later chat-cleanup migration alters it.
-- The cleanup fields remain owned by 20260709103000.

CREATE TABLE IF NOT EXISTS "JobWorkspaceProfile" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "googleSpaceId" TEXT,
    "googleSpaceUrl" TEXT,
    "rootFolderId" TEXT,
    "categoryFolders" JSONB,
    "provisioningStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastError" TEXT,
    "provisionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobWorkspaceProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobWorkspaceProfile_jobId_key"
    ON "JobWorkspaceProfile"("jobId");
CREATE INDEX IF NOT EXISTS "JobWorkspaceProfile_orgId_idx"
    ON "JobWorkspaceProfile"("orgId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'JobWorkspaceProfile_orgId_fkey'
          AND conrelid = '"JobWorkspaceProfile"'::regclass
    ) THEN
        ALTER TABLE "JobWorkspaceProfile"
        ADD CONSTRAINT "JobWorkspaceProfile_orgId_fkey"
        FOREIGN KEY ("orgId") REFERENCES "Organisation"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'JobWorkspaceProfile_jobId_fkey'
          AND conrelid = '"JobWorkspaceProfile"'::regclass
    ) THEN
        ALTER TABLE "JobWorkspaceProfile"
        ADD CONSTRAINT "JobWorkspaceProfile_jobId_fkey"
        FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

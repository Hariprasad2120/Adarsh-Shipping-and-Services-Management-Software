-- Repair drift for AMS workflow tables when the 2026-06-19 migration is marked
-- applied in _prisma_migrations but the underlying DDL never landed.

ALTER TABLE "AppraisalAuditLog"
ADD COLUMN IF NOT EXISTS "action" TEXT,
ADD COLUMN IF NOT EXISTS "actorRole" TEXT,
ADD COLUMN IF NOT EXISTS "newValue" JSONB,
ADD COLUMN IF NOT EXISTS "oldValue" JSONB;

ALTER TABLE "AppraisalMeeting"
ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "HikeDecision"
ADD COLUMN IF NOT EXISTS "finalSalary" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "negotiationRemarks" TEXT,
ADD COLUMN IF NOT EXISTS "previousSalary" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "suggestedFlooredScore" INTEGER,
ADD COLUMN IF NOT EXISTS "suggestedGrade" TEXT,
ADD COLUMN IF NOT EXISTS "suggestedPercent" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "suggestedScore" DOUBLE PRECISION;

ALTER TABLE "MeetingMinute"
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "MeetingMinute_meetingId_authorId_role_key"
ON "MeetingMinute"("meetingId", "authorId", "role");

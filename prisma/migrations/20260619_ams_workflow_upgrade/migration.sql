-- AMS workflow upgrade
-- NOTE: This migration is intentionally scoped to AMS tables only.

-- AlterTable
ALTER TABLE "AppraisalAuditLog"
ADD COLUMN "action" TEXT,
ADD COLUMN "actorRole" TEXT,
ADD COLUMN "newValue" JSONB,
ADD COLUMN "oldValue" JSONB;

-- AlterTable
ALTER TABLE "AppraisalMeeting"
ADD COLUMN "lockedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "HikeDecision"
ADD COLUMN "finalSalary" DOUBLE PRECISION,
ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "negotiationRemarks" TEXT,
ADD COLUMN "previousSalary" DOUBLE PRECISION,
ADD COLUMN "suggestedFlooredScore" INTEGER,
ADD COLUMN "suggestedGrade" TEXT,
ADD COLUMN "suggestedPercent" DOUBLE PRECISION,
ADD COLUMN "suggestedScore" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "MeetingMinute"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "MeetingMinute_meetingId_authorId_role_key"
ON "MeetingMinute"("meetingId", "authorId", "role");

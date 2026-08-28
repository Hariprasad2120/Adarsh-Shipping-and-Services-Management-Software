-- AlterTable
ALTER TABLE "Appraisal" ADD COLUMN     "dateVotingDeadline" TIMESTAMP(3),
ADD COLUMN     "outcomeAckedAt" TIMESTAMP(3),
ADD COLUMN     "outcomeAckedById" TEXT;

-- AlterTable
ALTER TABLE "AppraisalMeeting" ADD COLUMN     "dateVotingClosedAt" TIMESTAMP(3),
ADD COLUMN     "dateSource" TEXT;

-- AlterTable
ALTER TABLE "OrgAppraisalSettings" ADD COLUMN     "selfAssessmentWindowDays" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "reviewerRatingWindowDays" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "dateVotingWindowDays" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "arrearBufferDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "enableDateVoting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableRatingDisagreement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "useRevisedScores" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "gradeBands" JSONB,
ADD COLUMN     "hikeTable" JSONB,
ADD COLUMN     "escalationLadder" JSONB,
ADD COLUMN     "digestDayOfWeek" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "ReviewerRatingReview" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "selfEval" TEXT NOT NULL DEFAULT 'AGREE',
    "revisedRatings" JSONB,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewerRatingReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingDateVote" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "votedDate" TIMESTAMP(3) NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingDateVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalArrear" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "arrearDays" INTEGER NOT NULL,
    "dailyRate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "annualIncrement" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "payrollRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppraisalArrear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewerRatingReview_appraisalId_idx" ON "ReviewerRatingReview"("appraisalId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewerRatingReview_appraisalId_reviewerId_key" ON "ReviewerRatingReview"("appraisalId", "reviewerId");

-- CreateIndex
CREATE INDEX "MeetingDateVote_appraisalId_idx" ON "MeetingDateVote"("appraisalId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingDateVote_appraisalId_reviewerId_key" ON "MeetingDateVote"("appraisalId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalArrear_appraisalId_key" ON "AppraisalArrear"("appraisalId");

-- CreateIndex
CREATE INDEX "AppraisalArrear_status_idx" ON "AppraisalArrear"("status");

-- AddForeignKey
ALTER TABLE "ReviewerRatingReview" ADD CONSTRAINT "ReviewerRatingReview_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerRatingReview" ADD CONSTRAINT "ReviewerRatingReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "AppraisalReviewer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDateVote" ADD CONSTRAINT "MeetingDateVote_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDateVote" ADD CONSTRAINT "MeetingDateVote_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "AppraisalReviewer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalArrear" ADD CONSTRAINT "AppraisalArrear_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

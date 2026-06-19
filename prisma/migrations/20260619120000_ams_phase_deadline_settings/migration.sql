ALTER TABLE "OrgAppraisalSettings"
ADD COLUMN "selfAssessmentDeadlineDays" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "reviewerRatingDeadlineDays" INTEGER NOT NULL DEFAULT 3;

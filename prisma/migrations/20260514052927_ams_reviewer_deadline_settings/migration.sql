-- AlterTable
ALTER TABLE "Appraisal" ADD COLUMN     "availabilityDeadline" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AppraisalReviewer" ADD COLUMN     "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "OrgAppraisalSettings" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "availabilityDeadlineDays" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgAppraisalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgAppraisalSettings_orgId_key" ON "OrgAppraisalSettings"("orgId");

-- CreateIndex
CREATE INDEX "OrgAppraisalSettings_orgId_idx" ON "OrgAppraisalSettings"("orgId");

-- AddForeignKey
ALTER TABLE "OrgAppraisalSettings" ADD CONSTRAINT "OrgAppraisalSettings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

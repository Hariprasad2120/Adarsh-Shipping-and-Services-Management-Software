-- AlterTable
ALTER TABLE "ChaJob"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedById" TEXT;

-- CreateTable
CREATE TABLE "ChaJobDeletionRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobNumberSnapshot" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "assignedManagerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "executedById" TEXT,
    "remarks" TEXT,
    "rejectionRemarks" TEXT,

    CONSTRAINT "ChaJobDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChaJob_orgId_deletedAt_idx" ON "ChaJob"("orgId", "deletedAt");

-- CreateIndex
CREATE INDEX "ChaJob_deletedById_idx" ON "ChaJob"("deletedById");

-- CreateIndex
CREATE INDEX "ChaJobDeletionRequest_orgId_status_idx" ON "ChaJobDeletionRequest"("orgId", "status");

-- CreateIndex
CREATE INDEX "ChaJobDeletionRequest_jobId_status_idx" ON "ChaJobDeletionRequest"("jobId", "status");

-- CreateIndex
CREATE INDEX "ChaJobDeletionRequest_assignedManagerId_status_idx" ON "ChaJobDeletionRequest"("assignedManagerId", "status");

-- CreateIndex
CREATE INDEX "ChaJobDeletionRequest_requestedById_status_idx" ON "ChaJobDeletionRequest"("requestedById", "status");

-- AddForeignKey
ALTER TABLE "ChaJob"
ADD CONSTRAINT "ChaJob_deletedById_fkey"
FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaJobDeletionRequest"
ADD CONSTRAINT "ChaJobDeletionRequest_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaJobDeletionRequest"
ADD CONSTRAINT "ChaJobDeletionRequest_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaJobDeletionRequest"
ADD CONSTRAINT "ChaJobDeletionRequest_requestedById_fkey"
FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaJobDeletionRequest"
ADD CONSTRAINT "ChaJobDeletionRequest_assignedManagerId_fkey"
FOREIGN KEY ("assignedManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaJobDeletionRequest"
ADD CONSTRAINT "ChaJobDeletionRequest_executedById_fkey"
FOREIGN KEY ("executedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "FilingSection49Flag" ADD COLUMN     "validityDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FilingSection49Extension" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "previousValidity" TIMESTAMP(3),
    "extensionDate" TIMESTAMP(3) NOT NULL,
    "fileKey" TEXT,
    "fileName" TEXT,
    "appliedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilingSection49Extension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FilingSection49Extension_jobId_createdAt_idx" ON "FilingSection49Extension"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "FilingSection49Flag_validityDate_isEnabled_idx" ON "FilingSection49Flag"("validityDate", "isEnabled");

-- AddForeignKey
ALTER TABLE "FilingSection49Extension" ADD CONSTRAINT "FilingSection49Extension_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilingSection49Extension" ADD CONSTRAINT "FilingSection49Extension_appliedById_fkey" FOREIGN KEY ("appliedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


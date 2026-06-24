-- Add CHA Additional Data workflow process between document collection and checklist preparation.

CREATE TABLE "ChaJobAdditionalData" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "vesselInwardDate" TIMESTAMP(3),
  "importGeneralManifest" INTEGER,
  "exportGeneralManifest" INTEGER,
  "deliveryOrderValidity" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "completedById" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ChaJobAdditionalData_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChaJobAdditionalData_jobId_key" ON "ChaJobAdditionalData"("jobId");
CREATE INDEX "ChaJobAdditionalData_status_idx" ON "ChaJobAdditionalData"("status");
CREATE INDEX "ChaJobAdditionalData_deliveryOrderValidity_status_idx" ON "ChaJobAdditionalData"("deliveryOrderValidity", "status");

ALTER TABLE "ChaJobAdditionalData"
ADD CONSTRAINT "ChaJobAdditionalData_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "ChaJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

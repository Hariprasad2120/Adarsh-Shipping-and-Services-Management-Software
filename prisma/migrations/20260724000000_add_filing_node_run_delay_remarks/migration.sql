ALTER TABLE "FilingWorkflowNode"
ADD COLUMN "delayRemarksRequired" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "FilingNodeRun"
ADD COLUMN "delayRemarks" TEXT,
ADD COLUMN "delayRemarkedAt" TIMESTAMP(3);

ALTER TABLE "FilingWorkflowNode"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "FilingChecklistItem"
ADD COLUMN "minUploads" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "maxUploads" INTEGER,
ADD COLUMN "acceptedFileTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "deadlineDuration" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN "deadlineUnit" TEXT NOT NULL DEFAULT 'BUSINESS_DAYS',
ADD COLUMN "delayRemarksRequired" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "FilingChecklistResponse"
ADD COLUMN "dueAt" TIMESTAMP(3),
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "delayRemarks" TEXT,
ADD COLUMN "delayRemarkedAt" TIMESTAMP(3),
ADD COLUMN "overdueLoggedAt" TIMESTAMP(3);

ALTER TABLE "FilingAttachment"
ADD COLUMN "checklistItemId" TEXT;

ALTER TABLE "ChaFiling"
ADD COLUMN "filingShipmentType" TEXT,
ADD COLUMN "billOfEntryNumber" TEXT,
ADD COLUMN "shippingBillNumber" TEXT;

CREATE INDEX "FilingAttachment_checklistItemId_idx" ON "FilingAttachment"("checklistItemId");

ALTER TABLE "FilingAttachment"
ADD CONSTRAINT "FilingAttachment_checklistItemId_fkey"
FOREIGN KEY ("checklistItemId") REFERENCES "FilingChecklistItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

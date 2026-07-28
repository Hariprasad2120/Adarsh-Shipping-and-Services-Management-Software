-- Add request-level payment and clarification fields for CHA expense approvals.
ALTER TABLE "ChaExpenseRequest"
ADD COLUMN "upiNumber" TEXT,
ADD COLUMN "upiId" TEXT,
ADD COLUMN "clarificationResponse" TEXT;

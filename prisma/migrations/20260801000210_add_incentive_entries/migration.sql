CREATE TABLE "IncentiveEntry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "processedById" TEXT,
    "sourceModule" TEXT NOT NULL DEFAULT 'CRM',
    "incentiveType" TEXT NOT NULL,
    "referenceLabel" TEXT NOT NULL,
    "customerName" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "eligibleDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "notes" TEXT,
    "hrNotes" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentiveEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IncentiveEntry_orgId_idx" ON "IncentiveEntry"("orgId");
CREATE INDEX "IncentiveEntry_orgId_status_idx" ON "IncentiveEntry"("orgId", "status");
CREATE INDEX "IncentiveEntry_employeeId_idx" ON "IncentiveEntry"("employeeId");
CREATE INDEX "IncentiveEntry_createdById_idx" ON "IncentiveEntry"("createdById");
CREATE INDEX "IncentiveEntry_processedById_idx" ON "IncentiveEntry"("processedById");
CREATE INDEX "IncentiveEntry_orgId_eligibleDate_idx" ON "IncentiveEntry"("orgId", "eligibleDate");

ALTER TABLE "IncentiveEntry"
ADD CONSTRAINT "IncentiveEntry_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IncentiveEntry"
ADD CONSTRAINT "IncentiveEntry_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IncentiveEntry"
ADD CONSTRAINT "IncentiveEntry_processedById_fkey"
FOREIGN KEY ("processedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

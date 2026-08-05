CREATE TABLE "CrmLeadSource" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmLeadSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmEnquirySequence" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sequenceDate" DATE NOT NULL,
    "nextSerial" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmEnquirySequence_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CrmLead"
    ADD COLUMN "directEnquiryRequestKey" TEXT;

ALTER TABLE "CrmServiceEnquiry"
    ADD COLUMN "departmentRef" TEXT,
    ADD COLUMN "sequenceDate" DATE,
    ADD COLUMN "sharedSequence" INTEGER,
    ADD COLUMN "shipmentMode" TEXT,
    ADD COLUMN "movementDirection" TEXT,
    ADD COLUMN "serviceCode" TEXT;

CREATE UNIQUE INDEX "CrmLead_directEnquiryRequestKey_key" ON "CrmLead"("directEnquiryRequestKey");
CREATE UNIQUE INDEX "CrmLeadSource_orgId_name_key" ON "CrmLeadSource"("orgId", "name");
CREATE INDEX "CrmLeadSource_orgId_isActive_idx" ON "CrmLeadSource"("orgId", "isActive");
CREATE UNIQUE INDEX "CrmEnquirySequence_orgId_sequenceDate_key" ON "CrmEnquirySequence"("orgId", "sequenceDate");
CREATE INDEX "CrmEnquirySequence_orgId_sequenceDate_idx" ON "CrmEnquirySequence"("orgId", "sequenceDate");
CREATE UNIQUE INDEX "CrmServiceEnquiry_orgId_departmentRef_key" ON "CrmServiceEnquiry"("orgId", "departmentRef");
CREATE INDEX "CrmServiceEnquiry_orgId_sequenceDate_sharedSequence_idx" ON "CrmServiceEnquiry"("orgId", "sequenceDate", "sharedSequence");

ALTER TABLE "CrmLeadSource"
    ADD CONSTRAINT "CrmLeadSource_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CrmEnquirySequence"
    ADD CONSTRAINT "CrmEnquirySequence_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

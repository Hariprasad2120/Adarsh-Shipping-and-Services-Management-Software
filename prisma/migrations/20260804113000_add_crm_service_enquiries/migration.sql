CREATE TYPE "CrmServiceType" AS ENUM ('FREIGHT_FORWARDING', 'CUSTOMS_CLEARANCE');

CREATE TYPE "CrmServiceEnquiryStatus" AS ENUM (
    'NEW',
    'ASSIGNMENT_PENDING',
    'ASSIGNED',
    'PRICING_IN_PROGRESS',
    'RATES_REQUESTED',
    'RATES_RECEIVED',
    'PRICING_COMPLETED',
    'QUOTE_DRAFT',
    'QUOTED',
    'CUSTOMER_ACCEPTED',
    'CUSTOMER_REJECTED',
    'JOB_READY',
    'JOB_CREATED',
    'LOST',
    'CANCELLED'
);

CREATE TYPE "CrmEnquiryOrigin" AS ENUM ('LEAD_CONVERSION', 'DIRECT_ENQUIRY');

CREATE TABLE "CrmServiceEnquiry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "serviceType" "CrmServiceType" NOT NULL,
    "origin" "CrmEnquiryOrigin" NOT NULL,
    "status" "CrmServiceEnquiryStatus" NOT NULL DEFAULT 'NEW',
    "enquiryRef" TEXT,
    "assignedToId" TEXT,
    "assignedManagerId" TEXT,
    "customerId" TEXT,
    "quotationId" TEXT,
    "chaJobId" TEXT,
    "sourceSnapshot" JSONB,
    "pricingSnapshot" JSONB,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmServiceEnquiry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmServiceEnquiry_orgId_leadId_serviceType_key" ON "CrmServiceEnquiry"("orgId", "leadId", "serviceType");
CREATE INDEX "CrmServiceEnquiry_orgId_serviceType_status_idx" ON "CrmServiceEnquiry"("orgId", "serviceType", "status");
CREATE INDEX "CrmServiceEnquiry_orgId_assignedToId_status_idx" ON "CrmServiceEnquiry"("orgId", "assignedToId", "status");
CREATE INDEX "CrmServiceEnquiry_orgId_assignedManagerId_status_idx" ON "CrmServiceEnquiry"("orgId", "assignedManagerId", "status");
CREATE INDEX "CrmServiceEnquiry_quotationId_idx" ON "CrmServiceEnquiry"("quotationId");
CREATE INDEX "CrmServiceEnquiry_chaJobId_idx" ON "CrmServiceEnquiry"("chaJobId");
CREATE INDEX "CrmServiceEnquiry_customerId_idx" ON "CrmServiceEnquiry"("customerId");

ALTER TABLE "CrmServiceEnquiry"
    ADD CONSTRAINT "CrmServiceEnquiry_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CrmServiceEnquiry"
    ADD CONSTRAINT "CrmServiceEnquiry_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "CrmLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CrmServiceEnquiry"
    ADD CONSTRAINT "CrmServiceEnquiry_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CrmServiceEnquiry"
    ADD CONSTRAINT "CrmServiceEnquiry_assignedManagerId_fkey"
    FOREIGN KEY ("assignedManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CrmServiceEnquiry"
    ADD CONSTRAINT "CrmServiceEnquiry_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "CrmAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CrmServiceEnquiry"
    ADD CONSTRAINT "CrmServiceEnquiry_quotationId_fkey"
    FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CrmServiceEnquiry"
    ADD CONSTRAINT "CrmServiceEnquiry_chaJobId_fkey"
    FOREIGN KEY ("chaJobId") REFERENCES "ChaJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CrmServiceEnquiry"
    ADD CONSTRAINT "CrmServiceEnquiry_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CrmServiceEnquiry"
    ADD CONSTRAINT "CrmServiceEnquiry_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

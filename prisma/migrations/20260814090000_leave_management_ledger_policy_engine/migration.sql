Loaded Prisma config from prisma.config.ts.

-- AlterTable
ALTER TABLE "LeaveBalance" ADD COLUMN     "nextResetDate" DATE,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(10,4);

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "computedDurationUnits" DECIMAL(10,4),
ADD COLUMN     "currentApprovalStepId" TEXT,
ADD COLUMN     "extendedFromRequestId" TEXT,
ADD COLUMN     "lopUnits" DECIMAL(10,4),
ADD COLUMN     "paidUnits" DECIMAL(10,4),
ADD COLUMN     "policyVersionId" TEXT;

-- AlterTable
ALTER TABLE "LeaveType" ADD COLUMN     "activeVersionId" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "isCompOffType" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "defaultBalance" SET DATA TYPE DECIMAL(10,4);

-- CreateTable
CREATE TABLE "LeavePolicyVersion" (
    "id" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "classification" TEXT NOT NULL DEFAULT 'PAID',
    "entitlementModel" TEXT NOT NULL DEFAULT 'FIXED',
    "unit" TEXT NOT NULL DEFAULT 'DAY',
    "roundingMode" TEXT NOT NULL DEFAULT 'NONE',
    "roundingIncrement" DECIMAL(10,4),
    "effectiveFrom" DATE NOT NULL,
    "effectiveUntil" DATE,
    "configuration" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeavePolicyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveApplicabilityRule" (
    "id" TEXT NOT NULL,
    "policyVersionId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveApplicabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeLeaveOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeLeaveOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveLedgerEntry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "policyVersionId" TEXT,
    "type" TEXT NOT NULL,
    "quantity" DECIMAL(10,4) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'DAY',
    "effectiveDate" DATE NOT NULL,
    "balanceBefore" DECIMAL(10,4) NOT NULL,
    "balanceAfter" DECIMAL(10,4) NOT NULL,
    "requestId" TEXT,
    "source" TEXT NOT NULL,
    "actorId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveApprovalStep" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "approverType" TEXT NOT NULL,
    "approverUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "comment" TEXT,
    "slaDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompOffCredit" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "earnedDate" DATE NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceOtRecordId" TEXT,
    "units" DECIMAL(10,4) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'DAY',
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "expiresAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "ledgerEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompOffCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveGrant" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "amount" DECIMAL(10,4) NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "grantedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "ledgerEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequestAttachment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRequestAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveSchedulerRun" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "runKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errorDetails" JSONB,

    CONSTRAINT "LeaveSchedulerRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveComplianceTemplate" (
    "id" TEXT NOT NULL,
    "jurisdictionCountry" TEXT NOT NULL,
    "jurisdictionState" TEXT,
    "jurisdictionLocality" TEXT,
    "establishmentType" TEXT,
    "leaveCategory" TEXT NOT NULL,
    "statutoryName" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "statutoryMinimum" JSONB NOT NULL,
    "eligibility" JSONB,
    "legalSource" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "verifiedDate" DATE NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveComplianceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeavePolicyVersion_leaveTypeId_status_idx" ON "LeavePolicyVersion"("leaveTypeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LeavePolicyVersion_leaveTypeId_version_key" ON "LeavePolicyVersion"("leaveTypeId", "version");

-- CreateIndex
CREATE INDEX "LeaveApplicabilityRule_policyVersionId_idx" ON "LeaveApplicabilityRule"("policyVersionId");

-- CreateIndex
CREATE INDEX "EmployeeLeaveOverride_userId_leaveTypeId_idx" ON "EmployeeLeaveOverride"("userId", "leaveTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveLedgerEntry_idempotencyKey_key" ON "LeaveLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "LeaveLedgerEntry_orgId_userId_leaveTypeId_idx" ON "LeaveLedgerEntry"("orgId", "userId", "leaveTypeId");

-- CreateIndex
CREATE INDEX "LeaveLedgerEntry_userId_leaveTypeId_effectiveDate_idx" ON "LeaveLedgerEntry"("userId", "leaveTypeId", "effectiveDate");

-- CreateIndex
CREATE INDEX "LeaveApprovalStep_requestId_sequence_idx" ON "LeaveApprovalStep"("requestId", "sequence");

-- CreateIndex
CREATE INDEX "CompOffCredit_orgId_userId_status_idx" ON "CompOffCredit"("orgId", "userId", "status");

-- CreateIndex
CREATE INDEX "LeaveGrant_orgId_userId_idx" ON "LeaveGrant"("orgId", "userId");

-- CreateIndex
CREATE INDEX "LeaveRequestAttachment_requestId_idx" ON "LeaveRequestAttachment"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveSchedulerRun_runKey_key" ON "LeaveSchedulerRun"("runKey");

-- CreateIndex
CREATE INDEX "LeaveSchedulerRun_orgId_jobType_idx" ON "LeaveSchedulerRun"("orgId", "jobType");

-- CreateIndex
CREATE INDEX "LeaveComplianceTemplate_jurisdictionCountry_jurisdictionSta_idx" ON "LeaveComplianceTemplate"("jurisdictionCountry", "jurisdictionState", "leaveCategory");

-- CreateIndex
CREATE INDEX "LeaveBalance_nextResetDate_idx" ON "LeaveBalance"("nextResetDate");

-- CreateIndex
CREATE INDEX "LeaveRequest_policyVersionId_idx" ON "LeaveRequest"("policyVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_orgId_code_key" ON "LeaveType"("orgId", "code");

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "LeavePolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_extendedFromRequestId_fkey" FOREIGN KEY ("extendedFromRequestId") REFERENCES "LeaveRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeavePolicyVersion" ADD CONSTRAINT "LeavePolicyVersion_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApplicabilityRule" ADD CONSTRAINT "LeaveApplicabilityRule_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "LeavePolicyVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLeaveOverride" ADD CONSTRAINT "EmployeeLeaveOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveLedgerEntry" ADD CONSTRAINT "LeaveLedgerEntry_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveLedgerEntry" ADD CONSTRAINT "LeaveLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveLedgerEntry" ADD CONSTRAINT "LeaveLedgerEntry_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveLedgerEntry" ADD CONSTRAINT "LeaveLedgerEntry_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LeaveRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApprovalStep" ADD CONSTRAINT "LeaveApprovalStep_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompOffCredit" ADD CONSTRAINT "CompOffCredit_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompOffCredit" ADD CONSTRAINT "CompOffCredit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveGrant" ADD CONSTRAINT "LeaveGrant_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveGrant" ADD CONSTRAINT "LeaveGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveGrant" ADD CONSTRAINT "LeaveGrant_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequestAttachment" ADD CONSTRAINT "LeaveRequestAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveSchedulerRun" ADD CONSTRAINT "LeaveSchedulerRun_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Stage 2 — enterprise platform: reusable maker-checker / approval engine.
--
-- Four new empty tables. No backfill; nothing consumes the engine yet. Existing
-- per-module approval schemes (Leave/CRM/WorkReport/Accounting/CHA/Recruit) are
-- untouched and migrate onto this over time.
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS "ApprovalDecision";
--   DROP TABLE IF EXISTS "ApprovalRequest";
--   DROP TABLE IF EXISTS "ApprovalPolicyStep";
--   DROP TABLE IF EXISTS "ApprovalPolicy";

-- CreateTable
CREATE TABLE "ApprovalPolicy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "requireDistinctApprover" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApprovalPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalPolicyStep" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "approverMode" TEXT NOT NULL DEFAULT 'PERMISSION',
    "permissionKey" TEXT,
    "approverUserId" TEXT,
    "requiredApprovals" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ApprovalPolicyStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL DEFAULT '',
    "policyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "requestedByUserId" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalDecision" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalPolicy_orgId_subjectType_scopeKey_key"
    ON "ApprovalPolicy"("orgId", "subjectType", "scopeKey");
CREATE INDEX "ApprovalPolicy_orgId_subjectType_active_idx"
    ON "ApprovalPolicy"("orgId", "subjectType", "active");
CREATE UNIQUE INDEX "ApprovalPolicyStep_policyId_level_key"
    ON "ApprovalPolicyStep"("policyId", "level");
CREATE INDEX "ApprovalPolicyStep_policyId_idx" ON "ApprovalPolicyStep"("policyId");
CREATE UNIQUE INDEX "ApprovalRequest_orgId_subjectType_subjectId_scopeKey_key"
    ON "ApprovalRequest"("orgId", "subjectType", "subjectId", "scopeKey");
CREATE INDEX "ApprovalRequest_orgId_status_subjectType_idx"
    ON "ApprovalRequest"("orgId", "status", "subjectType");
CREATE INDEX "ApprovalRequest_requestedByUserId_idx" ON "ApprovalRequest"("requestedByUserId");
CREATE UNIQUE INDEX "ApprovalDecision_requestId_level_actorUserId_key"
    ON "ApprovalDecision"("requestId", "level", "actorUserId");
CREATE INDEX "ApprovalDecision_requestId_idx" ON "ApprovalDecision"("requestId");
CREATE INDEX "ApprovalDecision_actorUserId_idx" ON "ApprovalDecision"("actorUserId");

-- AddForeignKey
ALTER TABLE "ApprovalPolicy" ADD CONSTRAINT "ApprovalPolicy_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalPolicyStep" ADD CONSTRAINT "ApprovalPolicyStep_policyId_fkey"
    FOREIGN KEY ("policyId") REFERENCES "ApprovalPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedByUserId_fkey"
    FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

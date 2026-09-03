-- Stage 2 — enterprise platform: append-only configuration audit trail.
--
-- New empty table. The application writes rows via the config-audit service;
-- there is no update/delete path. For a hardened deployment also run, as a
-- privileged role:
--   REVOKE UPDATE, DELETE, TRUNCATE ON "ConfigAuditEntry" FROM <app_role>;
-- so an ordinary admin cannot rewrite their own history.
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS "ConfigAuditEntry";

-- CreateTable
CREATE TABLE "ConfigAuditEntry" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorLabel" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "summary" TEXT,
    "before" JSONB,
    "after" JSONB,
    "changedKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'app',
    "result" TEXT NOT NULL DEFAULT 'SUCCESS',
    "ip" TEXT,
    "userAgent" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConfigAuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConfigAuditEntry_orgId_createdAt_idx" ON "ConfigAuditEntry"("orgId", "createdAt");
CREATE INDEX "ConfigAuditEntry_orgId_targetType_targetId_idx"
    ON "ConfigAuditEntry"("orgId", "targetType", "targetId");
CREATE INDEX "ConfigAuditEntry_orgId_action_createdAt_idx"
    ON "ConfigAuditEntry"("orgId", "action", "createdAt");
CREATE INDEX "ConfigAuditEntry_actorUserId_idx" ON "ConfigAuditEntry"("actorUserId");

-- AddForeignKey
ALTER TABLE "ConfigAuditEntry" ADD CONSTRAINT "ConfigAuditEntry_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfigAuditEntry" ADD CONSTRAINT "ConfigAuditEntry_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

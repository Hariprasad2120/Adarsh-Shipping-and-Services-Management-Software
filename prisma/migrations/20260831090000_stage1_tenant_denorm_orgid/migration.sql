-- Stage 1 §10 — denormalised tenant key on two models that previously had no
-- orgId column (ownership was only via a relation). Additive + backfill only.
--
-- ROLLBACK:
--   DROP INDEX IF EXISTS "EmploymentRecord_orgId_idx";
--   DROP INDEX IF EXISTS "LeavePolicyVersion_orgId_status_idx";
--   ALTER TABLE "EmploymentRecord" DROP COLUMN IF EXISTS "orgId";
--   ALTER TABLE "LeavePolicyVersion" DROP COLUMN IF EXISTS "orgId";

-- AlterTable
ALTER TABLE "EmploymentRecord" ADD COLUMN "orgId" TEXT;
ALTER TABLE "LeavePolicyVersion" ADD COLUMN "orgId" TEXT;

-- Backfill from the owning relation.
UPDATE "EmploymentRecord" er
  SET "orgId" = u."orgId"
  FROM "User" u
  WHERE u."id" = er."userId" AND er."orgId" IS NULL;

UPDATE "LeavePolicyVersion" lpv
  SET "orgId" = lt."orgId"
  FROM "LeaveType" lt
  WHERE lt."id" = lpv."leaveTypeId" AND lpv."orgId" IS NULL;

-- CreateIndex
CREATE INDEX "EmploymentRecord_orgId_idx" ON "EmploymentRecord"("orgId");
CREATE INDEX "LeavePolicyVersion_orgId_status_idx" ON "LeavePolicyVersion"("orgId", "status");

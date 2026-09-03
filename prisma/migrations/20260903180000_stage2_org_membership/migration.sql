-- Stage 2 — enterprise platform: user ↔ organisation membership (expand phase).
--
-- Additive. The legacy `User.orgId` FK stays as-is; this table sits alongside it.
-- Backfill: one ACTIVE, primary membership per user that currently has an org,
-- with the per-org lifecycle status derived from `User.active`.
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS "OrganisationMembership";

-- CreateTable
CREATE TABLE "OrganisationMembership" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "invitedByUserId" TEXT,
    "joinedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganisationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationMembership_orgId_userId_key"
    ON "OrganisationMembership"("orgId", "userId");
CREATE INDEX "OrganisationMembership_userId_status_idx"
    ON "OrganisationMembership"("userId", "status");
CREATE INDEX "OrganisationMembership_orgId_status_idx"
    ON "OrganisationMembership"("orgId", "status");

-- AddForeignKey
ALTER TABLE "OrganisationMembership" ADD CONSTRAINT "OrganisationMembership_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganisationMembership" ADD CONSTRAINT "OrganisationMembership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganisationMembership" ADD CONSTRAINT "OrganisationMembership_invitedByUserId_fkey"
    FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill from the legacy single-org assignment.
INSERT INTO "OrganisationMembership"
    ("id", "orgId", "userId", "status", "isPrimary", "joinedAt", "deactivatedAt", "createdAt", "updatedAt")
SELECT
    'mem_' || replace(gen_random_uuid()::text, '-', ''),
    u."orgId",
    u."id",
    CASE WHEN u."active" THEN 'ACTIVE' ELSE 'DEACTIVATED' END,
    true,
    COALESCE(u."activatedAt", u."createdAt"),
    CASE WHEN u."active" THEN NULL ELSE u."updatedAt" END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User" u
WHERE u."orgId" IS NOT NULL;

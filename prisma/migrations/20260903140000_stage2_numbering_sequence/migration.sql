-- Stage 2 — enterprise platform: reusable concurrency-safe document numbering.
--
-- New empty table; no backfill. Existing AccountingNumberSeries /
-- ChaBranchNumberingRule are left untouched and migrate onto this over time.
--
-- The composite uniqueness must treat a NULL legalEntityId as a real value, so
-- it is a COALESCE expression index rather than a plain @@unique (which Prisma
-- cannot express — the model omits it deliberately).
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS "NumberingSequence";

-- CreateTable
CREATE TABLE "NumberingSequence" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "legalEntityId" TEXT,
    "moduleId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL DEFAULT '',
    "prefix" TEXT NOT NULL DEFAULT '',
    "suffix" TEXT NOT NULL DEFAULT '',
    "padding" INTEGER NOT NULL DEFAULT 1,
    "nextValue" BIGINT NOT NULL DEFAULT 1,
    "resetPolicy" TEXT NOT NULL DEFAULT 'NEVER',
    "startValue" BIGINT NOT NULL DEFAULT 1,
    "periodLabel" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NumberingSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NumberingSequence_orgId_idx" ON "NumberingSequence"("orgId");
CREATE INDEX "NumberingSequence_orgId_moduleId_docType_active_idx"
    ON "NumberingSequence"("orgId", "moduleId", "docType", "active");
CREATE INDEX "NumberingSequence_legalEntityId_idx" ON "NumberingSequence"("legalEntityId");

-- Composite uniqueness with NULL treated as a concrete scope.
CREATE UNIQUE INDEX "NumberingSequence_scope_key"
    ON "NumberingSequence"("orgId", (COALESCE("legalEntityId", '')), "moduleId", "docType", "scopeKey");

-- AddForeignKey
ALTER TABLE "NumberingSequence" ADD CONSTRAINT "NumberingSequence_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NumberingSequence" ADD CONSTRAINT "NumberingSequence_legalEntityId_fkey"
    FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

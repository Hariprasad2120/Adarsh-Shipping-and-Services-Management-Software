-- Historical repair:
-- Commit a8d97aa9 introduced configurable document-requirement categories,
-- items, and the optional item link on ChaJobDocumentRequirement without a
-- migration. Create that evidenced baseline before later validity ALTERs.

CREATE TABLE IF NOT EXISTS "ChaDocumentRequirementCategory" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaDocumentRequirementCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChaDocumentRequirementItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequiredDefault" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaDocumentRequirementItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ChaJobDocumentRequirement"
    ADD COLUMN IF NOT EXISTS "requirementItemId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ChaDocumentRequirementCategory_orgId_name_key"
    ON "ChaDocumentRequirementCategory"("orgId", "name");
CREATE INDEX IF NOT EXISTS "ChaDocumentRequirementCategory_orgId_idx"
    ON "ChaDocumentRequirementCategory"("orgId");

CREATE UNIQUE INDEX IF NOT EXISTS "ChaDocumentRequirementItem_categoryId_name_key"
    ON "ChaDocumentRequirementItem"("categoryId", "name");
CREATE INDEX IF NOT EXISTS "ChaDocumentRequirementItem_categoryId_idx"
    ON "ChaDocumentRequirementItem"("categoryId");
CREATE INDEX IF NOT EXISTS "ChaJobDocumentRequirement_requirementItemId_idx"
    ON "ChaJobDocumentRequirement"("requirementItemId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ChaDocumentRequirementCategory_orgId_fkey'
          AND conrelid = '"ChaDocumentRequirementCategory"'::regclass
    ) THEN
        ALTER TABLE "ChaDocumentRequirementCategory"
        ADD CONSTRAINT "ChaDocumentRequirementCategory_orgId_fkey"
        FOREIGN KEY ("orgId") REFERENCES "Organisation"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ChaDocumentRequirementItem_categoryId_fkey'
          AND conrelid = '"ChaDocumentRequirementItem"'::regclass
    ) THEN
        ALTER TABLE "ChaDocumentRequirementItem"
        ADD CONSTRAINT "ChaDocumentRequirementItem_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "ChaDocumentRequirementCategory"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ChaJobDocumentRequirement_requirementItemId_fkey'
          AND conrelid = '"ChaJobDocumentRequirement"'::regclass
    ) THEN
        ALTER TABLE "ChaJobDocumentRequirement"
        ADD CONSTRAINT "ChaJobDocumentRequirement_requirementItemId_fkey"
        FOREIGN KEY ("requirementItemId") REFERENCES "ChaDocumentRequirementItem"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;

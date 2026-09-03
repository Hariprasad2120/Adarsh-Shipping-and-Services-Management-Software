-- Stage 2 — enterprise platform: unified custom-field platform.
--
-- Two new empty tables. No backfill; the existing EmployeeProfileField and
-- AccountingCustomFieldDefinition models are untouched and migrate onto this
-- later. The CustomField (ServiceForm form-builder) model is a different
-- concept and is left alone permanently.
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS "CustomFieldValue";
--   DROP TABLE IF EXISTS "CustomFieldDefinition";

-- CreateTable
CREATE TABLE "CustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT '',
    "helpText" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" JSONB,
    "options" JSONB,
    "validation" JSONB,
    "visibility" TEXT NOT NULL DEFAULT 'VISIBLE',
    "readPermission" TEXT,
    "writePermission" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomFieldValue" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_orgId_objectType_key_key"
    ON "CustomFieldDefinition"("orgId", "objectType", "key");
CREATE INDEX "CustomFieldDefinition_orgId_objectType_active_position_idx"
    ON "CustomFieldDefinition"("orgId", "objectType", "active", "position");
CREATE UNIQUE INDEX "CustomFieldValue_definitionId_objectId_key"
    ON "CustomFieldValue"("definitionId", "objectId");
CREATE INDEX "CustomFieldValue_orgId_objectType_objectId_idx"
    ON "CustomFieldValue"("orgId", "objectType", "objectId");

-- AddForeignKey
ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_definitionId_fkey"
    FOREIGN KEY ("definitionId") REFERENCES "CustomFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

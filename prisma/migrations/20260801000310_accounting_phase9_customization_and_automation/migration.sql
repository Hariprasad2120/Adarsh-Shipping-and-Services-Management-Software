CREATE TABLE "AccountingCustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "helpText" TEXT,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingCustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingAutomationRule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "targetScope" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "conditions" JSONB,
    "configuration" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingAutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingWorkspaceModule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "routePath" TEXT NOT NULL,
    "description" TEXT,
    "configuration" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingWorkspaceModule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountingCustomFieldDefinition_scope_key"
ON "AccountingCustomFieldDefinition"("orgId", "scope", "key");

CREATE INDEX "AccountingCustomFieldDefinition_active_idx"
ON "AccountingCustomFieldDefinition"("orgId", "scope", "isActive");

CREATE UNIQUE INDEX "AccountingAutomationRule_name_key"
ON "AccountingAutomationRule"("orgId", "name");

CREATE INDEX "AccountingAutomationRule_active_idx"
ON "AccountingAutomationRule"("orgId", "targetScope", "isActive");

CREATE UNIQUE INDEX "AccountingWorkspaceModule_code_key"
ON "AccountingWorkspaceModule"("orgId", "code");

CREATE INDEX "AccountingWorkspaceModule_active_idx"
ON "AccountingWorkspaceModule"("orgId", "isActive");

ALTER TABLE "AccountingCustomFieldDefinition"
ADD CONSTRAINT "AccountingCustomFieldDefinition_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organisation"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingAutomationRule"
ADD CONSTRAINT "AccountingAutomationRule_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organisation"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountingWorkspaceModule"
ADD CONSTRAINT "AccountingWorkspaceModule_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organisation"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

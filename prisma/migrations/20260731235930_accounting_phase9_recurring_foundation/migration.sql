-- Accounting Phase 9.5 recurring foundation
-- Additive canonical recurring template, schedule, and run models.

CREATE TABLE "AccountingRecurringTemplate" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalEntityId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "scheduleMode" TEXT NOT NULL,
  "scheduleConfig" JSONB,
  "generationPolicy" JSONB,
  "approvalMode" TEXT,
  "autoSubmit" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "createdById" TEXT NOT NULL,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingRecurringTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingRecurringTemplate_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingRecurringTemplate_legal_entity_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "AccountingLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingRecurringTemplate_creator_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingRecurringTemplate_code_version_key"
  ON "AccountingRecurringTemplate"("orgId", "code", "version");

CREATE INDEX "AccountingRecurringTemplate_active_idx"
  ON "AccountingRecurringTemplate"("orgId", "legalEntityId", "isActive");

CREATE INDEX "AccountingRecurringTemplate_createdById_idx"
  ON "AccountingRecurringTemplate"("createdById");

CREATE TABLE "AccountingRecurringSchedule" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "cadence" TEXT NOT NULL,
  "anchorDate" DATE NOT NULL,
  "nextDueDate" DATE NOT NULL,
  "lastProcessedDueDate" DATE,
  "catchUpMode" TEXT NOT NULL DEFAULT 'SKIP',
  "scheduleConfig" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingRecurringSchedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingRecurringSchedule_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingRecurringSchedule_template_fkey" FOREIGN KEY ("templateId") REFERENCES "AccountingRecurringTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingRecurringSchedule_unique_key"
  ON "AccountingRecurringSchedule"("templateId", "cadence", "anchorDate");

CREATE INDEX "AccountingRecurringSchedule_due_idx"
  ON "AccountingRecurringSchedule"("orgId", "nextDueDate", "isActive");

CREATE TABLE "AccountingRecurringRun" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "scheduleId" TEXT,
  "dueDate" DATE NOT NULL,
  "runStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "generatedRecordType" TEXT,
  "generatedRecordId" TEXT,
  "result" JSONB,
  "idempotencyKey" TEXT NOT NULL,
  "processedById" TEXT,
  "processedAt" TIMESTAMP(3),
  "rowVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountingRecurringRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingRecurringRun_org_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingRecurringRun_template_fkey" FOREIGN KEY ("templateId") REFERENCES "AccountingRecurringTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingRecurringRun_schedule_fkey" FOREIGN KEY ("scheduleId") REFERENCES "AccountingRecurringSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingRecurringRun_processed_by_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingRecurringRun_idempotency_key"
  ON "AccountingRecurringRun"("orgId", "idempotencyKey");

CREATE UNIQUE INDEX "AccountingRecurringRun_template_due_key"
  ON "AccountingRecurringRun"("templateId", "dueDate");

CREATE INDEX "AccountingRecurringRun_status_idx"
  ON "AccountingRecurringRun"("orgId", "runStatus", "dueDate");

CREATE INDEX "AccountingRecurringRun_processedById_idx"
  ON "AccountingRecurringRun"("processedById");

ALTER TABLE "EmailQueue"
ADD COLUMN "text" TEXT,
ADD COLUMN "error" TEXT,
ADD COLUMN "automationKey" TEXT,
ADD COLUMN "metadata" JSONB;

CREATE UNIQUE INDEX "EmailQueue_automationKey_key" ON "EmailQueue"("automationKey");

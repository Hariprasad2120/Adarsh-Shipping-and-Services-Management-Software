-- Stage 2 — enterprise platform. Per-organisation regional / locale / fiscal
-- configuration. Additive: one new table, one row per existing Organisation.
--
-- Column defaults are the PLATFORM-NEUTRAL baseline (UTC / en-US / USD /
-- ISO-8601 dates / January fiscal start). India is not the platform assumption.
-- Existing organisations in this install run India-based workflows today, so the
-- backfill below seeds their rows with India values to preserve current
-- behaviour. New organisations get the neutral defaults and are configured
-- explicitly by the Organisation Setup Wizard.
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS "OrganisationSettings";

-- CreateTable
CREATE TABLE "OrganisationSettings" (
    "orgId" TEXT NOT NULL,
    "country" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "dateFormat" TEXT NOT NULL DEFAULT 'yyyy-MM-dd',
    "timeFormat" TEXT NOT NULL DEFAULT 'HH:mm',
    "numberFormat" TEXT NOT NULL DEFAULT 'en-US',
    "firstDayOfWeek" INTEGER NOT NULL DEFAULT 1,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "supportedCurrencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fiscalYearStartMonth" INTEGER NOT NULL DEFAULT 1,
    "fiscalYearStartDay" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationSettings_pkey" PRIMARY KEY ("orgId")
);

-- AddForeignKey
ALTER TABLE "OrganisationSettings" ADD CONSTRAINT "OrganisationSettings_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing organisations with the India configuration they run on today.
INSERT INTO "OrganisationSettings" (
    "orgId", "country", "timezone", "locale", "dateFormat", "timeFormat",
    "numberFormat", "firstDayOfWeek", "baseCurrency", "supportedCurrencies",
    "fiscalYearStartMonth", "fiscalYearStartDay", "createdAt", "updatedAt"
)
SELECT
    o."id", 'IN', 'Asia/Kolkata', 'en-IN', 'dd/MM/yyyy', 'HH:mm',
    'en-IN', 1, 'INR', ARRAY['INR']::TEXT[],
    4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Organisation" o;

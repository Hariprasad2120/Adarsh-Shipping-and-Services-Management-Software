ALTER TABLE "AccountingOrganisationProfile"
  ADD COLUMN "rowVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "AccountingLegalEntity"
  ADD COLUMN "rowVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "AccountingTaxRegistration"
  ADD COLUMN "rowVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "AccountingCurrency"
  ADD COLUMN "rowVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "AccountingExchangeRate"
  ADD COLUMN "rowVersion" INTEGER NOT NULL DEFAULT 1;

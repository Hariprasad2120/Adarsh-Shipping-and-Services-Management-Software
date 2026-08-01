ALTER TABLE "AccountingDimensionDefinition"
  ADD COLUMN "rowVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "AccountingDimensionValue"
  ADD COLUMN "rowVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ChaJobType"
ADD COLUMN "movementDirection" TEXT,
ADD COLUMN "manifestRequirement" TEXT,
ADD COLUMN "customManifestLabel" TEXT,
ADD COLUMN "isManifestMandatory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "manifestHelpText" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ChaJobAdditionalData"
ADD COLUMN "customManifestValue" TEXT;

-- Seed sensible defaults for existing standard clearance types without relying on runtime name checks later.
UPDATE "ChaJobType"
SET
  "movementDirection" = 'IMPORT',
  "manifestRequirement" = 'IGM',
  "isManifestMandatory" = true,
  "manifestHelpText" = COALESCE("manifestHelpText", 'Enter the Import General Manifest number.')
WHERE LOWER("name") = 'import clearance'
  AND ("movementDirection" IS NULL OR "manifestRequirement" IS NULL);

UPDATE "ChaJobType"
SET
  "movementDirection" = 'EXPORT',
  "manifestRequirement" = 'EGM',
  "isManifestMandatory" = true,
  "manifestHelpText" = COALESCE("manifestHelpText", 'Enter the Export General Manifest number.')
WHERE LOWER("name") = 'export clearance'
  AND ("movementDirection" IS NULL OR "manifestRequirement" IS NULL);

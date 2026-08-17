-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "jurisdictionCountry" TEXT,
ADD COLUMN     "jurisdictionState" TEXT;

-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN     "defaultJurisdictionCountry" TEXT,
ADD COLUMN     "defaultJurisdictionState" TEXT;


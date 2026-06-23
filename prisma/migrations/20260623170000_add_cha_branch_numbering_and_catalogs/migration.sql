-- CreateTable
CREATE TABLE "ChaBranchNumberingRule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "suffix" TEXT,
    "startingSequence" INTEGER NOT NULL DEFAULT 1,
    "currentSequence" INTEGER NOT NULL DEFAULT 0,
    "numberPadding" INTEGER NOT NULL DEFAULT 4,
    "useFinancialYear" BOOLEAN NOT NULL DEFAULT false,
    "financialYearFormat" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaBranchNumberingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaShipmentType" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaShipmentType_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ChaJob"
ADD COLUMN "shipmentTypeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ChaBranchNumberingRule_branchId_key" ON "ChaBranchNumberingRule"("branchId");

-- CreateIndex
CREATE INDEX "ChaBranchNumberingRule_orgId_idx" ON "ChaBranchNumberingRule"("orgId");

-- CreateIndex
CREATE INDEX "ChaBranchNumberingRule_orgId_isActive_idx" ON "ChaBranchNumberingRule"("orgId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ChaShipmentType_orgId_name_key" ON "ChaShipmentType"("orgId", "name");

-- CreateIndex
CREATE INDEX "ChaShipmentType_orgId_idx" ON "ChaShipmentType"("orgId");

-- CreateIndex
CREATE INDEX "ChaJob_shipmentTypeId_idx" ON "ChaJob"("shipmentTypeId");

-- AddForeignKey
ALTER TABLE "ChaBranchNumberingRule" ADD CONSTRAINT "ChaBranchNumberingRule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaBranchNumberingRule" ADD CONSTRAINT "ChaBranchNumberingRule_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaShipmentType" ADD CONSTRAINT "ChaShipmentType_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChaJob" ADD CONSTRAINT "ChaJob_shipmentTypeId_fkey" FOREIGN KEY ("shipmentTypeId") REFERENCES "ChaShipmentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

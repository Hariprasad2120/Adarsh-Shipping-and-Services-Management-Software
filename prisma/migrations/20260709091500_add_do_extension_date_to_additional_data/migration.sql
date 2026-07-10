ALTER TABLE "ChaJobAdditionalData"
ADD COLUMN "deliveryOrderExtensionDate" TIMESTAMP(3);

CREATE INDEX "ChaJobAdditionalData_deliveryOrderExtensionDate_status_idx"
ON "ChaJobAdditionalData"("deliveryOrderExtensionDate", "status");

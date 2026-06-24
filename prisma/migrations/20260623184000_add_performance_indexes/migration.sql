-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE INDEX "TodoTask_userId_status_reminderEnabled_alertAt_alertTriggeredAt_idx" ON "TodoTask"("userId", "status", "reminderEnabled", "alertAt", "alertTriggeredAt");

-- CreateIndex
CREATE INDEX "CrmLead_orgId_isConverted_idx" ON "CrmLead"("orgId", "isConverted");

-- CreateIndex
CREATE INDEX "CrmLead_orgId_createdAt_idx" ON "CrmLead"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "CrmLeadReminder_status_alertAt_idx" ON "CrmLeadReminder"("status", "alertAt");

-- CreateIndex
CREATE INDEX "CrmActivity_orgId_status_idx" ON "CrmActivity"("orgId", "status");

-- CreateIndex
CREATE INDEX "CrmInvoice_orgId_type_idx" ON "CrmInvoice"("orgId", "type");

-- CreateIndex
CREATE INDEX "ChaChecklistImport_jobId_status_idx" ON "ChaChecklistImport"("jobId", "status");

-- CreateIndex
CREATE INDEX "ChaChecklistImport_status_idx" ON "ChaChecklistImport"("status");

-- CreateIndex
CREATE INDEX "ChaFiling_status_idx" ON "ChaFiling"("status");

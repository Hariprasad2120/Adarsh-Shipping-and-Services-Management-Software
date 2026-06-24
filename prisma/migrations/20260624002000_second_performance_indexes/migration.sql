-- Additional hot-path indexes for second performance pass.

-- HRMS user directory/search and active employee lists.
CREATE INDEX "User_orgId_active_name_idx" ON "User"("orgId", "active", "name");
CREATE INDEX "User_orgId_email_idx" ON "User"("orgId", "email");

-- CRM account/customer list filters and lookup by name.
CREATE INDEX "CrmAccount_orgId_status_idx" ON "CrmAccount"("orgId", "status");
CREATE INDEX "CrmAccount_orgId_name_idx" ON "CrmAccount"("orgId", "name");

-- CRM deal board/list filters.
CREATE INDEX "CrmDeal_orgId_stage_idx" ON "CrmDeal"("orgId", "stage");
CREATE INDEX "CrmDeal_orgId_expectedCloseDate_idx" ON "CrmDeal"("orgId", "expectedCloseDate");
CREATE INDEX "CrmDeal_orgId_accountId_idx" ON "CrmDeal"("orgId", "accountId");

-- Accounting audit logs by organisation/date.
CREATE INDEX "AccountingAuditLog_orgId_timestamp_idx" ON "AccountingAuditLog"("orgId", "timestamp");

-- CHA report/list filters.
CREATE INDEX "ChaJob_orgId_status_createdAt_idx" ON "ChaJob"("orgId", "status", "createdAt");
CREATE INDEX "ChaJob_orgId_branchId_createdAt_idx" ON "ChaJob"("orgId", "branchId", "createdAt");
CREATE INDEX "ChaJob_orgId_jobTypeId_createdAt_idx" ON "ChaJob"("orgId", "jobTypeId", "createdAt");
CREATE INDEX "ChaExpenseRequest_orgId_status_createdAt_idx" ON "ChaExpenseRequest"("orgId", "status", "createdAt");

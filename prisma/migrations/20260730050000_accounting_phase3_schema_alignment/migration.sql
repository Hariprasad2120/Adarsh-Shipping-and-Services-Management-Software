-- Align explicit Phase 3 index names with Prisma's generated schema names.
-- This is metadata-only and preserves the already-applied migration history.
ALTER INDEX "AccountingIntegrationInbox_org_source_request_key"
  RENAME TO "AccountingIntegrationInbox_orgId_sourceSystem_requestId_key";
ALTER INDEX "AccountingPayrollRunSnapshot_org_period_idx"
  RENAME TO "AccountingPayrollRunSnapshot_orgId_payPeriodStart_payPeriod_idx";
ALTER INDEX "AccountingPayrollRunSnapshot_org_run_key"
  RENAME TO "AccountingPayrollRunSnapshot_orgId_runId_runVersion_key";
ALTER INDEX "AccountingPostingAttempt_inbox_attempt_key"
  RENAME TO "AccountingPostingAttempt_inboxId_attemptNumber_key";
ALTER INDEX "AccountingPostingAttempt_org_status_started_idx"
  RENAME TO "AccountingPostingAttempt_orgId_status_startedAt_idx";
ALTER INDEX "AccountingRoundingPolicy_orgId_purpose_currencyCode_isActive_idx"
  RENAME TO "AccountingRoundingPolicy_orgId_purpose_currencyCode_isActiv_idx";
ALTER INDEX "AccountingSourceSnapshot_org_entity_occurred_idx"
  RENAME TO "AccountingSourceSnapshot_orgId_legalEntityId_occurredAt_idx";
ALTER INDEX "AccountingSourceSnapshot_org_request_key"
  RENAME TO "AccountingSourceSnapshot_orgId_sourceSystem_requestId_key";
ALTER INDEX "AccountingSourceSnapshot_org_source_key"
  RENAME TO "AccountingSourceSnapshot_orgId_sourceSystem_sourceType_sour_key";
ALTER INDEX "PayrollBatch_org_source_run_key"
  RENAME TO "PayrollBatch_orgId_sourceRunId_sourceRunVersion_key";

ALTER TABLE "GeneralLedgerEntry"
  ADD CONSTRAINT "GLEntry_JournalEntry_FK"
  FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

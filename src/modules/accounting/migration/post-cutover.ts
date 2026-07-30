import { compareDecimalStrings } from "../operational-helpers";

export type PostCutoverSnapshot = {
  authenticationReadable: boolean;
  accountingNavigationReadable: boolean;
  permissionBoundariesVerified: boolean;
  representativeDocumentsReadable: boolean;
  journalDebitTotal: string;
  journalCreditTotal: string;
  generalLedgerReadable: boolean;
  invoicePaymentLineageComplete: boolean;
  allocationTotalsMatch: boolean;
  outboxHealthy: boolean;
  schedulerHealthy: boolean;
  configurationComplete: boolean;
  migrationReconciliationPassed: boolean;
  providerState: "DISABLED" | "ENABLED";
  p95ReadMilliseconds: number;
  acceptedP95ReadMilliseconds: number;
};

export function verifyPostCutoverSnapshot(snapshot: PostCutoverSnapshot) {
  const checks = [
    ["AUTHENTICATION", snapshot.authenticationReadable],
    ["ACCOUNTING_NAVIGATION", snapshot.accountingNavigationReadable],
    ["PERMISSION_BOUNDARIES", snapshot.permissionBoundariesVerified],
    ["REPRESENTATIVE_DOCUMENT_READS", snapshot.representativeDocumentsReadable],
    [
      "JOURNAL_BALANCE",
      compareDecimalStrings(
        snapshot.journalDebitTotal,
        snapshot.journalCreditTotal,
      ) === 0,
    ],
    ["GENERAL_LEDGER_ACCESS", snapshot.generalLedgerReadable],
    ["INVOICE_PAYMENT_LINEAGE", snapshot.invoicePaymentLineageComplete],
    ["ALLOCATION_TOTALS", snapshot.allocationTotalsMatch],
    ["OUTBOX_HEALTH", snapshot.outboxHealthy],
    ["SCHEDULER_HEALTH", snapshot.schedulerHealthy],
    ["CONFIGURATION", snapshot.configurationComplete],
    ["MIGRATION_RECONCILIATION", snapshot.migrationReconciliationPassed],
    ["PROVIDER_DISABLED", snapshot.providerState === "DISABLED"],
    [
      "PERFORMANCE_BASELINE",
      Number.isFinite(snapshot.p95ReadMilliseconds) &&
        snapshot.p95ReadMilliseconds >= 0 &&
        snapshot.p95ReadMilliseconds <= snapshot.acceptedP95ReadMilliseconds,
    ],
  ].map(([code, passed]) => ({
    code: String(code),
    status: passed ? ("ready" as const) : ("blocked" as const),
  }));
  return {
    ready: checks.every((check) => check.status === "ready"),
    checks,
  };
}

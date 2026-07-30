export const ACCOUNTING_OPERATIONAL_MONITORS = [
  ["migration-batches", "Counts by safe batch state and age; no source payloads."],
  ["throughput", "Validated and processed record counts per bounded interval."],
  ["validation-failures", "Counts by stable validation code."],
  ["mapping-failures", "Missing and ambiguous mapping counts by scope identifier."],
  ["posting-failures", "Counts by stable canonical-service error classification."],
  ["reconciliation-mismatches", "Mismatch count by legal entity, currency, record type, and measure."],
  ["outbox-backlog", "Queued, retrying, dead-letter, and manual-review counts."],
  ["scheduler-health", "Owner identity, lease age, and duplicate occurrence count."],
  ["manual-review-backlog", "Count and oldest age by safe classification."],
  ["authorization-failures", "Denied action count by permission key and bounded actor category."],
  ["idempotency-conflicts", "Conflict count by batch and record type."],
  ["slow-operations", "Duration percentiles by operation code without arguments."],
  ["database-saturation", "Pool wait, active connections, query duration, and timeout counts without URLs."],
  ["provider-disabled-state", "Boolean provider and outbound-delivery disabled state."],
] as const;

export const ACCOUNTING_ALERT_DEFINITIONS = [
  ["ALT-PRODUCTION-GUARD", "SEV1", "production guard failure", "IT/platform and Security roles", "Halt; preserve evidence; verify environment identity."],
  ["ALT-MIGRATION-HALT", "SEV1", "migration halt", "Migration operator and IT/platform roles", "Stop the rehearsal/cutover and classify the last checkpoint."],
  ["ALT-DUPLICATE-RISK", "SEV1", "duplicate posting risk", "Accounting business owner and Migration operator roles", "Disable execution; reconcile idempotency and canonical lineage."],
  ["ALT-RECONCILIATION", "SEV1", "reconciliation imbalance", "Finance and Accounting business owner roles", "No-go; isolate affected scopes and reconcile exact totals."],
  ["ALT-SCOPE-ISOLATION", "SEV1", "scope-isolation violation", "Security and IT/platform roles", "Abort; preserve audit evidence; initiate security response."],
  ["ALT-BACKUP", "SEV1", "backup verification failure", "Database owner and IT/platform roles", "No-go until accepted backup and restore evidence exists."],
  ["ALT-OUTBOX-POISON", "SEV2", "outbox poison message", "Operations and Support roles", "Keep providers disabled; quarantine and inspect safe metadata."],
  ["ALT-SCHEDULER-DUPLICATION", "SEV1", "scheduler duplication", "IT/platform and Operations roles", "Disable duplicate owner; verify leases and occurrence identity."],
  ["ALT-PROVIDER-ACTIVATION", "SEV1", "provider activation outside authorization", "Security and IT/platform roles", "Disable provider immediately and preserve configuration audit evidence."],
  ["ALT-AUTHORIZATION", "SEV2", "elevated authorization failures", "Security role", "Review denied operation codes and identity posture."],
  ["ALT-PERFORMANCE", "SEV2", "performance degradation", "IT/platform and Migration operator roles", "Reduce bounded concurrency or halt at threshold."],
  ["ALT-ATTACHMENT", "SEV2", "attachment migration failure", "Operations and Security roles", "Quarantine metadata; do not bypass scanning or retention gates."],
] as const;

export const ACCOUNTING_OPERATIONAL_ACCEPTANCE_ROLES = [
  "Accounting business owner",
  "Finance",
  "Operations",
  "IT/platform",
  "Security",
  "Database owner",
  "Migration operator",
  "Approver/maker-checker owner",
  "Support/hypercare owner",
] as const;

export const ACCOUNTING_DEPLOYMENT_SEQUENCE = [
  ["DEP-01", "Pin and independently verify the exact application version.", false],
  ["DEP-02", "Validate additive migrations and backward compatibility.", false],
  ["DEP-03", "Validate the secret-free production configuration contract.", false],
  ["DEP-04", "Start with providers and outbound delivery disabled — requires separate production authorization.", true],
  ["DEP-05", "Confirm exactly one scheduler owner or keep the scheduler disabled — requires separate production authorization.", true],
  ["DEP-06", "Run non-mutating readiness and health checks.", false],
  ["DEP-07", "Verify migration tooling is present but execution remains disabled.", false],
  ["DEP-08", "Freeze source-system financial writes — requires separate production authorization.", true],
  ["DEP-09", "Verify accepted backup and restore-rehearsal evidence.", false],
  ["DEP-10", "Certify final dry-run evidence.", false],
  ["DEP-11", "Execute production migration — requires separate production authorization.", true],
  ["DEP-12", "Reconcile every legal entity, currency, type, and applicable total.", false],
  ["DEP-13", "Run the non-destructive production smoke specification — requires separate production authorization.", true],
  ["DEP-14", "Obtain business acceptance.", false],
  ["DEP-15", "Enable one provider destination at a time — requires separate production authorization.", true],
  ["DEP-16", "Monitor the accepted hypercare window.", false],
  ["DEP-17", "Close only after technical and business evidence is accepted.", false],
] as const;

export const ACCOUNTING_ROLLBACK_FORWARD_FIX_MATRIX = [
  ["pre-validation", true, true, true, true, false, false, "Migration operator", true, "No financial mutation."],
  ["mapping-validation", true, true, true, true, false, false, "Migration operator and checker", true, "Correct via a new approved mapping version."],
  ["dry-run", true, true, true, true, false, false, "Migration operator", true, "Dry-run artifacts may be superseded; audit evidence remains."],
  ["prepared-unposted", false, true, true, true, false, false, "Accounting business owner and checker", true, "Only explicitly confirmed pre-posting artifacts may be abandoned."],
  ["posted-canonical-effect", false, false, true, false, true, false, "Finance and independent approver", true, "Use canonical reversal or cancellation; never delete."],
  ["reconciliation-failure", false, false, true, false, true, false, "Finance and Accounting business owner", true, "No closure until exact scoped reconciliation passes."],
  ["infrastructure-corruption", false, false, true, false, false, true, "Database owner and rollback decision authority", true, "Restore is only a separately authorized infrastructure option."],
  ["provider-enable-failure", false, true, true, false, false, false, "IT/platform and Security", true, "Disable destination and forward-fix configuration."],
] as const;

export function validateOperationalControlCatalogue() {
  const monitorIds = ACCOUNTING_OPERATIONAL_MONITORS.map(([id]) => id);
  const alertIds = ACCOUNTING_ALERT_DEFINITIONS.map(([id]) => id);
  if (new Set(monitorIds).size !== monitorIds.length) {
    throw new Error("OPERATIONAL_MONITOR_DUPLICATE");
  }
  if (new Set(alertIds).size !== alertIds.length) {
    throw new Error("OPERATIONAL_ALERT_DUPLICATE");
  }
  if (
    ACCOUNTING_DEPLOYMENT_SEQUENCE.some(
      ([, instruction, productionChanging]) =>
        productionChanging &&
        !instruction.includes("requires separate production authorization"),
    )
  ) {
    throw new Error("DEPLOYMENT_AUTHORIZATION_LABEL_REQUIRED");
  }
  return {
    monitors: monitorIds.length,
    alerts: alertIds.length,
    acceptanceRoles: ACCOUNTING_OPERATIONAL_ACCEPTANCE_ROLES.length,
    deploymentSteps: ACCOUNTING_DEPLOYMENT_SEQUENCE.length,
    rollbackStages: ACCOUNTING_ROLLBACK_FORWARD_FIX_MATRIX.length,
    liveRoutesConnected: false,
  };
}

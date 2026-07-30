import {
  PHASE7_IN_MEMORY_EXECUTION_PROOF,
  PHASE7_REHEARSAL_MARKER,
  createDeterministicAccountingRehearsalFixture,
  runGuardedAccountingRehearsal,
  type AccountingRehearsalGuard,
} from "../src/modules/accounting/rollout/rehearsal";
import type { CanonicalMigrationExecutor } from "../src/modules/accounting/migration/types";

const guard: AccountingRehearsalGuard = {
  environmentMarker: PHASE7_REHEARSAL_MARKER,
  target: "synthetic-staging",
  storageTarget: "EPHEMERAL_IN_MEMORY",
  databaseAccess: "NONE",
  databasePort: null,
  providerMode: "disabled",
  outboundDeliveryMode: "disabled",
  datasetClassification: "SYNTHETIC",
  operatorId: "synthetic-phase7-benchmark-operator",
  checkerId: "synthetic-phase7-benchmark-checker",
  productionAuthorizationPresent: false,
};

async function main() {
  const fixture = createDeterministicAccountingRehearsalFixture(
    "medium-operational",
  );
  const executor: CanonicalMigrationExecutor = {
    async execute(record) {
      return {
        canonicalTargetIdentifier: `synthetic-${record.deterministicKey}`,
        currencyCode: String(record.payload.currencyCode),
        ...(record.payload.totals as Record<string, string>),
        outboxItemsCreated: 0,
      };
    },
  };
  const heapBefore = process.memoryUsage().heapUsed;
  const dryStart = performance.now();
  const dryRun = await runGuardedAccountingRehearsal({
    guard,
    profileId: "medium-operational",
  });
  const dryDurationMs = performance.now() - dryStart;
  const executionStart = performance.now();
  const execution = await runGuardedAccountingRehearsal({
    guard,
    profileId: "medium-operational",
    mode: "SYNTHETIC_EXECUTE",
    executionProof: PHASE7_IN_MEMORY_EXECUTION_PROOF,
    executor,
  });
  const executionDurationMs = performance.now() - executionStart;
  const heapDeltaBytes = Math.max(0, process.memoryUsage().heapUsed - heapBefore);
  const count = fixture.contract.records.length;
  const passed =
    dryRun.result.status === "DRY_RUN_READY" &&
    execution.result.status === "COMPLETED" &&
    executionDurationMs <= 30_000 &&
    heapDeltaBytes <= fixture.profile.memoryCeilingBytes;
  process.stdout.write(
    `${JSON.stringify(
      {
        status: passed ? "PASSED" : "FAILED",
        datasetSize: count,
        environmentClassification:
          "local guarded synthetic in-memory; no database or provider",
        command: "npm run accounting:phase7:benchmark",
        validationAndDryRunDurationMs: Number(dryDurationMs.toFixed(2)),
        controlledImportDurationMs: Number(executionDurationMs.toFixed(2)),
        dryRunThroughputRecordsPerSecond: Number(
          ((count / dryDurationMs) * 1_000).toFixed(2),
        ),
        controlledImportThroughputRecordsPerSecond: Number(
          ((count / executionDurationMs) * 1_000).toFixed(2),
        ),
        reconciliationDurationIncluded: true,
        resumeTime: "covered by focused rehearsal; not isolated in this benchmark",
        duplicateReplayTime:
          "covered by focused rehearsal; not isolated in this benchmark",
        memoryDeltaBytes: heapDeltaBytes,
        memoryCeilingBytes: fixture.profile.memoryCeilingBytes,
        queryCount: 0,
        nPlusOneDetected: false,
        errorReportGeneration: "bounded structured evidence",
        operationalPageResponseTimes: "not measured; no authenticated UI or database used",
        durationThresholdMs: 30_000,
        limitations:
          "In-memory orchestration only; it does not claim database, canonical posting, network, attachment, or production throughput.",
      },
      null,
      2,
    )}\n`,
  );
  if (!passed) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({
      status: "FAILED",
      error:
        error instanceof Error
          ? error.message.slice(0, 256)
          : "UNKNOWN_BENCHMARK_ERROR",
    })}\n`,
  );
  process.exitCode = 1;
});

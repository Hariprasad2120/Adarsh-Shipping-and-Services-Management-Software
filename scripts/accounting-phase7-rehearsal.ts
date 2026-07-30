import {
  PHASE7_IN_MEMORY_EXECUTION_PROOF,
  PHASE7_REHEARSAL_MARKER,
  createDeterministicAccountingRehearsalFixture,
  runGuardedAccountingRehearsal,
  type AccountingRehearsalGuard,
} from "../src/modules/accounting/rollout/rehearsal";
import type {
  CanonicalMigrationExecutor,
  NormalizedMigrationRecord,
} from "../src/modules/accounting/migration/types";
import { DisabledAccountingProviderAdapter } from "../src/modules/accounting/migration/provider-adapter";

const guard: AccountingRehearsalGuard = {
  environmentMarker: PHASE7_REHEARSAL_MARKER,
  target: "synthetic-staging",
  storageTarget: "EPHEMERAL_IN_MEMORY",
  databaseAccess: "NONE",
  databasePort: null,
  providerMode: "disabled",
  outboundDeliveryMode: "disabled",
  datasetClassification: "SYNTHETIC",
  operatorId: "synthetic-phase7-operator",
  checkerId: "synthetic-phase7-checker",
  productionAuthorizationPresent: false,
};

function evidence(record: NormalizedMigrationRecord) {
  return {
    canonicalTargetIdentifier: `synthetic-${record.deterministicKey}`,
    currencyCode: String(record.payload.currencyCode),
    ...(record.payload.totals as Record<string, string>),
    outboxItemsCreated: 0,
  };
}

function executorState(input?: { interruptAt?: number; mismatch?: boolean }) {
  const targets = new Map<string, string>();
  let calls = 0;
  let interrupted = false;
  const executor: CanonicalMigrationExecutor = {
    async execute(record) {
      calls += 1;
      if (
        input?.interruptAt === calls &&
        !interrupted
      ) {
        interrupted = true;
        throw new Error("POSTING_FAILURE:SYNTHETIC_INTERRUPTION");
      }
      targets.set(
        record.deterministicKey,
        targets.get(record.deterministicKey) ??
          `synthetic-${record.deterministicKey}`,
      );
      const result = evidence(record);
      if (
        input?.mismatch &&
        calls === 1 &&
        typeof result.documentTotal === "string"
      ) {
        result.documentTotal = "999999";
      }
      return result;
    },
  };
  return { executor, targets };
}

function safeResult(
  rehearsal: Awaited<ReturnType<typeof runGuardedAccountingRehearsal>>,
) {
  return {
    profileId: rehearsal.profileId,
    fixtureHash: rehearsal.fixtureHash,
    status: rehearsal.result.status,
    mode: rehearsal.result.mode,
    outcomes: rehearsal.result.outcomes.length,
    succeeded: rehearsal.result.outcomes.filter(
      (outcome) => outcome.status === "SUCCEEDED",
    ).length,
    skipped: rehearsal.result.outcomes.filter(
      (outcome) => outcome.status === "SKIPPED",
    ).length,
    failed: rehearsal.result.outcomes.filter(
      (outcome) => outcome.status === "FAILED",
    ).length,
    blocked: rehearsal.result.outcomes.filter(
      (outcome) => outcome.status === "BLOCKED",
    ).length,
    reconciliationPassed:
      rehearsal.result.reconciliation.totalsComplete &&
      rehearsal.result.reconciliation.totalsMatch,
    exceptionCount: rehearsal.result.issues.length,
    databaseQueries: rehearsal.databaseQueries,
    providerMode: rehearsal.providerMode,
  };
}

async function main() {
  const fixture = createDeterministicAccountingRehearsalFixture(
    "small-functional",
  );
  const dryRun = await runGuardedAccountingRehearsal({
    guard,
    profileId: "small-functional",
  });

  const cleanState = executorState();
  const cleanFirstTime = await runGuardedAccountingRehearsal({
    guard,
    profileId: "small-functional",
    mode: "SYNTHETIC_EXECUTE",
    executionProof: PHASE7_IN_MEMORY_EXECUTION_PROOF,
    executor: cleanState.executor,
  });
  const state = executorState({ interruptAt: 2 });
  const interrupted = await runGuardedAccountingRehearsal({
    guard,
    profileId: "small-functional",
    mode: "SYNTHETIC_EXECUTE",
    executionProof: PHASE7_IN_MEMORY_EXECUTION_PROOF,
    executor: state.executor,
  });
  const resumed = await runGuardedAccountingRehearsal({
    guard,
    profileId: "small-functional",
    mode: "SYNTHETIC_EXECUTE",
    executionProof: PHASE7_IN_MEMORY_EXECUTION_PROOF,
    executor: state.executor,
    previousOutcomes: interrupted.result.outcomes,
  });
  const replay = await runGuardedAccountingRehearsal({
    guard,
    profileId: "small-functional",
    mode: "SYNTHETIC_EXECUTE",
    executionProof: PHASE7_IN_MEMORY_EXECUTION_PROOF,
    executor: state.executor,
    previousOutcomes: resumed.result.outcomes,
  });
  const mismatchState = executorState({ mismatch: true });
  const mismatch = await runGuardedAccountingRehearsal({
    guard,
    profileId: "small-functional",
    mode: "SYNTHETIC_EXECUTE",
    executionProof: PHASE7_IN_MEMORY_EXECUTION_PROOF,
    executor: mismatchState.executor,
  });
  const disabledProvider = new DisabledAccountingProviderAdapter(
    "PHASE7_SYNTHETIC_DISABLED",
  );
  let sendRejected = false;
  let authenticationRejected = false;
  try {
    await disabledProvider.send();
  } catch (error) {
    sendRejected =
      error instanceof Error && error.message === "PROVIDER_DISABLED";
  }
  try {
    await disabledProvider.authenticate();
  } catch (error) {
    authenticationRejected =
      error instanceof Error &&
      error.message === "PROVIDER_AUTHENTICATION_DISABLED";
  }
  const providerDisabled =
    disabledProvider.health().state === "DISABLED" &&
    sendRejected &&
    authenticationRejected;

  const passed =
    dryRun.result.status === "DRY_RUN_READY" &&
    cleanFirstTime.result.status === "COMPLETED" &&
    cleanState.targets.size === fixture.contract.records.length &&
    ["FAILED", "BLOCKED"].includes(interrupted.result.status) &&
    resumed.result.status === "COMPLETED" &&
    replay.result.status === "COMPLETED" &&
    replay.result.outcomes.every((outcome) =>
      ["SUCCEEDED", "SKIPPED"].includes(outcome.status),
    ) &&
    state.targets.size === fixture.contract.records.length &&
    mismatch.result.status === "BLOCKED" &&
    providerDisabled;
  const report = {
    status: passed ? "PASSED" : "FAILED",
    environment: "guarded synthetic staging",
    storageTarget: "EPHEMERAL_IN_MEMORY",
    sourceData: "SYNTHETIC",
    productionAccess: false,
    databaseAccess: false,
    providersEnabled: false,
    scenariosExecuted: [
      "REH-001",
      "REH-002",
      "REH-003",
      "REH-004",
      "REH-017",
      "REH-018",
    ],
    dryRun: safeResult(dryRun),
    cleanFirstTime: safeResult(cleanFirstTime),
    interrupted: safeResult(interrupted),
    resumed: safeResult(resumed),
    replay: safeResult(replay),
    reconciliationMismatch: safeResult(mismatch),
    providerDisabled: {
      healthState: disabledProvider.health().state,
      sendRejected,
      authenticationRejected,
      externalDeliveries: 0,
    },
    uniqueSyntheticTargets: state.targets.size,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({
      status: "FAILED",
      error:
        error instanceof Error
          ? error.message.slice(0, 256)
          : "UNKNOWN_REHEARSAL_ERROR",
    })}\n`,
  );
  process.exitCode = 1;
});

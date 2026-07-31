import {
  assessPhase8Readiness,
  createDefaultPhase8Snapshot,
} from "../src/modules/accounting/authorization-planning";

async function main() {
  const snapshot = createDefaultPhase8Snapshot({
    organizationId: "ORG-PRODUCTION-SCOPE-AWAITING-VERIFICATION",
    legalEntityId: "LEGAL-ENTITY-SCOPE-AWAITING-VERIFICATION",
    environment: "PRODUCTION",
  });
  const assessment = await assessPhase8Readiness(snapshot, {
    now: new Date("2026-07-31T10:00:00.000Z"),
    identities: new Map(),
    independentlyComputedEvidenceDigests: new Map(),
    expectedEvidenceRequirements: new Map(),
    manifestExpectation: null,
  });
  const report = {
    phase: "PHASE8_PRODUCTION_AUTHORIZATION_PLANNING",
    state: assessment.ready ? "AUTHORIZATION_REQUEST_READY" : "NOT_READY",
    blockerCount: assessment.blockers.length,
    blockers: assessment.blockers,
    policyStatus: {
      total: snapshot.policies.length,
      awaitingDecision: snapshot.policies.filter(
        (policy) => policy.status === "AWAITING_DECISION",
      ).length,
      approved: 0,
    },
    productionAuthorizationGranted: false,
    productionExecutionAvailable: false,
    cutoverAvailable: false,
    providersEnabled: false,
    outboundDeliveryEnabled: false,
    databaseAccess: false,
    externalEvidenceStorageConnected: false,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.state !== "NOT_READY") process.exitCode = 1;
}

void main();

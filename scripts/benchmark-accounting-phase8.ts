import { performance } from "node:perf_hooks";

import {
  assessPhase8Readiness,
  createDefaultPhase8Snapshot,
} from "../src/modules/accounting/authorization-planning";

const iterations = 1_000;
const snapshot = createDefaultPhase8Snapshot({
  organizationId: "ORG-PRODUCTION-SCOPE-AWAITING-VERIFICATION",
  legalEntityId: "LEGAL-ENTITY-SCOPE-AWAITING-VERIFICATION",
  environment: "PRODUCTION",
});
const context = {
  now: new Date("2026-07-31T10:00:00.000Z"),
  identities: new Map(),
  independentlyComputedEvidenceDigests: new Map(),
  expectedEvidenceRequirements: new Map(),
  manifestExpectation: null,
};

async function main() {
  const before = process.memoryUsage().heapUsed;
  const started = performance.now();
  let unexpectedReady = 0;
  for (let index = 0; index < iterations; index += 1) {
    if ((await assessPhase8Readiness(snapshot, context)).ready) {
      unexpectedReady += 1;
    }
  }
  const durationMs = performance.now() - started;
  const heapDeltaBytes = process.memoryUsage().heapUsed - before;
  const result = {
    workload: "bounded deterministic missing-evidence readiness assessment",
    iterations,
    durationMs: Number(durationMs.toFixed(2)),
    averageMs: Number((durationMs / iterations).toFixed(4)),
    heapDeltaBytes,
    unexpectedReady,
    databaseQueries: 0,
    externalRequests: 0,
    productionAccess: false,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (unexpectedReady !== 0) process.exitCode = 1;
}

void main();

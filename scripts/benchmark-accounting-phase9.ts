import {
  capabilityPolicyConfigurationHash,
  resolveAccountingCapabilityReadinessFromPolicies,
  type AccountingCapabilityCode,
} from "../src/modules/accounting/capability-policies";

const capabilityCodes: AccountingCapabilityCode[] = [
  "RECURRING_GENERATION",
  "ASSET_DEPRECIATION",
  "PARTNER_ACCOUNTING",
  "PRODUCTION_OUTBOX",
];

const now = new Date("2026-07-31T12:00:00.000Z");

const fixturePolicies = capabilityCodes.flatMap((capability, index) => [
  {
    id: `org-${capability}-draft`,
    orgId: "org-benchmark",
    legalEntityId: null,
    capabilityCode: capability,
    version: 1,
    status: "DRAFT",
    configuration: {
      enabled: false,
      checklist: [{ code: "DRAFT", label: "Draft only", status: "PENDING" }],
    },
    configurationHash: "x".repeat(64),
    effectiveFrom: new Date("2026-07-01T00:00:00.000Z"),
    effectiveTo: null,
    createdById: `maker-${index}`,
    submittedAt: null,
    approvedById: null,
    approvedAt: null,
    rejectedById: null,
    rejectedAt: null,
    rejectionReason: null,
    revokedById: null,
    revokedAt: null,
    revocationReason: null,
    supersedesId: null,
    rowVersion: 1,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
  },
  {
    id: `org-${capability}-approved`,
    orgId: "org-benchmark",
    legalEntityId: null,
    capabilityCode: capability,
    version: 2,
    status: "APPROVED",
    configuration: {
      enabled: true,
      checklist: [{ code: "READY", label: "Approved", status: "READY" }],
      blockers: [],
      warnings: [],
    },
    configurationHash:
      capability === "RECURRING_GENERATION"
        ? "stale-hash"
        : "",
    effectiveFrom: new Date("2026-07-15T00:00:00.000Z"),
    effectiveTo: null,
    createdById: `maker-${index}`,
    submittedAt: new Date("2026-07-16T00:00:00.000Z"),
    approvedById: `checker-${index}`,
    approvedAt: new Date("2026-07-16T00:00:00.000Z"),
    rejectedById: null,
    rejectedAt: null,
    rejectionReason: null,
    revokedById: null,
    revokedAt: null,
    revocationReason: null,
    supersedesId: null,
    rowVersion: 2,
    createdAt: new Date("2026-07-15T00:00:00.000Z"),
    updatedAt: new Date("2026-07-16T00:00:00.000Z"),
  },
]);

for (const policy of fixturePolicies) {
  if (policy.configurationHash === "") {
    policy.configurationHash = capabilityPolicyConfigurationHash(policy.configuration);
  }
}

const start = performance.now();
let ready = 0;
let partial = 0;
let notReady = 0;

for (let index = 0; index < 5_000; index += 1) {
  for (const capability of capabilityCodes) {
    const result = resolveAccountingCapabilityReadinessFromPolicies({
      capability,
      policies: fixturePolicies.filter((policy) => policy.capabilityCode === capability),
      now,
    });
    if (result.status === "READY") ready += 1;
    else if (result.status === "PARTIAL") partial += 1;
    else notReady += 1;
  }
}

const durationMs = Number((performance.now() - start).toFixed(2));
process.stdout.write(
  `${JSON.stringify(
    {
      status: "PASSED",
      iterations: 5000,
      durationMs,
      ready,
      partial,
      notReady,
      referenceDate: now.toISOString(),
    },
    null,
    2,
  )}\n`,
);

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  capabilityPolicyConfigurationHash,
  requireCapabilityPolicyRowVersion,
  resolveAccountingCapabilityReadinessFromPolicies,
  type AccountingCapabilityCode,
} from "@/modules/accounting/capability-policies";

function approvedPolicy(overrides: Partial<Record<string, unknown>> = {}) {
  const configuration = {
    enabled: true,
    allowOrganisationFallback: true,
    checklist: [{ code: "READY", label: "Approved", status: "READY" }],
    blockers: [],
    warnings: [],
    ...(overrides.configuration as object | undefined),
  };
  return {
    id: "policy-ready",
    orgId: "org-1",
    legalEntityId: null,
    capabilityCode: "RECURRING_GENERATION",
    version: 1,
    status: "APPROVED",
    configuration,
    configurationHash: capabilityPolicyConfigurationHash(configuration),
    effectiveFrom: new Date("2026-07-01T00:00:00.000Z"),
    effectiveTo: null,
    createdById: "maker-1",
    submittedAt: new Date("2026-07-02T00:00:00.000Z"),
    approvedById: "checker-1",
    approvedAt: new Date("2026-07-02T00:00:00.000Z"),
    rejectedById: null,
    rejectedAt: null,
    rejectionReason: null,
    revokedById: null,
    revokedAt: null,
    revocationReason: null,
    supersedesId: null,
    rowVersion: 1,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-02T00:00:00.000Z"),
    ...overrides,
  };
}

function resolve(
  policies: ReturnType<typeof approvedPolicy>[],
  capability: AccountingCapabilityCode = "RECURRING_GENERATION",
  legalEntityId?: string | null,
) {
  return resolveAccountingCapabilityReadinessFromPolicies({
    capability,
    policies,
    legalEntityId,
    now: new Date("2026-07-31T12:00:00.000Z"),
  });
}

describe("Phase 9 capability-policy readiness", () => {
  it("returns configuration required when no policy exists", () => {
    const result = resolve([]);
    expect(result.status).toBe("NOT_READY");
    expect(result.uiStatus).toBe("CONFIGURATION_REQUIRED");
  });

  it("blocks a draft policy", () => {
    const result = resolve([approvedPolicy({ status: "DRAFT" })]);
    expect(result.uiStatus).toBe("CONFIGURATION_REQUIRED");
    expect(result.enabled).toBe(false);
  });

  it("marks a pending policy as awaiting approval", () => {
    const result = resolve([approvedPolicy({ status: "PENDING_APPROVAL" })]);
    expect(result.status).toBe("PARTIAL");
    expect(result.uiStatus).toBe("AWAITING_APPROVAL");
  });

  it("blocks an approved future policy", () => {
    const result = resolve([
      approvedPolicy({
        effectiveFrom: new Date("2026-08-01T00:00:00.000Z"),
      }),
    ]);
    expect(result.status).toBe("PARTIAL");
    expect(result.uiStatus).toBe("PARTIALLY_CONFIGURED");
  });

  it("marks an approved expired policy as expired", () => {
    const result = resolve([
      approvedPolicy({
        effectiveTo: new Date("2026-07-15T00:00:00.000Z"),
      }),
    ]);
    expect(result.status).toBe("NOT_READY");
    expect(result.uiStatus).toBe("EXPIRED");
  });

  it("accepts an approved active policy", () => {
    const result = resolve([approvedPolicy()]);
    expect(result.status).toBe("READY");
    expect(result.enabled).toBe(true);
  });

  it("rejects a revoked policy", () => {
    const result = resolve([
      approvedPolicy({
        status: "REVOKED",
        revokedById: "checker-2",
        revokedAt: new Date("2026-07-20T00:00:00.000Z"),
        revocationReason: "Revoked in favour of a later decision",
      }),
    ]);
    expect(result.status).toBe("NOT_READY");
    expect(result.blockers[0]).toContain("Revoked");
  });

  it("rejects a superseded policy", () => {
    const result = resolve([approvedPolicy({ status: "SUPERSEDED" })]);
    expect(result.status).toBe("NOT_READY");
    expect(result.blockers[0]).toContain("superseded");
  });

  it("rejects a hash mismatch", () => {
    const result = resolve([
      approvedPolicy({
        configurationHash: "0".repeat(64),
      }),
    ]);
    expect(result.uiStatus).toBe("INVALID_CONFIGURATION");
  });

  it("rejects same maker and checker", () => {
    const result = resolve([
      approvedPolicy({
        createdById: "same-user",
        approvedById: "same-user",
      }),
    ]);
    expect(result.uiStatus).toBe("INVALID_CONFIGURATION");
  });

  it("prefers a legal-entity-specific policy over organisation-wide fallback", () => {
    const result = resolve(
      [
        approvedPolicy(),
        approvedPolicy({
          id: "entity-policy",
          legalEntityId: "entity-1",
          version: 2,
          capabilityCode: "RECURRING_GENERATION",
        }),
      ],
      "RECURRING_GENERATION",
      "entity-1",
    );
    expect(result.policyId).toBe("entity-policy");
  });

  it("uses organisation-wide fallback when no legal-entity-specific policy exists", () => {
    const result = resolve(
      [approvedPolicy()],
      "RECURRING_GENERATION",
      "entity-99",
    );
    expect(result.policyId).toBe("policy-ready");
    expect(result.enabled).toBe(true);
  });

  it("detects optimistic-lock conflicts", () => {
    expect(() => requireCapabilityPolicyRowVersion(3, 2)).toThrow(
      "CAPABILITY_POLICY_VERSION_CONFLICT",
    );
  });
});

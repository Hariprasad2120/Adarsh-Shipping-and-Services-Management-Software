import "server-only";

import { db } from "@/lib/db";
import { payloadHash } from "./request-integrity";

export const ACCOUNTING_CAPABILITY_CODES = [
  "ACCOUNTING_GST",
  "ACCOUNTING_TDS",
  "ACCOUNTING_TCS",
  "ACCOUNTING_E_INVOICE",
  "ACCOUNTING_E_WAY_BILL",
  "BANK_RECONCILIATION",
  "RECURRING_GENERATION",
  "ASSET_DEPRECIATION",
  "PARTNER_ACCOUNTING",
  "BUDGET_CONTROL",
  "PRODUCTION_OUTBOX",
  "PERIOD_CLOSE",
  "CUSTOMER_PORTAL_FINANCE",
  "VENDOR_PORTAL_FINANCE",
] as const;

export type AccountingCapabilityCode =
  (typeof ACCOUNTING_CAPABILITY_CODES)[number];

export const ACCOUNTING_CAPABILITY_POLICY_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "REVOKED",
  "SUPERSEDED",
] as const;

export type AccountingCapabilityPolicyStatus =
  (typeof ACCOUNTING_CAPABILITY_POLICY_STATUSES)[number];

export type AccountingCapabilityUiStatus =
  | "READY"
  | "PARTIALLY_CONFIGURED"
  | "CONFIGURATION_REQUIRED"
  | "AWAITING_APPROVAL"
  | "EXPIRED"
  | "INVALID_CONFIGURATION";

export type AccountingCapabilityChecklistItem = {
  code: string;
  label: string;
  status: "READY" | "PENDING" | "WARNING";
  detail?: string | null;
};

export type AccountingCapabilityPolicyConfiguration = {
  enabled: boolean;
  mode?: "ACTIVE" | "READ_ONLY";
  allowOrganisationFallback?: boolean;
  checklist?: AccountingCapabilityChecklistItem[];
  blockers?: string[];
  warnings?: string[];
  notes?: string | null;
};

export type AccountingCapabilityReadiness = {
  capability: AccountingCapabilityCode;
  status: "READY" | "PARTIAL" | "NOT_READY";
  uiStatus: AccountingCapabilityUiStatus;
  enabled: boolean;
  policyId: string | null;
  policyVersion: number | null;
  blockers: string[];
  warnings: string[];
  legalEntityId: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  configurationHash: string | null;
};

type CapabilityPolicyRecord = {
  id: string;
  orgId: string;
  legalEntityId: string | null;
  capabilityCode: string;
  version: number;
  status: string;
  configuration: unknown;
  configurationHash: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdById: string;
  submittedAt: Date | null;
  approvedById: string | null;
  approvedAt: Date | null;
  rejectedById: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  revokedById: string | null;
  revokedAt: Date | null;
  revocationReason: string | null;
  supersedesId: string | null;
  rowVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AccountingCapabilityPolicyListItem = {
  id: string;
  capabilityCode: AccountingCapabilityCode;
  version: number;
  status: AccountingCapabilityPolicyStatus | "EXPIRED";
  legalEntityId: string | null;
  legalEntityLabel: string | null;
  createdById: string;
  createdByName: string;
  approvedByName: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  configurationHash: string;
  rowVersion: number;
  readiness: AccountingCapabilityReadiness;
  createdAt: string;
  updatedAt: string;
};

export type AccountingCapabilityPolicyEditor = {
  id: string;
  capabilityCode: AccountingCapabilityCode;
  version: number;
  legalEntityId: string | null;
  status: AccountingCapabilityPolicyStatus | "EXPIRED";
  effectiveFrom: string;
  effectiveTo: string | null;
  configurationHash: string;
  configurationJson: string;
  rowVersion: number;
  rejectionReason: string | null;
  revocationReason: string | null;
  readiness: AccountingCapabilityReadiness;
};

export type AccountingCapabilityPolicyAuditEntry = {
  id: string;
  action: string;
  actor: string;
  occurredAt: string;
};

export type AccountingCapabilityPolicyFilters = {
  capabilityCode?: AccountingCapabilityCode | null;
  legalEntityId?: string | null;
  status?: string | null;
};

export type SaveCapabilityPolicyDraftInput = {
  policyId?: string;
  orgId: string;
  actorId: string;
  expectedVersion?: number;
  capabilityCode: AccountingCapabilityCode;
  legalEntityId?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  configuration: unknown;
  supersedesId?: string | null;
};

function isCapabilityCode(value: string): value is AccountingCapabilityCode {
  return (ACCOUNTING_CAPABILITY_CODES as readonly string[]).includes(value);
}

export function assertAccountingCapabilityCode(
  value: string,
): AccountingCapabilityCode {
  if (!isCapabilityCode(value)) {
    throw new Error("CAPABILITY_CODE_INVALID");
  }
  return value;
}

function ensureIsoDate(value: string, code: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(code);
  }
  const normalized = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(normalized.getTime())) {
    throw new Error(code);
  }
  return normalized;
}

function toIsoDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function normalizeChecklistItem(
  value: unknown,
  index: number,
): AccountingCapabilityChecklistItem {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`CAPABILITY_CONFIGURATION_CHECKLIST_INVALID:${index}`);
  }
  const item = value as Record<string, unknown>;
  const code = String(item.code ?? "").trim();
  const label = String(item.label ?? "").trim();
  const status = String(item.status ?? "").trim();
  if (!code || !label) {
    throw new Error(`CAPABILITY_CONFIGURATION_CHECKLIST_INVALID:${index}`);
  }
  if (!["READY", "PENDING", "WARNING"].includes(status)) {
    throw new Error(`CAPABILITY_CONFIGURATION_CHECKLIST_INVALID:${index}`);
  }
  return {
    code,
    label,
    status: status as AccountingCapabilityChecklistItem["status"],
    detail:
      item.detail == null || String(item.detail).trim() === ""
        ? null
        : String(item.detail).trim(),
  };
}

function normalizeStringList(
  value: unknown,
  code: string,
  maximum = 24,
): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > maximum) {
    throw new Error(code);
  }
  return value.map((entry) => {
    const normalized = String(entry ?? "").trim();
    if (!normalized) throw new Error(code);
    return normalized;
  });
}

export function parseAccountingCapabilityPolicyConfiguration(
  value: unknown,
): AccountingCapabilityPolicyConfiguration {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("CAPABILITY_CONFIGURATION_INVALID");
  }
  const input = value as Record<string, unknown>;
  if (typeof input.enabled !== "boolean") {
    throw new Error("CAPABILITY_CONFIGURATION_ENABLED_REQUIRED");
  }
  const mode =
    input.mode == null
      ? "ACTIVE"
      : String(input.mode).trim().toUpperCase();
  if (!["ACTIVE", "READ_ONLY"].includes(mode)) {
    throw new Error("CAPABILITY_CONFIGURATION_MODE_INVALID");
  }
  const checklist = Array.isArray(input.checklist)
    ? input.checklist.map((entry, index) =>
        normalizeChecklistItem(entry, index),
      )
    : [];
  return {
    enabled: input.enabled,
    mode: mode as AccountingCapabilityPolicyConfiguration["mode"],
    allowOrganisationFallback:
      input.allowOrganisationFallback == null
        ? true
        : Boolean(input.allowOrganisationFallback),
    checklist,
    blockers: normalizeStringList(
      input.blockers,
      "CAPABILITY_CONFIGURATION_BLOCKERS_INVALID",
    ),
    warnings: normalizeStringList(
      input.warnings,
      "CAPABILITY_CONFIGURATION_WARNINGS_INVALID",
    ),
    notes:
      input.notes == null || String(input.notes).trim() === ""
        ? null
        : String(input.notes).trim(),
  };
}

export function capabilityPolicyConfigurationHash(value: unknown) {
  return payloadHash(parseAccountingCapabilityPolicyConfiguration(value));
}

function normalizePolicyStatus(
  policy: CapabilityPolicyRecord,
  now: Date,
): AccountingCapabilityPolicyStatus | "EXPIRED" {
  if (
    policy.status === "APPROVED" &&
    policy.effectiveTo &&
    policy.effectiveTo.getTime() < now.getTime()
  ) {
    return "EXPIRED";
  }
  return policy.status as AccountingCapabilityPolicyStatus;
}

function selectPolicyScope(
  policies: CapabilityPolicyRecord[],
  legalEntityId?: string | null,
) {
  if (legalEntityId) {
    const exact = policies.filter((policy) => policy.legalEntityId === legalEntityId);
    if (exact.length > 0) {
      return exact;
    }
  }
  return policies.filter((policy) => policy.legalEntityId == null);
}

function sortPoliciesDescending(a: CapabilityPolicyRecord, b: CapabilityPolicyRecord) {
  return (
    b.version - a.version ||
    b.createdAt.getTime() - a.createdAt.getTime() ||
    b.id.localeCompare(a.id)
  );
}

export function resolveAccountingCapabilityReadinessFromPolicies(input: {
  capability: AccountingCapabilityCode;
  policies: CapabilityPolicyRecord[];
  legalEntityId?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const scopedPolicies = selectPolicyScope(input.policies, input.legalEntityId).sort(
    sortPoliciesDescending,
  );
  if (scopedPolicies.length === 0) {
    return {
      capability: input.capability,
      status: "NOT_READY" as const,
      uiStatus: "CONFIGURATION_REQUIRED" as const,
      enabled: false,
      policyId: null,
      policyVersion: null,
      blockers: ["No capability policy is configured for this scope."],
      warnings: [],
      legalEntityId: input.legalEntityId ?? null,
      effectiveFrom: null,
      effectiveTo: null,
      configurationHash: null,
    };
  }

  const policy = scopedPolicies[0]!;
  const base = {
    capability: input.capability,
    policyId: policy.id,
    policyVersion: policy.version,
    legalEntityId: policy.legalEntityId,
    effectiveFrom: toIsoDate(policy.effectiveFrom),
    effectiveTo: toIsoDate(policy.effectiveTo),
    configurationHash: policy.configurationHash,
  };
  const policyStatus = normalizePolicyStatus(policy, now);

  if (policyStatus === "DRAFT") {
    return {
      ...base,
      status: "NOT_READY" as const,
      uiStatus: "CONFIGURATION_REQUIRED" as const,
      enabled: false,
      blockers: ["The latest capability policy is still a draft."],
      warnings: [],
    };
  }
  if (policyStatus === "PENDING_APPROVAL") {
    return {
      ...base,
      status: "PARTIAL" as const,
      uiStatus: "AWAITING_APPROVAL" as const,
      enabled: false,
      blockers: ["The capability policy is awaiting independent approval."],
      warnings: [],
    };
  }
  if (policyStatus === "REJECTED") {
    return {
      ...base,
      status: "NOT_READY" as const,
      uiStatus: "CONFIGURATION_REQUIRED" as const,
      enabled: false,
      blockers: [
        policy.rejectionReason?.trim() || "The capability policy was rejected.",
      ],
      warnings: [],
    };
  }
  if (policyStatus === "REVOKED") {
    return {
      ...base,
      status: "NOT_READY" as const,
      uiStatus: "CONFIGURATION_REQUIRED" as const,
      enabled: false,
      blockers: [
        policy.revocationReason?.trim() || "The capability policy was revoked.",
      ],
      warnings: [],
    };
  }
  if (policyStatus === "SUPERSEDED") {
    return {
      ...base,
      status: "NOT_READY" as const,
      uiStatus: "CONFIGURATION_REQUIRED" as const,
      enabled: false,
      blockers: ["The capability policy has been superseded."],
      warnings: [],
    };
  }
  if (policyStatus === "EXPIRED") {
    return {
      ...base,
      status: "NOT_READY" as const,
      uiStatus: "EXPIRED" as const,
      enabled: false,
      blockers: ["The approved capability policy has expired."],
      warnings: [],
    };
  }
  if (!policy.approvedById || !policy.approvedAt) {
    return {
      ...base,
      status: "NOT_READY" as const,
      uiStatus: "INVALID_CONFIGURATION" as const,
      enabled: false,
      blockers: ["The approved capability policy is missing approval evidence."],
      warnings: [],
    };
  }
  if (policy.createdById === policy.approvedById) {
    return {
      ...base,
      status: "NOT_READY" as const,
      uiStatus: "INVALID_CONFIGURATION" as const,
      enabled: false,
      blockers: ["Maker and checker must be different users."],
      warnings: [],
    };
  }
  if (policy.effectiveFrom.getTime() > now.getTime()) {
    return {
      ...base,
      status: "PARTIAL" as const,
      uiStatus: "PARTIALLY_CONFIGURED" as const,
      enabled: false,
      blockers: ["The approved capability policy is not effective yet."],
      warnings: [],
    };
  }

  try {
    const parsedConfiguration = parseAccountingCapabilityPolicyConfiguration(
      policy.configuration,
    );
    const expectedHash = capabilityPolicyConfigurationHash(policy.configuration);
    if (expectedHash !== policy.configurationHash) {
      return {
        ...base,
        status: "NOT_READY" as const,
        uiStatus: "INVALID_CONFIGURATION" as const,
        enabled: false,
        blockers: ["The stored configuration hash does not match the policy payload."],
        warnings: [],
      };
    }
    if (!parsedConfiguration.enabled) {
      return {
        ...base,
        status: "NOT_READY" as const,
        uiStatus: "CONFIGURATION_REQUIRED" as const,
        enabled: false,
        blockers: ["The capability remains disabled in the approved policy."],
        warnings: parsedConfiguration.warnings ?? [],
      };
    }
    const pendingChecklist = parsedConfiguration.checklist?.filter(
      (item) => item.status === "PENDING",
    );
    if (pendingChecklist && pendingChecklist.length > 0) {
      return {
        ...base,
        status: "PARTIAL" as const,
        uiStatus: "PARTIALLY_CONFIGURED" as const,
        enabled: false,
        blockers: pendingChecklist.map(
          (item) => item.detail?.trim() || `${item.label} is still pending.`,
        ),
        warnings: parsedConfiguration.warnings ?? [],
      };
    }
    return {
      ...base,
      status: "READY" as const,
      uiStatus: "READY" as const,
      enabled: true,
      blockers: parsedConfiguration.blockers ?? [],
      warnings: [
        ...(parsedConfiguration.warnings ?? []),
        ...((parsedConfiguration.checklist ?? [])
          .filter((item) => item.status === "WARNING")
          .map((item) => item.detail?.trim() || `${item.label} needs review.`)),
      ],
    };
  } catch (error) {
    return {
      ...base,
      status: "NOT_READY" as const,
      uiStatus: "INVALID_CONFIGURATION" as const,
      enabled: false,
      blockers: [
        error instanceof Error
          ? error.message
          : "The capability configuration is malformed.",
      ],
      warnings: [],
    };
  }
}

export async function resolveAccountingCapabilityReadiness(input: {
  orgId: string;
  capability: AccountingCapabilityCode;
  legalEntityId?: string | null;
}) {
  const policies = await db.accountingCapabilityPolicy.findMany({
    where: {
      orgId: input.orgId,
      capabilityCode: input.capability,
      OR: input.legalEntityId
        ? [{ legalEntityId: input.legalEntityId }, { legalEntityId: null }]
        : undefined,
    },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
  });
  return resolveAccountingCapabilityReadinessFromPolicies({
    capability: input.capability,
    policies,
    legalEntityId: input.legalEntityId,
  });
}

async function auditCapabilityPolicyChange(input: {
  orgId: string;
  actorId: string;
  entityId: string;
  action: string;
  beforeValues?: unknown;
  afterValues?: unknown;
}) {
  await db.accountingAuditLog.create({
    data: {
      orgId: input.orgId,
      userId: input.actorId,
      action: input.action,
      entityType: "AccountingCapabilityPolicy",
      entityId: input.entityId,
      beforeValues:
        input.beforeValues == null ? undefined : (input.beforeValues as object),
      afterValues:
        input.afterValues == null ? undefined : (input.afterValues as object),
    },
  });
}

export function requireCapabilityPolicyRowVersion(
  currentVersion: number,
  expectedVersion?: number,
) {
  if (expectedVersion == null) {
    throw new Error("CAPABILITY_POLICY_VERSION_REQUIRED");
  }
  if (currentVersion !== expectedVersion) {
    throw new Error("CAPABILITY_POLICY_VERSION_CONFLICT");
  }
}

async function ensureLegalEntityScope(
  orgId: string,
  legalEntityId?: string | null,
) {
  if (!legalEntityId) return null;
  const entity = await db.accountingLegalEntity.findFirst({
    where: { id: legalEntityId, orgId },
    select: { id: true },
  });
  if (!entity) {
    throw new Error("CAPABILITY_POLICY_LEGAL_ENTITY_NOT_FOUND");
  }
  return entity.id;
}

export async function saveAccountingCapabilityPolicyDraft(
  input: SaveCapabilityPolicyDraftInput,
) {
  const capabilityCode = assertAccountingCapabilityCode(input.capabilityCode);
  const legalEntityId = await ensureLegalEntityScope(input.orgId, input.legalEntityId);
  const effectiveFrom = ensureIsoDate(
    input.effectiveFrom,
    "CAPABILITY_POLICY_EFFECTIVE_FROM_INVALID",
  );
  const effectiveTo =
    input.effectiveTo && input.effectiveTo.trim()
      ? ensureIsoDate(
          input.effectiveTo.trim(),
          "CAPABILITY_POLICY_EFFECTIVE_TO_INVALID",
        )
      : null;
  if (effectiveTo && effectiveTo.getTime() < effectiveFrom.getTime()) {
    throw new Error("CAPABILITY_POLICY_EFFECTIVE_RANGE_INVALID");
  }
  const configuration = parseAccountingCapabilityPolicyConfiguration(
    input.configuration,
  );
  const configurationHash = capabilityPolicyConfigurationHash(configuration);

  return db.$transaction(async (tx) => {
    if (input.policyId) {
      const existing = await tx.accountingCapabilityPolicy.findFirst({
        where: { id: input.policyId, orgId: input.orgId },
      });
      if (!existing) throw new Error("CAPABILITY_POLICY_NOT_FOUND");
      requireCapabilityPolicyRowVersion(existing.rowVersion, input.expectedVersion);
      if (existing.status !== "DRAFT") {
        throw new Error("CAPABILITY_POLICY_ONLY_DRAFT_EDITABLE");
      }
      const updated = await tx.accountingCapabilityPolicy.update({
        where: { id: existing.id },
        data: {
          legalEntityId,
          capabilityCode,
          effectiveFrom,
          effectiveTo,
          configuration,
          configurationHash,
          rowVersion: { increment: 1 },
        },
      });
      await auditCapabilityPolicyChange({
        orgId: input.orgId,
        actorId: input.actorId,
        entityId: updated.id,
        action: "ACCOUNTING_CAPABILITY_POLICY_DRAFT_UPDATED",
        beforeValues: {
          capabilityCode: existing.capabilityCode,
          legalEntityId: existing.legalEntityId,
          status: existing.status,
          effectiveFrom: toIsoDate(existing.effectiveFrom),
          effectiveTo: toIsoDate(existing.effectiveTo),
          configurationHash: existing.configurationHash,
          rowVersion: existing.rowVersion,
        },
        afterValues: {
          capabilityCode: updated.capabilityCode,
          legalEntityId: updated.legalEntityId,
          status: updated.status,
          effectiveFrom: toIsoDate(updated.effectiveFrom),
          effectiveTo: toIsoDate(updated.effectiveTo),
          configurationHash: updated.configurationHash,
          rowVersion: updated.rowVersion,
        },
      });
      return updated;
    }

    const scopePolicies = await tx.accountingCapabilityPolicy.findMany({
      where: {
        orgId: input.orgId,
        legalEntityId,
        capabilityCode,
      },
      select: { version: true },
      orderBy: { version: "desc" },
      take: 1,
    });
    const version = (scopePolicies[0]?.version ?? 0) + 1;
    if (input.supersedesId) {
      const superseded = await tx.accountingCapabilityPolicy.findFirst({
        where: {
          id: input.supersedesId,
          orgId: input.orgId,
          capabilityCode,
          legalEntityId,
        },
      });
      if (!superseded) throw new Error("CAPABILITY_POLICY_SUPERSEDES_NOT_FOUND");
    }
    const created = await tx.accountingCapabilityPolicy.create({
      data: {
        orgId: input.orgId,
        legalEntityId,
        capabilityCode,
        version,
        status: "DRAFT",
        configuration,
        configurationHash,
        effectiveFrom,
        effectiveTo,
        createdById: input.actorId,
        supersedesId: input.supersedesId ?? null,
      },
    });
    await auditCapabilityPolicyChange({
      orgId: input.orgId,
      actorId: input.actorId,
      entityId: created.id,
      action: "ACCOUNTING_CAPABILITY_POLICY_DRAFT_CREATED",
      afterValues: {
        capabilityCode: created.capabilityCode,
        legalEntityId: created.legalEntityId,
        version: created.version,
        effectiveFrom: toIsoDate(created.effectiveFrom),
        effectiveTo: toIsoDate(created.effectiveTo),
        configurationHash: created.configurationHash,
      },
    });
    return created;
  });
}

async function getCapabilityPolicyForMutation(
  orgId: string,
  policyId: string,
) {
  const policy = await db.accountingCapabilityPolicy.findFirst({
    where: { id: policyId, orgId },
  });
  if (!policy) {
    throw new Error("CAPABILITY_POLICY_NOT_FOUND");
  }
  return policy;
}

export async function submitAccountingCapabilityPolicyForApproval(input: {
  orgId: string;
  actorId: string;
  policyId: string;
  expectedVersion: number;
}) {
  const existing = await getCapabilityPolicyForMutation(input.orgId, input.policyId);
  requireCapabilityPolicyRowVersion(existing.rowVersion, input.expectedVersion);
  if (existing.status !== "DRAFT") {
    throw new Error("CAPABILITY_POLICY_SUBMIT_STATE_INVALID");
  }
  const updated = await db.accountingCapabilityPolicy.update({
    where: { id: existing.id },
    data: {
      status: "PENDING_APPROVAL",
      submittedAt: new Date(),
      rowVersion: { increment: 1 },
    },
  });
  await auditCapabilityPolicyChange({
    orgId: input.orgId,
    actorId: input.actorId,
    entityId: updated.id,
    action: "ACCOUNTING_CAPABILITY_POLICY_SUBMITTED",
    beforeValues: { status: existing.status, rowVersion: existing.rowVersion },
    afterValues: { status: updated.status, rowVersion: updated.rowVersion },
  });
  return updated;
}

export async function approveAccountingCapabilityPolicy(input: {
  orgId: string;
  actorId: string;
  policyId: string;
  expectedVersion: number;
}) {
  const existing = await getCapabilityPolicyForMutation(input.orgId, input.policyId);
  requireCapabilityPolicyRowVersion(existing.rowVersion, input.expectedVersion);
  if (existing.status !== "PENDING_APPROVAL") {
    throw new Error("CAPABILITY_POLICY_APPROVAL_STATE_INVALID");
  }
  if (existing.createdById === input.actorId) {
    throw new Error("CAPABILITY_POLICY_SELF_APPROVAL_FORBIDDEN");
  }
  return db.$transaction(async (tx) => {
    if (existing.supersedesId) {
      await tx.accountingCapabilityPolicy.updateMany({
        where: {
          id: existing.supersedesId,
          orgId: input.orgId,
          status: "APPROVED",
        },
        data: {
          status: "SUPERSEDED",
          rowVersion: { increment: 1 },
        },
      });
    }
    const approved = await tx.accountingCapabilityPolicy.update({
      where: { id: existing.id },
      data: {
        status: "APPROVED",
        approvedById: input.actorId,
        approvedAt: new Date(),
        rejectedById: null,
        rejectedAt: null,
        rejectionReason: null,
        rowVersion: { increment: 1 },
      },
    });
    await auditCapabilityPolicyChange({
      orgId: input.orgId,
      actorId: input.actorId,
      entityId: approved.id,
      action: "ACCOUNTING_CAPABILITY_POLICY_APPROVED",
      beforeValues: { status: existing.status, rowVersion: existing.rowVersion },
      afterValues: { status: approved.status, rowVersion: approved.rowVersion },
    });
    return approved;
  });
}

export async function rejectAccountingCapabilityPolicy(input: {
  orgId: string;
  actorId: string;
  policyId: string;
  expectedVersion: number;
  reason: string;
}) {
  const existing = await getCapabilityPolicyForMutation(input.orgId, input.policyId);
  requireCapabilityPolicyRowVersion(existing.rowVersion, input.expectedVersion);
  if (existing.status !== "PENDING_APPROVAL") {
    throw new Error("CAPABILITY_POLICY_REJECTION_STATE_INVALID");
  }
  if (existing.createdById === input.actorId) {
    throw new Error("CAPABILITY_POLICY_SELF_APPROVAL_FORBIDDEN");
  }
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("CAPABILITY_POLICY_REJECTION_REASON_REQUIRED");
  }
  const rejected = await db.accountingCapabilityPolicy.update({
    where: { id: existing.id },
    data: {
      status: "REJECTED",
      rejectedById: input.actorId,
      rejectedAt: new Date(),
      rejectionReason: reason,
      rowVersion: { increment: 1 },
    },
  });
  await auditCapabilityPolicyChange({
    orgId: input.orgId,
    actorId: input.actorId,
    entityId: rejected.id,
    action: "ACCOUNTING_CAPABILITY_POLICY_REJECTED",
    beforeValues: { status: existing.status, rowVersion: existing.rowVersion },
    afterValues: { status: rejected.status, rowVersion: rejected.rowVersion, reason },
  });
  return rejected;
}

export async function revokeAccountingCapabilityPolicy(input: {
  orgId: string;
  actorId: string;
  policyId: string;
  expectedVersion: number;
  reason: string;
}) {
  const existing = await getCapabilityPolicyForMutation(input.orgId, input.policyId);
  requireCapabilityPolicyRowVersion(existing.rowVersion, input.expectedVersion);
  if (existing.status !== "APPROVED") {
    throw new Error("CAPABILITY_POLICY_REVOCATION_STATE_INVALID");
  }
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("CAPABILITY_POLICY_REVOCATION_REASON_REQUIRED");
  }
  const revoked = await db.accountingCapabilityPolicy.update({
    where: { id: existing.id },
    data: {
      status: "REVOKED",
      revokedById: input.actorId,
      revokedAt: new Date(),
      revocationReason: reason,
      rowVersion: { increment: 1 },
    },
  });
  await auditCapabilityPolicyChange({
    orgId: input.orgId,
    actorId: input.actorId,
    entityId: revoked.id,
    action: "ACCOUNTING_CAPABILITY_POLICY_REVOKED",
    beforeValues: { status: existing.status, rowVersion: existing.rowVersion },
    afterValues: { status: revoked.status, rowVersion: revoked.rowVersion, reason },
  });
  return revoked;
}

export async function supersedeAccountingCapabilityPolicy(input: {
  orgId: string;
  actorId: string;
  policyId: string;
}) {
  const existing = await getCapabilityPolicyForMutation(input.orgId, input.policyId);
  if (!["APPROVED", "REVOKED", "REJECTED", "SUPERSEDED"].includes(existing.status)) {
    throw new Error("CAPABILITY_POLICY_SUPERSEDE_STATE_INVALID");
  }
  return saveAccountingCapabilityPolicyDraft({
    orgId: input.orgId,
    actorId: input.actorId,
    capabilityCode: assertAccountingCapabilityCode(existing.capabilityCode),
    legalEntityId: existing.legalEntityId,
    effectiveFrom: toIsoDate(existing.effectiveFrom)!,
    effectiveTo: toIsoDate(existing.effectiveTo),
    configuration: existing.configuration,
    supersedesId: existing.id,
  });
}

export async function listAccountingCapabilityPolicies(
  orgId: string,
  filters: AccountingCapabilityPolicyFilters = {},
) {
  const rows = await db.accountingCapabilityPolicy.findMany({
    where: {
      orgId,
      ...(filters.capabilityCode
        ? { capabilityCode: filters.capabilityCode }
        : {}),
      ...(filters.legalEntityId === ""
        ? {}
        : filters.legalEntityId === "__ORG_WIDE__"
          ? { legalEntityId: null }
        : filters.legalEntityId
          ? { legalEntityId: filters.legalEntityId }
          : {}),
      ...(filters.status && filters.status !== "EXPIRED"
        ? { status: filters.status }
        : {}),
    },
    orderBy: [
      { capabilityCode: "asc" },
      { legalEntityId: "asc" },
      { version: "desc" },
    ],
    include: {
      legalEntity: { select: { code: true, legalName: true } },
      createdBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
    },
  });
  const now = new Date();
  const items = rows.map((row) => {
    const capabilityCode = assertAccountingCapabilityCode(row.capabilityCode);
    const readiness = resolveAccountingCapabilityReadinessFromPolicies({
      capability: capabilityCode,
      policies: [row],
      legalEntityId: row.legalEntityId,
      now,
    });
    return {
      id: row.id,
      capabilityCode,
      version: row.version,
      status: normalizePolicyStatus(row, now),
      legalEntityId: row.legalEntityId,
      legalEntityLabel: row.legalEntity
        ? `${row.legalEntity.code} — ${row.legalEntity.legalName}`
        : "Organisation wide",
      createdById: row.createdById,
      createdByName: row.createdBy.name || row.createdBy.email,
      approvedByName: row.approvedBy
        ? row.approvedBy.name || row.approvedBy.email
        : null,
      effectiveFrom: toIsoDate(row.effectiveFrom)!,
      effectiveTo: toIsoDate(row.effectiveTo),
      configurationHash: row.configurationHash,
      rowVersion: row.rowVersion,
      readiness,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    } satisfies AccountingCapabilityPolicyListItem;
  });
  return filters.status === "EXPIRED"
    ? items.filter((item) => item.status === "EXPIRED")
    : items;
}

export async function getAccountingCapabilityPolicyEditor(
  orgId: string,
  policyId: string,
) {
  const row = await db.accountingCapabilityPolicy.findFirst({
    where: { id: policyId, orgId },
  });
  if (!row) return null;
  const capabilityCode = assertAccountingCapabilityCode(row.capabilityCode);
  const readiness = resolveAccountingCapabilityReadinessFromPolicies({
    capability: capabilityCode,
    policies: [row],
    legalEntityId: row.legalEntityId,
  });
  return {
    id: row.id,
    capabilityCode,
    version: row.version,
    legalEntityId: row.legalEntityId,
    status: normalizePolicyStatus(row, new Date()),
    effectiveFrom: toIsoDate(row.effectiveFrom)!,
    effectiveTo: toIsoDate(row.effectiveTo),
    configurationHash: row.configurationHash,
    configurationJson: JSON.stringify(row.configuration, null, 2),
    rowVersion: row.rowVersion,
    rejectionReason: row.rejectionReason,
    revocationReason: row.revocationReason,
    readiness,
  } satisfies AccountingCapabilityPolicyEditor;
}

export async function listAccountingCapabilityPolicyAudit(
  orgId: string,
  policyId: string,
) {
  const rows = await db.accountingAuditLog.findMany({
    where: {
      orgId,
      entityType: "AccountingCapabilityPolicy",
      entityId: policyId,
    },
    orderBy: [{ timestamp: "desc" }, { id: "desc" }],
    include: { user: { select: { name: true, email: true } } },
    take: 50,
  });
  return rows.map(
    (row) =>
      ({
        id: row.id,
        action: row.action,
        actor: row.user.name || row.user.email,
        occurredAt: row.timestamp.toISOString(),
      }) satisfies AccountingCapabilityPolicyAuditEntry,
  );
}

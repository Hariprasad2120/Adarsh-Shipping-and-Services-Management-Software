import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  LeavePolicyConfigSchema,
  type LeavePolicyConfig,
} from "@/modules/leave/policy-config.schema";
import { writeLeaveAudit } from "@/modules/leave/audit";
import type { ApplicabilityRuleInput } from "@/modules/leave/eligibility";

export interface CreateLeaveTypeInput {
  orgId: string;
  name: string;
  code: string;
  isCompOffType?: boolean;
}

export async function createLeaveType(input: CreateLeaveTypeInput, actorId: string) {
  const leaveType = await db.leaveType.create({
    data: {
      orgId: input.orgId,
      name: input.name,
      code: input.code,
      isCompOffType: input.isCompOffType ?? false,
      paid: true,
      defaultBalance: 0,
    },
  });
  await writeLeaveAudit({
    orgId: input.orgId,
    userId: actorId,
    action: "LEAVE_TYPE_CREATED",
    details: { leaveTypeId: leaveType.id, name: input.name, code: input.code },
  });
  return leaveType;
}

export interface CreatePolicyVersionInput {
  leaveTypeId: string;
  classification: "PAID" | "UNPAID" | "ON_DUTY" | "RESTRICTED_HOLIDAY" | "PARTIALLY_PAID";
  unit: "DAY" | "HOUR";
  roundingMode?: "NONE" | "NEAREST" | "UP" | "DOWN";
  roundingIncrement?: number;
  effectiveFrom: Date;
  effectiveUntil?: Date | null;
  configuration: LeavePolicyConfig;
  applicabilityRules: ApplicabilityRuleInput[];
}

/**
 * Creates a new DRAFT policy version. Draft versions are freely editable
 * (delete + recreate) until published; once published, a version's
 * configuration is immutable (spec §8) — editing a published policy always
 * creates a new draft version instead of mutating in place.
 */
export async function createPolicyVersion(input: CreatePolicyVersionInput, actorId: string) {
  const parsedConfig = LeavePolicyConfigSchema.parse(input.configuration);

  const latest = await db.leavePolicyVersion.findFirst({
    where: { leaveTypeId: input.leaveTypeId },
    orderBy: { version: "desc" },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  const created = await db.leavePolicyVersion.create({
    data: {
      leaveTypeId: input.leaveTypeId,
      version: nextVersion,
      status: "DRAFT",
      classification: input.classification,
      entitlementModel: parsedConfig.entitlement.model,
      unit: input.unit,
      roundingMode: input.roundingMode ?? "NONE",
      roundingIncrement: input.roundingIncrement,
      effectiveFrom: input.effectiveFrom,
      effectiveUntil: input.effectiveUntil,
      configuration: parsedConfig as unknown as Prisma.InputJsonValue,
      applicabilityRules: {
        create: input.applicabilityRules.map((rule) => ({
          mode: rule.mode,
          dimension: rule.dimension,
          value: rule.value,
        })),
      },
    },
    include: { applicabilityRules: true, leaveType: true },
  });

  await writeLeaveAudit({
    orgId: created.leaveType.orgId,
    userId: actorId,
    action: "LEAVE_POLICY_VERSION_CREATED",
    details: { leaveTypeId: input.leaveTypeId, version: nextVersion, status: "DRAFT" },
  });

  return created;
}

export async function publishPolicyVersion(policyVersionId: string, actorId: string) {
  const version = await db.leavePolicyVersion.findUniqueOrThrow({
    where: { id: policyVersionId },
    include: { leaveType: true },
  });
  if (version.status !== "DRAFT") {
    throw new Error(`Cannot publish version in status ${version.status}`);
  }

  const [updated] = await db.$transaction([
    db.leavePolicyVersion.update({
      where: { id: policyVersionId },
      data: { status: "PUBLISHED", publishedAt: new Date(), publishedById: actorId },
    }),
    db.leaveType.update({
      where: { id: version.leaveTypeId },
      data: { activeVersionId: policyVersionId },
    }),
  ]);

  await writeLeaveAudit({
    orgId: version.leaveType.orgId,
    userId: actorId,
    action: "LEAVE_POLICY_VERSION_PUBLISHED",
    details: { leaveTypeId: version.leaveTypeId, version: version.version },
  });

  // ATTENDANCE_BASED is a fully-defined config schema variant (metric +
  // creditFrequency) that implies automatic accrual, but runMonthlyAccrual
  // deliberately skips it (see its docstring) — a general attendance-linked
  // accrual engine reading WorkedDays/OtRecord per metric doesn't exist yet.
  // Publishing such a policy silently would mean it never credits anyone
  // with no error anywhere; surface it instead of letting it be a silent
  // trap for whoever configured it (closure-pass entitlement-model audit).
  const config = parsePolicyConfig(version.configuration);
  const warnings: string[] =
    config.entitlement.model === "ATTENDANCE_BASED"
      ? [
          "This policy's entitlement model is ATTENDANCE_BASED. No automatic accrual is implemented for this model yet — runMonthlyAccrual only processes FIXED and EXPERIENCE_BASED policies. Balances under this policy will not increase unless credited manually via a leave grant or ledger adjustment.",
        ]
      : [];

  return { ...updated, warnings };
}

export async function archivePolicyVersion(policyVersionId: string, actorId: string) {
  const version = await db.leavePolicyVersion.findUniqueOrThrow({
    where: { id: policyVersionId },
    include: { leaveType: true },
  });

  const updated = await db.leavePolicyVersion.update({
    where: { id: policyVersionId },
    data: { status: "ARCHIVED" },
  });

  if (version.leaveType.activeVersionId === policyVersionId) {
    await db.leaveType.update({
      where: { id: version.leaveTypeId },
      data: { activeVersionId: null },
    });
  }

  await writeLeaveAudit({
    orgId: version.leaveType.orgId,
    userId: actorId,
    action: "LEAVE_POLICY_VERSION_ARCHIVED",
    details: { leaveTypeId: version.leaveTypeId, version: version.version },
  });

  return updated;
}

export async function getActivePolicyVersion(leaveTypeId: string, asOf: Date = new Date()) {
  const leaveType = await db.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!leaveType?.activeVersionId) return null;

  const version = await db.leavePolicyVersion.findUnique({
    where: { id: leaveType.activeVersionId },
    include: { applicabilityRules: true },
  });
  if (!version) return null;
  if (version.effectiveFrom > asOf) return null;
  if (version.effectiveUntil && version.effectiveUntil < asOf) return null;
  return version;
}

export function parsePolicyConfig(configuration: unknown): LeavePolicyConfig {
  return LeavePolicyConfigSchema.parse(configuration);
}

export async function listPolicyVersions(leaveTypeId: string) {
  return db.leavePolicyVersion.findMany({
    where: { leaveTypeId },
    orderBy: { version: "desc" },
    include: { applicabilityRules: true },
  });
}

/**
 * Clone lifecycle (spec §6): creates a new DRAFT version pre-filled from
 * an existing version's configuration — the admin edits the clone rather
 * than the published original (which is immutable, see createPolicyVersion's
 * doc comment). Applicability rules are copied too, since "start from what
 * already works" is the whole point of cloning.
 */
export async function clonePolicyVersion(sourceVersionId: string, actorId: string) {
  const source = await db.leavePolicyVersion.findUniqueOrThrow({
    where: { id: sourceVersionId },
    include: { applicabilityRules: true, leaveType: true },
  });

  return createPolicyVersion(
    {
      leaveTypeId: source.leaveTypeId,
      classification: source.classification as CreatePolicyVersionInput["classification"],
      unit: source.unit as "DAY" | "HOUR",
      roundingMode: source.roundingMode as CreatePolicyVersionInput["roundingMode"],
      roundingIncrement: source.roundingIncrement ? Number(source.roundingIncrement) : undefined,
      effectiveFrom: new Date(), // clone starts fresh — admin adjusts before publishing
      effectiveUntil: null,
      configuration: parsePolicyConfig(source.configuration),
      applicabilityRules: source.applicabilityRules.map((r) => ({
        mode: r.mode as ApplicabilityRuleInput["mode"],
        dimension: r.dimension as ApplicabilityRuleInput["dimension"],
        value: r.value,
      })),
    },
    actorId,
  );
}

export interface PolicyVersionDiffEntry {
  path: string;
  before: unknown;
  after: unknown;
}

/**
 * Version comparison (spec §6) — a flat field-by-field diff of two
 * versions' top-level metadata and configuration JSON, so HR/admin can see
 * exactly what changed between e.g. v2 and v3 of a policy before deciding
 * which is "correct" for a historical dispute.
 */
export async function comparePolicyVersions(versionIdA: string, versionIdB: string): Promise<PolicyVersionDiffEntry[]> {
  const [a, b] = await Promise.all([
    db.leavePolicyVersion.findUniqueOrThrow({ where: { id: versionIdA } }),
    db.leavePolicyVersion.findUniqueOrThrow({ where: { id: versionIdB } }),
  ]);

  const diffs: PolicyVersionDiffEntry[] = [];
  const topLevelFields: Array<keyof typeof a> = [
    "classification",
    "entitlementModel",
    "unit",
    "roundingMode",
    "roundingIncrement",
    "effectiveFrom",
    "effectiveUntil",
  ];
  for (const field of topLevelFields) {
    const beforeVal = a[field];
    const afterVal = b[field];
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      diffs.push({ path: field, before: beforeVal, after: afterVal });
    }
  }

  // Shallow diff of the configuration JSON's top-level keys — a full deep
  // diff isn't worth the complexity here; each key (entitlement, reset,
  // carryForward, etc.) is itself a small structured object, and admins
  // reviewing this care about which SECTION changed, then can inspect the
  // two full configs side by side for the details.
  const configA = a.configuration as Record<string, unknown>;
  const configB = b.configuration as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(configA ?? {}), ...Object.keys(configB ?? {})]);
  for (const key of allKeys) {
    if (JSON.stringify(configA?.[key]) !== JSON.stringify(configB?.[key])) {
      diffs.push({ path: `configuration.${key}`, before: configA?.[key], after: configB?.[key] });
    }
  }

  return diffs;
}

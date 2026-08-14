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

  return updated;
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

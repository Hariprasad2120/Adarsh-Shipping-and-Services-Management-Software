import { db } from "@/lib/db";

export interface ApplicabilityRuleInput {
  mode: "INCLUDE" | "EXCLUDE";
  dimension: "BRANCH" | "DEPARTMENT" | "DIVISION" | "DESIGNATION" | "EMPLOYMENT_TYPE" | "EMPLOYEE";
  value: string;
}

/**
 * Determines whether a single user matches a policy version's applicability
 * rule set. Semantics: OR within a dimension's INCLUDE rows (matching any one
 * is enough), AND across dimensions that have at least one INCLUDE rule
 * (every such dimension must have a match), then EXCLUDE rules override
 * everything (any EXCLUDE match disqualifies regardless of INCLUDE matches).
 * No rules at all = applies to everyone in the org (matches spec's default).
 */
export function evaluateApplicability(
  user: {
    id: string;
    branchId: string | null;
    departmentId: string | null;
    divisionId: string | null;
    designation: string | null;
    employmentType: string | null;
  },
  rules: ApplicabilityRuleInput[],
): boolean {
  const excludeRules = rules.filter((r) => r.mode === "EXCLUDE");
  const includeRules = rules.filter((r) => r.mode === "INCLUDE");

  const matchesRule = (rule: ApplicabilityRuleInput): boolean => {
    switch (rule.dimension) {
      case "BRANCH":
        return user.branchId === rule.value;
      case "DEPARTMENT":
        return user.departmentId === rule.value;
      case "DIVISION":
        return user.divisionId === rule.value;
      case "DESIGNATION":
        return user.designation === rule.value;
      case "EMPLOYMENT_TYPE":
        return user.employmentType === rule.value;
      case "EMPLOYEE":
        return user.id === rule.value;
      default:
        return false;
    }
  };

  if (excludeRules.some(matchesRule)) return false;
  if (includeRules.length === 0) return true;

  const includeByDimension = new Map<string, ApplicabilityRuleInput[]>();
  for (const rule of includeRules) {
    const list = includeByDimension.get(rule.dimension) ?? [];
    list.push(rule);
    includeByDimension.set(rule.dimension, list);
  }

  for (const dimensionRules of includeByDimension.values()) {
    if (!dimensionRules.some(matchesRule)) return false;
  }

  return true;
}

export async function previewApplicability(policyVersionId: string) {
  const version = await db.leavePolicyVersion.findUniqueOrThrow({
    where: { id: policyVersionId },
    include: { applicabilityRules: true, leaveType: { select: { orgId: true } } },
  });

  const candidates = await db.user.findMany({
    where: { orgId: version.leaveType.orgId, active: true },
    select: {
      id: true,
      name: true,
      branchId: true,
      departmentId: true,
      divisionId: true,
      designation: true,
      employmentType: true,
    },
  });

  const rules: ApplicabilityRuleInput[] = version.applicabilityRules.map((r) => ({
    mode: r.mode as "INCLUDE" | "EXCLUDE",
    dimension: r.dimension as ApplicabilityRuleInput["dimension"],
    value: r.value,
  }));

  return candidates.filter((user) => evaluateApplicability(user, rules));
}

export async function isPolicyApplicableToUser(policyVersionId: string, userId: string) {
  const [version, user] = await Promise.all([
    db.leavePolicyVersion.findUniqueOrThrow({
      where: { id: policyVersionId },
      include: { applicabilityRules: true },
    }),
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        branchId: true,
        departmentId: true,
        divisionId: true,
        designation: true,
        employmentType: true,
      },
    }),
  ]);

  const rules: ApplicabilityRuleInput[] = version.applicabilityRules.map((r) => ({
    mode: r.mode as "INCLUDE" | "EXCLUDE",
    dimension: r.dimension as ApplicabilityRuleInput["dimension"],
    value: r.value,
  }));

  return evaluateApplicability(user, rules);
}

/**
 * Returns true if the user has completed the policy's effective-after
 * waiting period, based on EmploymentRecord.joinDate.
 */
export async function isServiceEligible(userId: string, effectiveAfterServiceMonths: number, asOf: Date) {
  if (effectiveAfterServiceMonths <= 0) return true;
  const record = await db.employmentRecord.findUnique({
    where: { userId },
    select: { joinDate: true },
  });
  if (!record) return false;
  const eligibleFrom = new Date(record.joinDate);
  eligibleFrom.setMonth(eligibleFrom.getMonth() + effectiveAfterServiceMonths);
  return asOf >= eligibleFrom;
}

import { db } from "@/lib/db";
import { parsePolicyConfig } from "@/modules/leave/policy";

/**
 * Deterministic jurisdiction assignment for an employee (spec §35): the
 * employee's branch, if it has a jurisdiction set, else the org's default
 * jurisdiction, else null (meaning: no jurisdiction is configured for this
 * employee, compliance checking should be skipped rather than guessed).
 * Deliberately NOT auto-detected from IP/geolocation — jurisdiction for
 * statutory leave compliance is a legal/HR configuration decision, not
 * something inferred from where a request happens to originate.
 */
export async function resolveEmployeeJurisdiction(
  userId: string,
): Promise<{ country: string; state: string | null } | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      orgId: true,
      branch: { select: { jurisdictionCountry: true, jurisdictionState: true } },
    },
  });
  if (!user) return null;

  if (user.branch?.jurisdictionCountry) {
    return { country: user.branch.jurisdictionCountry, state: user.branch.jurisdictionState };
  }

  if (!user.orgId) return null;
  const org = await db.organisation.findUnique({
    where: { id: user.orgId },
    select: { defaultJurisdictionCountry: true, defaultJurisdictionState: true },
  });
  if (org?.defaultJurisdictionCountry) {
    return { country: org.defaultJurisdictionCountry, state: org.defaultJurisdictionState };
  }

  return null;
}

export interface ComplianceCheckResult {
  templateId: string;
  statutoryName: string;
  jurisdiction: string;
  statutoryMinimumAmount: number;
  statutoryMinimumUnit: string;
  policyAmount: number | null;
  belowMinimum: boolean;
  message: string;
}

/**
 * Compares a published policy version's entitlement against any applicable
 * compliance templates for a given jurisdiction, flagging configurations
 * that appear below the statutory minimum (spec §27 — "flag configurations
 * that appear below a statutory minimum"). This never blocks publishing —
 * it surfaces a warning for HR/legal review, consistent with the spec's
 * instruction not to silently claim legal compliance either way.
 */
export async function checkPolicyCompliance(
  policyVersionId: string,
  jurisdictionCountry: string,
  jurisdictionState: string | null,
  leaveCategory: string,
): Promise<ComplianceCheckResult[]> {
  const version = await db.leavePolicyVersion.findUniqueOrThrow({
    where: { id: policyVersionId },
  });
  const config = parsePolicyConfig(version.configuration);

  const templates = await db.leaveComplianceTemplate.findMany({
    where: {
      jurisdictionCountry,
      leaveCategory,
      status: { in: ["VERIFIED", "PUBLISHED"] },
      OR: [{ jurisdictionState: null }, { jurisdictionState }],
      effectiveFrom: { lte: version.effectiveFrom },
    },
  });

  const results: ComplianceCheckResult[] = [];

  const policyAmount = config.entitlement.model === "FIXED" ? config.entitlement.amount : null;

  for (const template of templates) {
    if (template.effectiveUntil && template.effectiveUntil < version.effectiveFrom) continue;

    const minimum = template.statutoryMinimum as { amount?: number; unit?: string } | null;
    const minAmount = minimum?.amount ?? 0;
    const minUnit = minimum?.unit ?? "DAY";

    const belowMinimum = policyAmount != null && policyAmount < minAmount;

    results.push({
      templateId: template.id,
      statutoryName: template.statutoryName,
      jurisdiction: [jurisdictionCountry, jurisdictionState].filter(Boolean).join(" / "),
      statutoryMinimumAmount: minAmount,
      statutoryMinimumUnit: minUnit,
      policyAmount,
      belowMinimum,
      message: belowMinimum
        ? `Policy entitlement (${policyAmount} ${version.unit}) is below the statutory minimum of ${minAmount} ${minUnit} under ${template.statutoryName}. Regulatory template based on the referenced rule set (${template.legalSource}). HR/legal review is recommended before publication.`
        : policyAmount == null
          ? `Entitlement model is ${config.entitlement.model}, not a flat amount — automatic comparison against ${template.statutoryName}'s statutory minimum is not applicable; manual review recommended.`
          : `Policy entitlement meets or exceeds the statutory minimum under ${template.statutoryName}. Regulatory template based on the referenced rule set — HR/legal review is still recommended before publication.`,
    });
  }

  return results;
}

import { db } from "@/lib/db";
import { parsePolicyConfig } from "@/modules/leave/policy";

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

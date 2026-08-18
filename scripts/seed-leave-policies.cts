// One-time seed: publishes a real policy for each of the 6 existing leave
// types, matching docs/leave-management (published artifact) — the
// "Statutory Leave Policy Reference for Freight Forwarding & CHA
// Operations". Every number here is a STARTING configuration created
// through the real createLeaveType/createPolicyVersion/publishPolicyVersion
// functions — nothing is hardcoded into the application; every value stays
// editable via the policy wizard afterward (spec §5) or a new draft
// version (spec §8, published versions are immutable, edits create a new
// version). Idempotent: skips any leave type that already has an active
// published version.
import "dotenv/config";
import { db } from "../src/lib/db";
import { createLeaveType, createPolicyVersion, publishPolicyVersion } from "../src/modules/leave/policy";
import type { LeavePolicyConfig } from "../src/modules/leave/policy-config.schema";

const results: Record<string, unknown> = {};

function baseRestrictions(overrides: Partial<LeavePolicyConfig["restrictions"]> = {}): LeavePolicyConfig["restrictions"] {
  return {
    allowPastDated: false,
    allowSameDay: true,
    allowDuringProbation: true,
    waitingPeriodAfterJoiningDays: 0,
    minBalanceRequired: 0,
    requireAttachment: "NEVER",
    requireReason: true,
    ...overrides,
  };
}

function baseApprovalRouting(): LeavePolicyConfig["approvalRouting"] {
  return {
    autoApprove: false,
    routes: [{ criteria: {}, steps: [{ sequence: 1, approverType: "MANAGER" }] }],
    mandatoryApprovalComment: false,
    mandatoryRejectionComment: true,
  };
}

// ── Casual Leave: 12 days/yr, monthly credit, no carry-forward, max 3 consecutive ──
const casualLeaveConfig: LeavePolicyConfig = {
  entitlement: { model: "FIXED", amount: 12, creditFrequency: "MONTHLY" },
  proration: { strategy: "START_OF_POLICY", rounding: "NEAREST" },
  reset: { cadence: "CALENDAR_YEAR" },
  carryForward: { mode: "NONE", expiryAfterDays: null },
  encashment: { mode: "DISABLED", minBalanceRetained: 0 },
  negativeLeave: { mode: "REJECT" },
  maxBalance: null,
  effectiveAfterServiceMonths: 0,
  partialPaySlabs: [],
  restrictions: baseRestrictions({ maxConsecutiveUnits: 3 }),
  sandwich: { enabled: true, includeWeekends: true, includeHolidays: true, activationThresholdUnits: 2 },
  clubbingRules: [],
  approvalRouting: baseApprovalRouting(),
  availabilityStatus: "OUT_OF_OFFICE",
};

// ── Sick Leave: 12 days/yr, monthly credit, medical cert above 2 days ──
const sickLeaveConfig: LeavePolicyConfig = {
  entitlement: { model: "FIXED", amount: 12, creditFrequency: "MONTHLY" },
  proration: { strategy: "START_OF_POLICY", rounding: "NEAREST" },
  reset: { cadence: "CALENDAR_YEAR" },
  carryForward: { mode: "NONE", expiryAfterDays: null },
  encashment: { mode: "DISABLED", minBalanceRetained: 0 },
  negativeLeave: { mode: "CONVERT_EXCESS_TO_LOP" },
  maxBalance: null,
  effectiveAfterServiceMonths: 0,
  partialPaySlabs: [],
  restrictions: baseRestrictions({ requireAttachment: "ABOVE_THRESHOLD", attachmentThresholdUnits: 2 }),
  sandwich: { enabled: false, includeWeekends: true, includeHolidays: true, activationThresholdUnits: 0 },
  clubbingRules: [],
  approvalRouting: baseApprovalRouting(),
  availabilityStatus: "OUT_OF_OFFICE",
};

// ── Earned Leave: OSH Code accrual (1/20 days worked), 180-day eligibility, 30-day carry-forward cap + mandatory encashment above cap ──
const earnedLeaveConfig: LeavePolicyConfig = {
  entitlement: {
    model: "EXPERIENCE_BASED",
    creditFrequency: "MONTHLY",
    tiers: [{ minServiceMonths: 0, maxServiceMonths: null, amount: 18 }], // ~1/20 worked days annualized
  },
  proration: { strategy: "START_AND_END", rounding: "NEAREST" },
  reset: { cadence: "CALENDAR_YEAR" },
  carryForward: { mode: "FIXED_MAX", fixedMax: 30, expiryAfterDays: null },
  encashment: { mode: "AUTO_AT_RESET", maxEncashableUnits: undefined, minBalanceRetained: 0 },
  negativeLeave: { mode: "REJECT" },
  maxBalance: null,
  effectiveAfterServiceMonths: 6, // 180 days ≈ 6 months, OSH Code eligibility threshold
  partialPaySlabs: [],
  restrictions: baseRestrictions({ minNoticeDays: 3 }),
  sandwich: { enabled: true, includeWeekends: true, includeHolidays: true, activationThresholdUnits: 2 },
  clubbingRules: [],
  approvalRouting: baseApprovalRouting(),
  availabilityStatus: "OUT_OF_OFFICE",
};

// ── Loss of Pay: not accrued, used as overflow/direct-request; unpaid ──
const lopConfig: LeavePolicyConfig = {
  entitlement: { model: "GRANT_BASED", maxGrantsPerYear: null, requiresApproval: true },
  proration: { strategy: "NONE", rounding: "NEAREST" },
  reset: { cadence: "NONE" },
  carryForward: { mode: "NONE", expiryAfterDays: null },
  encashment: { mode: "DISABLED", minBalanceRetained: 0 },
  negativeLeave: { mode: "ALLOW_UNLIMITED" },
  maxBalance: null,
  effectiveAfterServiceMonths: 0,
  partialPaySlabs: [],
  restrictions: baseRestrictions({ allowPastDated: true, minNoticeDays: undefined }),
  sandwich: { enabled: false, includeWeekends: true, includeHolidays: true, activationThresholdUnits: 0 },
  clubbingRules: [],
  approvalRouting: baseApprovalRouting(),
  availabilityStatus: "OUT_OF_OFFICE",
};

// ── Maternity Leave: 182 days (26wk) tier 1-2, 84 days (12wk) tier 3+ ──
const maternityLeaveConfig: LeavePolicyConfig = {
  entitlement: {
    model: "EXPERIENCE_BASED", // tiers used here to express "child 1-2" vs "child 3+" via HR-managed grants; amount = full grant, not accrual
    creditFrequency: "YEARLY",
    tiers: [{ minServiceMonths: 0, maxServiceMonths: null, amount: 182 }],
  },
  proration: { strategy: "NONE", rounding: "NEAREST" },
  reset: { cadence: "NONE" },
  carryForward: { mode: "NONE", expiryAfterDays: null },
  encashment: { mode: "DISABLED", minBalanceRetained: 0 },
  negativeLeave: { mode: "REJECT" },
  maxBalance: null,
  effectiveAfterServiceMonths: 0,
  partialPaySlabs: [],
  restrictions: baseRestrictions({ allowPastDated: true, requireAttachment: "ALWAYS" }),
  sandwich: { enabled: false, includeWeekends: true, includeHolidays: true, activationThresholdUnits: 0 },
  clubbingRules: [],
  approvalRouting: { ...baseApprovalRouting(), routes: [{ criteria: {}, steps: [{ sequence: 1, approverType: "HR" }] }] },
  availabilityStatus: "OUT_OF_OFFICE",
};

// ── Paternity Leave: 15 days, voluntary company grant, no statutory floor ──
const paternityLeaveConfig: LeavePolicyConfig = {
  entitlement: { model: "FIXED", amount: 15, creditFrequency: "INSTANT" },
  proration: { strategy: "NONE", rounding: "NEAREST" },
  reset: { cadence: "NONE" },
  carryForward: { mode: "NONE", expiryAfterDays: null },
  encashment: { mode: "DISABLED", minBalanceRetained: 0 },
  negativeLeave: { mode: "REJECT" },
  maxBalance: null,
  effectiveAfterServiceMonths: 0,
  partialPaySlabs: [],
  restrictions: baseRestrictions({ allowPastDated: true, requireAttachment: "ALWAYS" }),
  sandwich: { enabled: false, includeWeekends: true, includeHolidays: true, activationThresholdUnits: 0 },
  clubbingRules: [],
  approvalRouting: baseApprovalRouting(),
  availabilityStatus: "OUT_OF_OFFICE",
};

const PLAN: { typeName: string; code: string; classification: "PAID" | "UNPAID" | "ON_DUTY" | "RESTRICTED_HOLIDAY" | "PARTIALLY_PAID"; config: LeavePolicyConfig }[] = [
  { typeName: "Casual Leave", code: "CL", classification: "PAID", config: casualLeaveConfig },
  { typeName: "Sick Leave", code: "SL", classification: "PAID", config: sickLeaveConfig },
  { typeName: "Earned Leave", code: "EL", classification: "PAID", config: earnedLeaveConfig },
  { typeName: "Loss of Pay", code: "LOP", classification: "UNPAID", config: lopConfig },
  { typeName: "Maternity Leave", code: "ML", classification: "PAID", config: maternityLeaveConfig },
  { typeName: "Paternity Leave", code: "PL", classification: "PAID", config: paternityLeaveConfig },
];

async function main() {
  try {
    const org = await db.organisation.findFirstOrThrow({ select: { id: true } });
    const actor = await db.user.findFirstOrThrow({
      where: { orgId: org.id, active: true },
      select: { id: true, name: true },
    });

    for (const plan of PLAN) {
      let leaveType = await db.leaveType.findFirst({ where: { orgId: org.id, name: plan.typeName } });

      if (!leaveType) {
        leaveType = await createLeaveType({ orgId: org.id, name: plan.typeName, code: plan.code }, actor.id);
        results[plan.typeName] = { created: true };
      } else if (leaveType.activeVersionId) {
        results[plan.typeName] = { skipped: true, reason: "already has an active published version", activeVersionId: leaveType.activeVersionId };
        continue;
      } else if (!leaveType.code) {
        // Existing legacy row with no code — set one so createPolicyVersion's
        // org+code uniqueness constraint elsewhere in the app stays satisfiable.
        leaveType = await db.leaveType.update({ where: { id: leaveType.id }, data: { code: plan.code } });
      }

      const version = await createPolicyVersion(
        {
          leaveTypeId: leaveType.id,
          classification: plan.classification,
          unit: "DAY",
          effectiveFrom: new Date("2026-01-01"),
          configuration: plan.config,
          applicabilityRules: [], // company-wide default — state variants are a separate, later step via the wizard's applicability builder
        },
        actor.id,
      );
      const published = await publishPolicyVersion(version.id, actor.id);

      results[plan.typeName] = {
        leaveTypeId: leaveType.id,
        versionId: version.id,
        status: (published as { status: string }).status,
      };
    }

    // ── Compliance templates matching the published reference doc's citations ──
    const templates: {
      country: string;
      state: string | null;
      category: string;
      statutoryName: string;
      source: string;
      minAmount: number;
      minUnit: string;
    }[] = [
      { country: "IN", state: "TN", category: "PAID", statutoryName: "Casual Leave", source: "Tamil Nadu S&E Act 1947 s.25(1)", minAmount: 12, minUnit: "DAY" },
      { country: "IN", state: "DL", category: "PAID", statutoryName: "Casual Leave", source: "Delhi S&E Act 1954 s.22", minAmount: 12, minUnit: "DAY" },
      { country: "IN", state: "MH", category: "PAID", statutoryName: "Casual Leave", source: "Maharashtra S&E Act 2017 s.18", minAmount: 8, minUnit: "DAY" },
      { country: "IN", state: "GJ", category: "PAID", statutoryName: "Casual Leave", source: "Gujarat S&E Act 2019 s.18", minAmount: 7, minUnit: "DAY" },
      { country: "IN", state: "WB", category: "PAID", statutoryName: "Casual Leave", source: "West Bengal S&E Rules 1964", minAmount: 10, minUnit: "DAY" },
      { country: "IN", state: "TN", category: "PAID", statutoryName: "Sick Leave", source: "Tamil Nadu S&E Act 1947 s.25(2)", minAmount: 12, minUnit: "DAY" },
      { country: "IN", state: "GJ", category: "PAID", statutoryName: "Sick Leave", source: "Gujarat S&E Act 2019 s.18", minAmount: 7, minUnit: "DAY" },
      { country: "IN", state: "WB", category: "PAID", statutoryName: "Sick Leave", source: "West Bengal S&E Rules 1964", minAmount: 14, minUnit: "DAY" },
      { country: "IN", state: null, category: "PAID", statutoryName: "Earned Leave (OSH Code)", source: "OSH Code 2020 s.32", minAmount: 18, minUnit: "DAY" },
      { country: "IN", state: null, category: "PAID", statutoryName: "Maternity Leave", source: "Maternity Benefit Act 1961 (amended 2017) / CSS Code 2020 s.60-65", minAmount: 182, minUnit: "DAY" },
    ];

    let templatesCreated = 0;
    for (const t of templates) {
      const exists = await db.leaveComplianceTemplate.findFirst({
        where: { jurisdictionCountry: t.country, jurisdictionState: t.state, statutoryName: t.statutoryName },
      });
      if (exists) continue;
      await db.leaveComplianceTemplate.create({
        data: {
          jurisdictionCountry: t.country,
          jurisdictionState: t.state,
          leaveCategory: t.category,
          statutoryName: t.statutoryName,
          effectiveFrom: new Date("2025-11-21"), // Labour Codes commencement date
          statutoryMinimum: { amount: t.minAmount, unit: t.minUnit },
          legalSource: t.source,
          verifiedDate: new Date(),
          status: "VERIFIED",
          notes: "Seeded from the published Statutory Leave Policy Reference — verify against counsel before treating as PUBLISHED.",
        },
      });
      templatesCreated++;
    }
    results.complianceTemplates = { created: templatesCreated, total: templates.length };

    results.allStepsCompleted = true;
  } catch (error) {
    results.fatalError = { message: error instanceof Error ? error.message : String(error) };
  } finally {
    await db.$disconnect();
  }

  console.log(JSON.stringify(results, null, 2));
}

main();

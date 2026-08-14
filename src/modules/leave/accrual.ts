import { db } from "@/lib/db";
import { postLedgerEntry } from "@/modules/leave/ledger";
import { parsePolicyConfig } from "@/modules/leave/policy";
import { isPolicyApplicableToUser, isServiceEligible } from "@/modules/leave/eligibility";
import { applyRounding } from "@/modules/leave/calculation";

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Runs monthly accrual for every published, FIXED or EXPERIENCE_BASED policy
 * version in the org, crediting each applicable/eligible employee. Idempotent
 * via the ledger's idempotencyKey (userId:leaveTypeId:period), so re-running
 * the same month is a no-op on the second pass (spec §9, closes audit gap #3
 * — LeaveType.accrualRule was declared but never read by any code).
 * Attendance-based and grant-based entitlement are NOT processed here —
 * attendance-based accrues from OtRecord elsewhere (Phase 7 comp-off path
 * covers the comp-off case; general attendance-based leave accrual is a
 * documented limitation, see TASKFILE blockers), grant-based is always
 * manual via grants.ts.
 */
export async function runMonthlyAccrual(orgId: string, asOf: Date) {
  const period = monthKey(asOf);
  let creditedCount = 0;
  let skippedCount = 0;

  const publishedVersions = await db.leavePolicyVersion.findMany({
    where: {
      status: "PUBLISHED",
      leaveType: { orgId },
      effectiveFrom: { lte: asOf },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: asOf } }],
    },
    include: { leaveType: true, applicabilityRules: true },
  });

  for (const version of publishedVersions) {
    const config = parsePolicyConfig(version.configuration);
    if (config.entitlement.model !== "FIXED" && config.entitlement.model !== "EXPERIENCE_BASED") {
      continue;
    }
    if (
      config.entitlement.model === "FIXED" &&
      config.entitlement.creditFrequency !== "MONTHLY" &&
      config.entitlement.creditFrequency !== "INSTANT"
    ) {
      continue;
    }
    if (config.entitlement.model === "EXPERIENCE_BASED" && config.entitlement.creditFrequency !== "MONTHLY") {
      continue;
    }

    const candidates = await db.user.findMany({
      where: { orgId, active: true },
      select: {
        id: true,
        branchId: true,
        departmentId: true,
        divisionId: true,
        designation: true,
        employmentType: true,
      },
    });

    for (const candidate of candidates) {
      const applicable = await isPolicyApplicableToUser(version.id, candidate.id);
      if (!applicable) {
        skippedCount++;
        continue;
      }
      const eligible = await isServiceEligible(candidate.id, config.effectiveAfterServiceMonths, asOf);
      if (!eligible) {
        skippedCount++;
        continue;
      }

      let amount = 0;
      if (config.entitlement.model === "FIXED") {
        amount = config.entitlement.amount / 12; // annual amount prorated to a monthly credit
      } else {
        const record = await db.employmentRecord.findUnique({
          where: { userId: candidate.id },
          select: { joinDate: true },
        });
        if (!record) {
          skippedCount++;
          continue;
        }
        const serviceMonths = Math.floor(
          (asOf.getTime() - record.joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
        );
        const tier = config.entitlement.tiers.find(
          (t) => serviceMonths >= t.minServiceMonths && (t.maxServiceMonths == null || serviceMonths < t.maxServiceMonths),
        );
        if (!tier) {
          skippedCount++;
          continue;
        }
        amount = tier.amount / 12;
      }

      amount = applyRounding(amount, version.roundingMode, version.roundingIncrement);
      if (amount <= 0) {
        skippedCount++;
        continue;
      }

      await postLedgerEntry({
        orgId,
        userId: candidate.id,
        leaveTypeId: version.leaveTypeId,
        policyVersionId: version.id,
        type: "ACCRUAL",
        quantity: amount,
        effectiveDate: asOf,
        year: asOf.getFullYear(),
        source: "SCHEDULER",
        reason: `Monthly accrual for ${period}`,
        idempotencyKey: `accrual:${candidate.id}:${version.leaveTypeId}:${period}`,
      });
      creditedCount++;
    }
  }

  return { creditedCount, skippedCount, period };
}

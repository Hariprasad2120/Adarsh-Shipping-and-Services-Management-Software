import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { postLedgerEntry, getMaterializedBalance } from "@/modules/leave/ledger";
import { parsePolicyConfig } from "@/modules/leave/policy";
import type { LeavePolicyConfig } from "@/modules/leave/policy-config.schema";

/**
 * Computes the next reset (leave-year-boundary) date for a user+policy,
 * per the policy's reset.cadence. Precomputed and stored on LeaveBalance.
 * nextResetDate so the daily cron does a cheap indexed WHERE nextResetDate
 * <= today instead of recomputing every employee's anniversary on every run
 * (design decision logged in TASKFILE.md — chosen for scalability).
 */
export function computeNextResetDate(
  config: LeavePolicyConfig,
  asOf: Date,
  joinDate: Date | null,
): Date | null {
  switch (config.reset.cadence) {
    case "NONE":
      return null;
    case "CALENDAR_YEAR":
      return new Date(Date.UTC(asOf.getUTCFullYear() + 1, 0, 1));
    case "FINANCIAL_YEAR": {
      const startMonth = (config.reset.financialYearStartMonth ?? 4) - 1; // 0-indexed
      const candidate = new Date(Date.UTC(asOf.getUTCFullYear(), startMonth, 1));
      if (candidate <= asOf) candidate.setUTCFullYear(candidate.getUTCFullYear() + 1);
      return candidate;
    }
    case "ANNIVERSARY": {
      if (!joinDate) return null;
      const candidate = new Date(
        Date.UTC(asOf.getUTCFullYear(), joinDate.getUTCMonth(), joinDate.getUTCDate()),
      );
      if (candidate <= asOf) candidate.setUTCFullYear(candidate.getUTCFullYear() + 1);
      return candidate;
    }
    case "MONTHLY": {
      const candidate = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() + 1, 1));
      return candidate;
    }
    default:
      return null;
  }
}

/**
 * Recomputes and stores nextResetDate for every LeaveBalance row belonging
 * to a published policy version. Call after publishing a policy or after
 * an employee's join date changes; also safe to call idempotently as part
 * of the daily reset cron to backfill rows that don't have one yet.
 */
export async function refreshResetSchedule(orgId: string, asOf: Date) {
  const publishedVersions = await db.leavePolicyVersion.findMany({
    where: { status: "PUBLISHED", leaveType: { orgId } },
    include: { leaveType: true },
  });

  let updated = 0;
  for (const version of publishedVersions) {
    const config = parsePolicyConfig(version.configuration);
    if (config.reset.cadence === "NONE") continue;

    const balances = await db.leaveBalance.findMany({
      where: { leaveTypeId: version.leaveTypeId, nextResetDate: null },
    });

    for (const balance of balances) {
      const record = await db.employmentRecord.findUnique({
        where: { userId: balance.userId },
        select: { joinDate: true },
      });
      const nextResetDate = computeNextResetDate(config, asOf, record?.joinDate ?? null);
      if (!nextResetDate) continue;
      await db.leaveBalance.update({ where: { id: balance.id }, data: { nextResetDate } });
      updated++;
    }
  }
  return { updated };
}

/**
 * Processes every LeaveBalance whose nextResetDate has arrived: applies
 * carry-forward (capped per policy), posts CARRY_FORWARD_EXPIRY for the
 * forfeited remainder, then RESET, and schedules the next boundary.
 * Idempotent via ledger idempotencyKey keyed on the specific reset date, so
 * a duplicate cron run on the same day is a no-op.
 */
export async function runDueResets(orgId: string, asOf: Date) {
  const dueBalances = await db.leaveBalance.findMany({
    where: { nextResetDate: { lte: asOf }, leaveType: { orgId } },
    include: { leaveType: true },
  });

  let processed = 0;
  for (const balance of dueBalances) {
    const version = await db.leavePolicyVersion.findUnique({
      where: { id: balance.leaveType.activeVersionId ?? "" },
    });
    if (!version) continue;
    const config = parsePolicyConfig(version.configuration);
    if (config.reset.cadence === "NONE") continue;

    const currentBalance = await getMaterializedBalance(balance.userId, balance.leaveTypeId, balance.year);
    const resetDateKey = balance.nextResetDate!.toISOString().slice(0, 10);

    let carriedForward = new Prisma.Decimal(0);
    if (config.carryForward.mode !== "NONE" && currentBalance.greaterThan(0)) {
      if (config.carryForward.mode === "ALL") {
        carriedForward = currentBalance;
      } else if (config.carryForward.mode === "FIXED_MAX") {
        carriedForward = Prisma.Decimal.min(currentBalance, config.carryForward.fixedMax ?? 0);
      } else if (config.carryForward.mode === "PERCENTAGE") {
        carriedForward = currentBalance.times((config.carryForward.percentage ?? 0) / 100);
      }
    }
    const forfeited = currentBalance.minus(carriedForward);

    if (forfeited.greaterThan(0)) {
      await postLedgerEntry({
        orgId,
        userId: balance.userId,
        leaveTypeId: balance.leaveTypeId,
        policyVersionId: version.id,
        type: "CARRY_FORWARD_EXPIRY",
        quantity: forfeited.negated(),
        effectiveDate: balance.nextResetDate!,
        year: balance.year,
        source: "SCHEDULER",
        reason: "Unused balance forfeited at leave-year reset (exceeds carry-forward allowance)",
        idempotencyKey: `carry-forward-expiry:${balance.userId}:${balance.leaveTypeId}:${resetDateKey}`,
        allowNegative: true,
      });
    }

    // The leave-year being entered is whatever year balance.nextResetDate
    // itself falls in — NOT derived from asOf. Deriving it from asOf (the
    // cron's "as of" timestamp) is off by one whenever asOf's year already
    // equals the target year (the common case: a CALENDAR_YEAR reset with
    // nextResetDate = 2027-01-01 is normally processed by a cron running
    // ON 2027-01-01, i.e. asOf.getUTCFullYear() is ALREADY 2027, not 2026 —
    // so "+1" for non-monthly cadences posted the carry-forward one year
    // too late) or off by one the other way if the cron runs late into the
    // following year. Found via real end-to-end testing against a live DB
    // (round 17) — balanceAfterReset for the target year came back 0
    // instead of the expected carried-forward amount.
    const nextYear = balance.nextResetDate!.getUTCFullYear();
    if (carriedForward.greaterThan(0)) {
      await postLedgerEntry({
        orgId,
        userId: balance.userId,
        leaveTypeId: balance.leaveTypeId,
        policyVersionId: version.id,
        type: "CARRY_FORWARD",
        quantity: carriedForward,
        effectiveDate: balance.nextResetDate!,
        year: nextYear,
        source: "SCHEDULER",
        reason: "Balance carried forward from prior leave year",
        idempotencyKey: `carry-forward:${balance.userId}:${balance.leaveTypeId}:${resetDateKey}`,
      });
    }

    const record = await db.employmentRecord.findUnique({
      where: { userId: balance.userId },
      select: { joinDate: true },
    });
    const nextResetDate = computeNextResetDate(config, balance.nextResetDate!, record?.joinDate ?? null);
    await db.leaveBalance.update({ where: { id: balance.id }, data: { nextResetDate } });

    processed++;
  }

  return { processed };
}

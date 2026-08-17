import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { requireCronSecret } from "@/lib/security";
import { expireStaleCompOffCredits, notifyExpiringCompOffCredits } from "@/modules/leave/compoff";
import { refreshResetSchedule, runDueResets } from "@/modules/leave/reset";

const COMP_OFF_EXPIRY_WARNING_DAYS = 7;

/**
 * Daily job: comp-off expiry, plus carry-forward/reset processing for any
 * LeaveBalance whose precomputed nextResetDate has arrived (calendar/
 * financial/anniversary/monthly cadence — see src/modules/leave/reset.ts).
 * refreshResetSchedule backfills nextResetDate for any balance row that
 * doesn't have one yet (new policy, new employee) before runDueResets scans
 * for due rows via the indexed nextResetDate column. Also sends advance
 * warnings for comp-off credits expiring within COMP_OFF_EXPIRY_WARNING_DAYS
 * (closure-pass notification-coverage gap: this cron previously only
 * notified AFTER forfeiting units, never before).
 */
export async function GET(request: Request) {
  const cronError = requireCronSecret(request);
  if (cronError) return cronError;

  const now = await getNow();
  const runKey = `leave-expiry:${now.toISOString().slice(0, 10)}`;

  const orgs = await db.organisation.findMany({ where: { active: true }, select: { id: true } });

  const results = [];
  for (const org of orgs) {
    const schedulerRun = await db.leaveSchedulerRun
      .create({ data: { orgId: org.id, jobType: "COMP_OFF_EXPIRY", runKey: `${runKey}:${org.id}`, status: "RUNNING" } })
      .catch(() => null);
    if (!schedulerRun) {
      results.push({ orgId: org.id, skipped: true });
      continue;
    }
    try {
      const expiryWarningResult = await notifyExpiringCompOffCredits(org.id, now, COMP_OFF_EXPIRY_WARNING_DAYS);
      const compOffResult = await expireStaleCompOffCredits(org.id, now);
      await refreshResetSchedule(org.id, now);
      const resetResult = await runDueResets(org.id, now);

      await db.leaveSchedulerRun.update({
        where: { id: schedulerRun.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          processedCount: compOffResult.processed + resetResult.processed,
        },
      });
      results.push({ orgId: org.id, expiryWarnings: expiryWarningResult, compOff: compOffResult, reset: resetResult });
    } catch (error) {
      await db.leaveSchedulerRun.update({
        where: { id: schedulerRun.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorCount: 1,
          errorDetails: { message: error instanceof Error ? error.message : String(error) },
        },
      });
      results.push({ orgId: org.id, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return NextResponse.json({ ok: true, runKey, results });
}

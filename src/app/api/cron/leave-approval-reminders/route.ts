import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { requireCronSecret } from "@/lib/security";
import { processApprovalReminders } from "@/modules/leave/approval-reminders";

/**
 * Runs SLA reminder/escalation checks (spec §11). Unlike the accrual/reset
 * crons, this one intentionally does NOT use LeaveSchedulerRun for
 * idempotency — reminders are meant to recur on every overdue step until
 * decided, so re-running this job hourly (or however often it's
 * scheduled) is the correct behavior, not a duplicate-processing risk.
 */
export async function GET(request: Request) {
  const cronError = requireCronSecret(request);
  if (cronError) return cronError;

  const now = await getNow();
  const orgs = await db.organisation.findMany({ where: { active: true }, select: { id: true } });

  const results = [];
  for (const org of orgs) {
    try {
      const result = await processApprovalReminders(org.id, now);
      results.push({ orgId: org.id, ...result });
    } catch (error) {
      results.push({ orgId: org.id, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return NextResponse.json({ ok: true, results });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { requireCronSecret } from "@/lib/security";
import { runMonthlyAccrual } from "@/modules/leave/accrual";

/**
 * Runs monthly leave accrual for every org. Idempotent — safe to re-run the
 * same day/month; the ledger's idempotencyKey prevents double-crediting
 * (spec §9's "restart-safe" requirement).
 */
export async function GET(request: Request) {
  const cronError = requireCronSecret(request);
  if (cronError) return cronError;

  const now = await getNow();
  const runKey = `accrual:${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const orgs = await db.organisation.findMany({ where: { active: true }, select: { id: true } });

  const results = [];
  for (const org of orgs) {
    const schedulerRun = await db.leaveSchedulerRun.create({
      data: { orgId: org.id, jobType: "ACCRUAL", runKey: `${runKey}:${org.id}`, status: "RUNNING" },
    }).catch(() => null); // unique runKey violation = already run for this org this month

    if (!schedulerRun) {
      results.push({ orgId: org.id, skipped: true, reason: "already run this period" });
      continue;
    }

    try {
      const result = await runMonthlyAccrual(org.id, now);
      await db.leaveSchedulerRun.update({
        where: { id: schedulerRun.id },
        data: { status: "COMPLETED", completedAt: new Date(), processedCount: result.creditedCount },
      });
      results.push({ orgId: org.id, ...result });
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

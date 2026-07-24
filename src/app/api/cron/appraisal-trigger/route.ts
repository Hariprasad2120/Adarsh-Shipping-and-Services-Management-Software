import { NextRequest, NextResponse } from "next/server";
import { getNow } from "@/lib/clock";
import { requireCronSecret } from "@/lib/security";
import { runAppraisalDailyJob } from "@/modules/ams/daily-job";

// Vercel Cron: runs daily at 00:30 IST (19:00 UTC)
// vercel.json: { "crons": [{ "path": "/api/cron/appraisal-trigger", "schedule": "0 19 * * *" }] }

export async function GET(req: NextRequest) {
  const cronError = requireCronSecret(req);
  if (cronError) return cronError;

  const result = await runAppraisalDailyJob(await getNow());
  return NextResponse.json(result);
}

import { NextRequest, NextResponse } from "next/server";
import { getNow } from "@/lib/clock";
import { runAppraisalDailyJob } from "@/modules/ams/daily-job";

// Vercel Cron: runs daily at 00:30 IST (19:00 UTC)
// vercel.json: { "crons": [{ "path": "/api/cron/appraisal-trigger", "schedule": "0 19 * * *" }] }

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runAppraisalDailyJob(await getNow());
  return NextResponse.json(result);
}

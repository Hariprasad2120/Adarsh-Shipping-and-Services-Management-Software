import { NextRequest, NextResponse } from "next/server";
import { triggerAllDueCrmLeadReminders } from "@/modules/notifications/service";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");

  if (
    secret !== process.env.CRON_SECRET &&
    querySecret !== process.env.CRON_SECRET &&
    process.env.NODE_ENV !== "development"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await triggerAllDueCrmLeadReminders();
  return NextResponse.json({ success: true });
}

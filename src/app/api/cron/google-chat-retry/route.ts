// ─── Cron: Retry failed Google Chat deliveries ───────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { retryFailedDeliveries } from "@/modules/google-chat/delivery";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const retried = await retryFailedDeliveries(20);
  return NextResponse.json({ retried });
}

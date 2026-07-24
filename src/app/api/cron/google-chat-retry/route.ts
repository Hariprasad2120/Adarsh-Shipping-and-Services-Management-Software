// ─── Cron: Retry failed Google Chat deliveries ───────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/security";
import { retryFailedDeliveries } from "@/modules/google-chat/delivery";

export async function GET(req: NextRequest) {
  const cronError = requireCronSecret(req);
  if (cronError) return cronError;

  const retried = await retryFailedDeliveries(20);
  return NextResponse.json({ retried });
}

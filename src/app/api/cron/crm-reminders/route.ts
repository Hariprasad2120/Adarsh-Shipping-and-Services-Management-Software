import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/security";
import { triggerAllDueCrmLeadReminders } from "@/modules/notifications/service";

export async function GET(req: NextRequest) {
  const cronError = requireCronSecret(req);
  if (cronError) return cronError;

  await triggerAllDueCrmLeadReminders();
  return NextResponse.json({ success: true });
}

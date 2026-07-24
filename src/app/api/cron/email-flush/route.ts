import { NextRequest, NextResponse } from "next/server";
import { flushEmailQueue } from "@/lib/notify";
import { requireCronSecret } from "@/lib/security";

export async function GET(req: NextRequest) {
  const cronError = requireCronSecret(req);
  if (cronError) return cronError;

  const sent = await flushEmailQueue(50);
  return NextResponse.json({ sent });
}

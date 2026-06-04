import { NextRequest, NextResponse } from "next/server";
import { flushEmailQueue } from "@/lib/notify";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sent = await flushEmailQueue(50);
  return NextResponse.json({ sent });
}

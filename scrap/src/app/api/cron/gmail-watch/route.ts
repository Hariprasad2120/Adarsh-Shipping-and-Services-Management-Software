import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { registerGmailWatch } from "@/modules/communication/gmail-sync.service";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = await getNow();
  // Find watches expiring within the next 24 hours (86400000 ms), or that do not have a watch set yet
  const threshold = new Date(now.getTime() + 86400000);

  const expiringAccounts = await db.mailAccount.findMany({
    where: {
      provider: "GOOGLE",
      isActive: true,
      OR: [
        { watchExpiration: null },
        { watchExpiration: { lte: threshold } },
      ],
    },
  });

  console.log(`[Gmail Cron] Found ${expiringAccounts.length} watches expiring or missing watch subscription.`);

  let renewedCount = 0;
  let failedCount = 0;

  for (const account of expiringAccounts) {
    try {
      console.log(`[Gmail Cron] Renewing watch subscription for: ${account.email}`);
      const res = await registerGmailWatch(account.id, account.orgId);
      if (res.success) {
        renewedCount++;
      } else {
        console.error(`[Gmail Cron] Failed to renew watch subscription for ${account.email}:`, res.reason);
        failedCount++;
      }
    } catch (err: any) {
      console.error(`[Gmail Cron] Exception during watch renewal for ${account.email}:`, err.message);
      failedCount++;
    }
  }

  return NextResponse.json({
    checkedCount: expiringAccounts.length,
    renewedCount,
    failedCount,
  });
}

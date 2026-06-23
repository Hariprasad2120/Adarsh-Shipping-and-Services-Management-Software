import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncGmailIncremental } from "@/modules/communication/gmail-sync.service";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log("[Gmail Webhook] Received Pub/Sub push notification:", JSON.stringify(payload));

    if (!payload.message || !payload.message.data) {
      return NextResponse.json({ error: "Invalid Pub/Sub message payload" }, { status: 400 });
    }

    // Parse base64 message data
    const decodedString = Buffer.from(payload.message.data, "base64").toString("utf-8");
    const data = JSON.parse(decodedString);
    const { emailAddress, historyId } = data;

    if (!emailAddress) {
      return NextResponse.json({ error: "Missing emailAddress in payload data" }, { status: 400 });
    }

    console.log(`[Gmail Webhook] Triggering incremental sync for ${emailAddress}. Google HistoryId: ${historyId}`);

    const accounts = await db.mailAccount.findMany({
      where: {
        email: { equals: emailAddress, mode: "insensitive" },
        provider: "GOOGLE",
        isActive: true,
      },
    });

    if (accounts.length === 0) {
      console.warn(`[Gmail Webhook] No active Google MailAccount registered for ${emailAddress}`);
      return NextResponse.json({ success: false, reason: "No matching active MailAccount found." }, { status: 200 });
    }

    let successCount = 0;
    for (const account of accounts) {
      console.log(`[Gmail Webhook] Syncing account ID: ${account.id} for Org: ${account.orgId}`);
      const res = await syncGmailIncremental(account.id, account.orgId);
      if (res.success) {
        successCount++;
      }
    }

    return NextResponse.json({ success: true, accountsSyncedCount: successCount });
  } catch (err: any) {
    console.error("[Gmail Webhook] Error processing Pub/Sub push:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

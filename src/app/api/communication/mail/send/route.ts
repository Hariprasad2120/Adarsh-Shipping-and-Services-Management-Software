import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/google-gmail-client";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { to, subject, body, threadId } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await sendEmail({
      userId: session.user.id,
      to,
      subject,
      body,
      threadId
    });

    // Create Audit Event
    await db.communicationAuditEvent.create({
      data: {
        orgId: session.user.orgId!,
        userId: session.user.id,
        action: "SEND_EMAIL",
        details: `Sent email to ${to} with subject: ${subject}`
      }
    });

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error("[MailSendAPI] Error sending email:", err);
    return NextResponse.json({ error: err.message || "Failed to send email" }, { status: 500 });
  }
}

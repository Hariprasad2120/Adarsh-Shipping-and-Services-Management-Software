import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/google-gmail-client";
import { db } from "@/lib/db";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

async function readSendPayload(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const attachments = await Promise.all(
      formData
        .getAll("attachments")
        .filter((value): value is File => value instanceof File && value.size > 0)
        .map(async (file) => ({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          content: Buffer.from(await file.arrayBuffer()),
        })),
    );

    return {
      to: String(formData.get("to") ?? "").trim(),
      cc: String(formData.get("cc") ?? "").trim() || undefined,
      bcc: String(formData.get("bcc") ?? "").trim() || undefined,
      subject: String(formData.get("subject") ?? "").trim(),
      body: String(formData.get("body") ?? ""),
      textBody: String(formData.get("textBody") ?? "").trim() || undefined,
      threadId: String(formData.get("threadId") ?? "").trim() || undefined,
      attachments,
    };
  }

  const json = await req.json();
  return {
    to: typeof json.to === "string" ? json.to.trim() : "",
    cc: typeof json.cc === "string" && json.cc.trim() ? json.cc.trim() : undefined,
    bcc: typeof json.bcc === "string" && json.bcc.trim() ? json.bcc.trim() : undefined,
    subject: typeof json.subject === "string" ? json.subject.trim() : "",
    body: typeof json.body === "string" ? json.body : "",
    textBody:
      typeof json.textBody === "string" && json.textBody.trim()
        ? json.textBody.trim()
        : undefined,
    threadId:
      typeof json.threadId === "string" && json.threadId.trim()
        ? json.threadId.trim()
        : undefined,
    attachments: [],
  };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { attachments, bcc, body, cc, subject, textBody, threadId, to } =
      await readSendPayload(req);

    if (!to || !subject || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await sendEmail({
      userId: session.user.id,
      to,
      cc,
      bcc,
      subject,
      body,
      textBody,
      threadId,
      attachments,
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
  } catch (err: unknown) {
    console.error("[MailSendAPI] Error sending email:", err);
    return NextResponse.json(
      { error: getErrorMessage(err, "Failed to send email") },
      { status: 500 },
    );
  }
}

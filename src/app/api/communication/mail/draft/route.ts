import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createDraft } from "@/lib/google-gmail-client";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

async function readDraftPayload(req: NextRequest) {
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
      to: String(formData.get("to") ?? "").trim() || undefined,
      cc: String(formData.get("cc") ?? "").trim() || undefined,
      bcc: String(formData.get("bcc") ?? "").trim() || undefined,
      subject: String(formData.get("subject") ?? "").trim(),
      body: String(formData.get("body") ?? ""),
      textBody: String(formData.get("textBody") ?? "").trim() || undefined,
      attachments,
    };
  }

  const json = await req.json();
  return {
    to: typeof json.to === "string" && json.to.trim() ? json.to.trim() : undefined,
    cc: typeof json.cc === "string" && json.cc.trim() ? json.cc.trim() : undefined,
    bcc: typeof json.bcc === "string" && json.bcc.trim() ? json.bcc.trim() : undefined,
    subject: typeof json.subject === "string" ? json.subject.trim() : "",
    body: typeof json.body === "string" ? json.body : "",
    textBody:
      typeof json.textBody === "string" && json.textBody.trim()
        ? json.textBody.trim()
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
    const payload = await readDraftPayload(req);
    if (!payload.subject && !payload.body && !payload.to && !payload.cc && !payload.bcc) {
      return NextResponse.json(
        { error: "Draft is empty" },
        { status: 400 },
      );
    }

    const result = await createDraft({
      userId: session.user.id,
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      subject: payload.subject || "(no subject)",
      body: payload.body || "",
      textBody: payload.textBody,
      attachments: payload.attachments,
    });

    return NextResponse.json({ ok: true, result });
  } catch (err: unknown) {
    console.error("[MailDraftAPI] Error creating draft:", err);
    return NextResponse.json(
      { error: getErrorMessage(err, "Failed to create draft") },
      { status: 500 },
    );
  }
}

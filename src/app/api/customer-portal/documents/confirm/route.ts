import { NextResponse } from "next/server";
import { getPortalSession } from "@/modules/customer-portal/auth";
import { confirmPortalDocumentSubmission } from "@/modules/customer-portal/service";

export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      jobId?: string;
      requirementId?: string;
    };

    const result = await confirmPortalDocumentSubmission({
      portalUserId: session.portalUserId,
      jobId: String(payload.jobId || ""),
      requirementId: String(payload.requirementId || ""),
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Confirmation failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { getPortalSession } from "@/modules/customer-portal/auth";
import { uploadPortalDocument } from "@/modules/customer-portal/service";

export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const jobId = String(formData.get("jobId") || "");
    const requirementId = String(formData.get("requirementId") || "");
    const comment = String(formData.get("comment") || "");
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("A file is required.");
    }
    const result = await uploadPortalDocument({
      portalUserId: session.portalUserId,
      jobId,
      requirementId,
      file,
      comment,
    });
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

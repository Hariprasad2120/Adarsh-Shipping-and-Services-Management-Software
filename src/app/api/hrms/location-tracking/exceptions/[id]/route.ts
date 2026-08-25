import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission, apiError } from "@/lib/rbac";
import { submitExceptionExplanation, reviewException } from "@/modules/hrms/location-tracking";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const { id } = await params;
    const body = await request.json();

    if (body?.action === "explain") {
      // The affected employee explaining their own exception — no admin permission required,
      // but service layer scopes the update to (id, orgId, userId) so it can't touch anyone else's row.
      if (!body.explanation) return NextResponse.json({ error: "explanation is required" }, { status: 400 });
      const exception = await submitExceptionExplanation(id, orgId, session.user.id, body.explanation, body.attachmentUrl);
      return NextResponse.json({ ok: true, data: exception });
    }

    await requirePermission(session.user.id, "hrms.tracking.exceptions.review");
    if (["REQUEST_EXPLANATION", "RESOLVE", "DISMISS"].includes(body?.action)) {
      const exception = await reviewException(id, orgId, session.user.id, body.action, body.resolution);
      return NextResponse.json({ ok: true, data: exception });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return apiError(error);
  }
}

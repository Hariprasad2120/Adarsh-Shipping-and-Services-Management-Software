import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { generateAppraisalLetterBuffer } from "@/modules/ams/pdf/generate-letter";
import { assertAppraisalInOrg } from "@/modules/ams/service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const orgId = session.user.orgId;
    const { id } = await params;
  await assertAppraisalInOrg(id, session?.user?.orgId);

    const type = new URL(request.url).searchParams.get("type") === "increment" ? "INCREMENT" : "OUTCOME";

    const appraisal = await db.appraisal.findFirst({
      where: { id, cycle: { orgId } },
      select: { employeeId: true, reviewers: { select: { userId: true, kind: true } } },
    });
    if (!appraisal) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const isSubject = appraisal.employeeId === session.user.id;
    const isHrReviewer = appraisal.reviewers.some(
      (reviewer) => reviewer.userId === session.user.id && reviewer.kind === "HR",
    );
    const privileged =
      (await can(session.user.id, "ams.appraisal.view_all")) ||
      (await can(session.user.id, "ams.hike.finalise"));
    if (!isSubject && !isHrReviewer && !privileged) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const result = await generateAppraisalLetterBuffer(orgId, id, type);
    if (!result) {
      return NextResponse.json({ ok: false, error: "Letter not available until the hike is finalised" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate letter";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

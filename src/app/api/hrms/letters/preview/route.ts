import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission, apiError } from "@/lib/rbac";
import { generateHRLetterPreviewPdf } from "@/modules/hrms/letters-service";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.orgId) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        },
        { status: 401 },
      );
    }

    await requirePermission(session.user.id, "hrms.letters.manage");

    const body = await req.json();
    const { templateId, userId, details } = body;

    if (!templateId || !userId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "BAD_REQUEST",
            message: "Missing templateId or userId",
          },
        },
        { status: 400 },
      );
    }

    const data = await generateHRLetterPreviewPdf(session.user.orgId, {
      templateId,
      userId,
      details,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}

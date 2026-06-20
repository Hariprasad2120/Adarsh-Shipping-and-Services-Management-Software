import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ callAttemptId: string }> }
) {
  try {
    const { callAttemptId } = await params;
    const user = await getMobileUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { durationSeconds, status } = body;

    const attempt = await db.crmCallAttempt.findFirst({
      where: {
        id: callAttemptId,
        orgId: user.orgId ?? undefined,
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Call attempt not found" }, { status: 404 });
    }

    const updatedAttempt = await db.crmCallAttempt.update({
      where: { id: callAttemptId },
      data: {
        durationSeconds: durationSeconds ? parseInt(durationSeconds) : null,
        status: status || "COMPLETED",
        callEndedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, callAttempt: updatedAttempt });
  } catch (error: any) {
    console.error("mobile complete call attempts API error:", error);
    return NextResponse.json({ error: error.message ?? "Internal Server Error" }, { status: 500 });
  }
}

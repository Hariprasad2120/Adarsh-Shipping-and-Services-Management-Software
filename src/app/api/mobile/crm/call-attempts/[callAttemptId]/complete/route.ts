import { db } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth";
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";

export async function OPTIONS() {
  return mobileOptions();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ callAttemptId: string }> }
) {
  try {
    const { callAttemptId } = await params;
    const user = await getMobileUser(request);
    if (!user) {
      return mobileJson({ error: "Unauthorized" }, 401);
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
      return mobileJson({ error: "Call attempt not found" }, 404);
    }

    const updatedAttempt = await db.crmCallAttempt.update({
      where: { id: callAttemptId },
      data: {
        durationSeconds: durationSeconds ? parseInt(durationSeconds) : null,
        status: status || "COMPLETED",
        callEndedAt: new Date(),
      },
    });

    return mobileJson({ success: true, callAttempt: updatedAttempt });
  } catch (error: any) {
    console.error("mobile complete call attempts API error:", error);
    return mobileJson({ error: error.message ?? "Internal Server Error" }, 500);
  }
}

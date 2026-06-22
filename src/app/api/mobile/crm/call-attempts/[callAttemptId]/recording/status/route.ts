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

    const attempt = await db.crmCallAttempt.findFirst({
      where: {
        id: callAttemptId,
        orgId: user.orgId ?? undefined,
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Call attempt not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { uploadStatus, uploadProgress, errorMessage, fileName, fileSize, sha256Hash } = body;

    if (!uploadStatus) {
      return NextResponse.json({ error: "Missing uploadStatus" }, { status: 400 });
    }

    // Upsert recording record
    const recording = await db.crmCallRecording.upsert({
      where: { callAttemptId },
      update: {
        uploadStatus,
        uploadProgress: typeof uploadProgress === "number" ? uploadProgress : undefined,
        errorMessage: errorMessage ?? null,
        fileName: fileName || undefined,
        fileSize: fileSize || undefined,
        sha256Hash: sha256Hash || undefined,
      },
      create: {
        orgId: attempt.orgId,
        callAttemptId: attempt.id,
        leadId: attempt.leadId,
        salespersonId: attempt.salespersonId,
        customerPhone: attempt.customerPhone,
        fileName: fileName || "recording_temp",
        mimeType: "audio/octet-stream",
        fileSize: fileSize || 0,
        filePath: "temp",
        durationSeconds: 0,
        recordedAt: new Date(),
        sha256Hash: sha256Hash || `temp-${callAttemptId}`,
        matchConfidence: 100,
        matchReason: "Manual Status Update",
        uploadStatus,
        uploadProgress: uploadProgress || 0,
        errorMessage: errorMessage || null,
        transcriptionStatus: "PENDING",
      },
    });

    // Also update parent call attempt status if upload is finished
    if (uploadStatus === "UPLOADED") {
      await db.crmCallAttempt.update({
        where: { id: attempt.id },
        data: { status: "COMPLETED", callEndedAt: new Date() },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, recording });
  } catch (error: any) {
    console.error("mobile recording status API error:", error);
    return NextResponse.json({ error: error.message ?? "Internal Server Error" }, { status: 500 });
  }
}

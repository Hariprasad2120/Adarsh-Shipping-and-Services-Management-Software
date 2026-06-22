import { db } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth";
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";
import { transcribeRecording } from "@/lib/transcription";

export async function OPTIONS() {
  return mobileOptions();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ callAttemptId: string }> }
) {
  try {
    const { callAttemptId } = await params;
    const user = await getMobileUser(request);
    if (!user) {
      return mobileJson({ error: "Unauthorized" }, 401);
    }

    const attempt = await db.crmCallAttempt.findFirst({
      where: {
        id: callAttemptId,
        orgId: user.orgId ?? undefined,
      },
    });

    if (!attempt) {
      return mobileJson({ error: "Call attempt not found" }, 404);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fileName = formData.get("fileName") as string | null;
    const mimeType = formData.get("mimeType") as string | null;
    const fileSizeStr = formData.get("fileSize") as string | null;
    const durationSecondsStr = formData.get("durationSeconds") as string | null;
    const recordedAtStr = formData.get("recordedAt") as string | null;
    const sha256Hash = formData.get("sha256Hash") as string | null;
    const matchConfidenceStr = formData.get("matchConfidence") as string | null;
    const matchReason = formData.get("matchReason") as string | null;

    if (!file || !sha256Hash || !fileName) {
      return mobileJson({ error: "Missing required fields (file, fileName, sha256Hash)" }, 400);
    }

    // 1. Check for duplicate upload via hash
    const existing = await db.crmCallRecording.findUnique({
      where: { sha256Hash },
    });

    if (existing) {
      return mobileJson({
        success: true,
        duplicate: true,
        message: "Recording hash already uploaded.",
        recording: existing,
      });
    }

    const fileSize = fileSizeStr ? parseInt(fileSizeStr) : file.size;
    const durationSeconds = durationSecondsStr ? parseFloat(durationSecondsStr) : 0.0;
    const recordedAt = recordedAtStr
      ? (/^\d+$/.test(recordedAtStr) ? new Date(parseInt(recordedAtStr)) : new Date(recordedAtStr))
      : new Date();
    const matchConfidence = matchConfidenceStr ? parseFloat(matchConfidenceStr) : 0.0;

    // 2. Convert file to Base64 for database storage (Vercel-compatible — no local filesystem)
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileData = buffer.toString("base64");

    // 3. Upsert database entry
    const recording = await db.crmCallRecording.upsert({
      where: { callAttemptId: attempt.id },
      update: {
        fileName,
        mimeType: mimeType || file.type || "audio/octet-stream",
        fileSize,
        fileData,
        durationSeconds,
        recordedAt,
        sha256Hash,
        matchConfidence,
        matchReason: matchReason || "Auto matched",
        uploadStatus: "UPLOADED",
        uploadProgress: 100,
        errorMessage: null,
      },
      create: {
        orgId: attempt.orgId,
        callAttemptId: attempt.id,
        leadId: attempt.leadId,
        salespersonId: attempt.salespersonId,
        customerPhone: attempt.customerPhone,
        fileName,
        mimeType: mimeType || file.type || "audio/octet-stream",
        fileSize,
        fileData,
        durationSeconds,
        recordedAt,
        sha256Hash,
        matchConfidence,
        matchReason: matchReason || "Auto matched",
        uploadStatus: "UPLOADED",
        uploadProgress: 100,
        errorMessage: null,
        transcriptionStatus: "PENDING",
      },
    });

    // Automatically mark the call attempt status as COMPLETED when recording is uploaded
    await db.crmCallAttempt.update({
      where: { id: attempt.id },
      data: { status: "COMPLETED", callEndedAt: new Date() },
    }).catch((e) => {
      console.error("[Recording API] Failed to update call attempt status to COMPLETED:", e);
    });

    // 4. Trigger background transcription (non-blocking)
    transcribeRecording(recording.id).catch((e) => {
      console.error(`[Recording API] Failed to start background transcription for ${recording.id}:`, e);
    });

    return mobileJson({
      success: true,
      duplicate: false,
      recording: { id: recording.id, uploadStatus: recording.uploadStatus },
    });
  } catch (error: any) {
    console.error("mobile upload recording API error:", error);
    return mobileJson({ error: error.message ?? "Internal Server Error" }, 500);
  }
}

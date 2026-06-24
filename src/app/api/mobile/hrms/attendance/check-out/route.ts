/**
 * HRMS Mobile Check-Out API
 */
import { getMobileUser } from "@/lib/mobile-auth";
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";
import { checkOut } from "@/modules/hrms/mobile-attendance";
import { verifyFace } from "@/modules/hrms/face-enrollment";

export async function OPTIONS() {
  return mobileOptions();
}

export async function POST(request: Request) {
  try {
    const user = await getMobileUser(request);
    if (!user) return mobileJson({ error: "Unauthorized" }, 401);
    if (!user.orgId) return mobileJson({ error: "No organization" }, 400);

    const body = await request.json();
    const { sessionId, location, faceDescriptor, deviceId } = body;

    if (!sessionId) {
      return mobileJson({ error: "Session ID is required" }, 400);
    }

    if (!location?.lat || !location?.lng) {
      return mobileJson({ error: "Location data is required for check-out" }, 400);
    }

    // Face verification
    let faceVerified = false;
    let faceConfidence = 0;

    if (faceDescriptor && Array.isArray(faceDescriptor)) {
      const faceResult = await verifyFace(user.id, user.orgId, faceDescriptor);
      faceVerified = faceResult.verified;
      faceConfidence = faceResult.confidence;

      if (!faceVerified) {
        return mobileJson({
          error: "Face verification failed for check-out.",
          code: "FACE_MISMATCH",
          confidence: faceConfidence,
        }, 403);
      }
    }

    const session = await checkOut({
      userId: user.id,
      orgId: user.orgId,
      sessionId,
      location,
      faceVerified,
      faceConfidence,
      deviceId,
      source: "MOBILE",
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });

    return mobileJson({
      ok: true,
      data: {
        sessionId: session.id,
        checkInAt: session.checkInAt,
        checkOutAt: session.checkOutAt,
        workingMinutes: session.workingMinutes,
        faceVerified,
      },
    });
  } catch (error: any) {
    console.error("check-out API error:", error);
    return mobileJson({ error: error.message ?? "Check-out failed" }, 500);
  }
}

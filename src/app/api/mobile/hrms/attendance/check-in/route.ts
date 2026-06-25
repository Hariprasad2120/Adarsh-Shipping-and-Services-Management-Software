/**
 * HRMS Mobile Check-In API
 */
import { getMobileUser } from "@/lib/mobile-auth";
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";
import { checkIn } from "@/modules/hrms/mobile-attendance";
import { verifyFace } from "@/modules/hrms/face-enrollment";
import { checkUserAcceptance } from "@/modules/hrms/user-agreement";

export async function OPTIONS() {
  return mobileOptions();
}

export async function POST(request: Request) {
  try {
    const user = await getMobileUser(request);
    if (!user) return mobileJson({ error: "Unauthorized" }, 401);
    if (!user.orgId) return mobileJson({ error: "No organization" }, 400);

    const body = await request.json();
    let { location, faceDescriptor, deviceId } = body;

    // Fallback: If location is not provided but latitude/longitude are present at root level
    if (!location && (body.latitude !== undefined) && (body.longitude !== undefined)) {
      location = {
        lat: body.latitude,
        lng: body.longitude,
        accuracy: body.accuracy,
        altitude: body.altitude,
        speed: body.speed,
        bearing: body.bearing,
        timestamp: body.timestamp || new Date().toISOString(),
      };
    }

    // Validate required fields
    if (location?.lat == null || location?.lng == null) {
      return mobileJson({ error: "Location data is required for check-in" }, 400);
    }

    // Check agreement acceptance
    const agreement = await checkUserAcceptance(user.id, user.orgId);
    if (agreement.required && !agreement.accepted) {
      return mobileJson({
        error: "You must accept the user agreement before checking in",
        code: "AGREEMENT_REQUIRED",
        agreementId: agreement.agreement?.id,
      }, 403);
    }

    // Face verification (if descriptor provided)
    let faceVerified = false;
    let faceConfidence = 0;

    if (faceDescriptor && Array.isArray(faceDescriptor)) {
      const faceResult = await verifyFace(user.id, user.orgId, faceDescriptor);
      faceVerified = faceResult.verified;
      faceConfidence = faceResult.confidence;

      if (!faceVerified) {
        return mobileJson({
          error: "Face verification failed. Please try again or contact admin.",
          code: "FACE_MISMATCH",
          confidence: faceConfidence,
        }, 403);
      }
    }

    const session = await checkIn({
      userId: user.id,
      orgId: user.orgId,
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
        faceVerified,
        faceConfidence,
        trackingEnabled: session.trackingEnabled,
      },
    });
  } catch (error: any) {
    console.error("check-in API error:", error);
    return mobileJson({ error: error.message ?? "Check-in failed" }, 500);
  }
}

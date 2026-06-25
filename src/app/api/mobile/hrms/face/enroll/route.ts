/**
 * Face Enrollment API — Mobile
 *
 * POST: Enroll face descriptor
 * GET: Check enrollment status
 */
import { getMobileUser } from "@/lib/mobile-auth";
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";
import { enrollFace, getFaceEnrollmentStatus } from "@/modules/hrms/face-enrollment";

export async function OPTIONS() {
  return mobileOptions();
}

export async function GET(request: Request) {
  try {
    const user = await getMobileUser(request);
    if (!user) return mobileJson({ error: "Unauthorized" }, 401);

    const status = await getFaceEnrollmentStatus(user.id);
    return mobileJson({ ok: true, data: status });
  } catch (error: any) {
    return mobileJson({ error: error.message ?? "Failed to check enrollment" }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getMobileUser(request);
    if (!user) return mobileJson({ error: "Unauthorized" }, 401);
    if (!user.orgId) return mobileJson({ error: "No organization" }, 400);

    const body = await request.json();
    const { descriptor, livenessDetected, captureQuality } = body;

    // Allow enrollment with descriptor (biometric mode) or without (liveness-only mode)
    let faceDescriptor: number[] | null = null;
    if (descriptor && Array.isArray(descriptor) && descriptor.length > 0) {
      if (!descriptor.every((v: any) => typeof v === "number")) {
        return mobileJson({ error: "Invalid face descriptor format" }, 400);
      }
      faceDescriptor = descriptor;
    }

    // At minimum, liveness must be detected
    if (!livenessDetected && !faceDescriptor) {
      return mobileJson({ error: "Face detection or liveness verification is required" }, 400);
    }

    const result = await enrollFace(user.id, user.orgId, faceDescriptor, "mobile");
    return mobileJson({ ok: true, data: result });
  } catch (error: any) {
    console.error("face enroll API error:", error);
    return mobileJson({ error: error.message ?? "Face enrollment failed" }, 500);
  }
}

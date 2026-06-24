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
    const { descriptor } = body;

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length === 0) {
      return mobileJson({ error: "Face descriptor array is required" }, 400);
    }

    // Validate descriptor is a numeric array (face-api.js returns 128-dimensional Float32Array)
    if (!descriptor.every((v: any) => typeof v === "number")) {
      return mobileJson({ error: "Invalid face descriptor format" }, 400);
    }

    const result = await enrollFace(user.id, user.orgId, descriptor, "mobile");
    return mobileJson({ ok: true, data: result });
  } catch (error: any) {
    console.error("face enroll API error:", error);
    return mobileJson({ error: error.message ?? "Face enrollment failed" }, 500);
  }
}

/**
 * HRMS Mobile Dashboard API
 *
 * Returns today's attendance status, tracking state, shift info,
 * pending counts, and agreement acceptance status.
 */
import { getMobileUser } from "@/lib/mobile-auth";
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";
import { getAttendanceStatus } from "@/modules/hrms/mobile-attendance";
import { checkUserAcceptance } from "@/modules/hrms/user-agreement";
import { getFaceEnrollmentStatus } from "@/modules/hrms/face-enrollment";

export async function OPTIONS() {
  return mobileOptions();
}

export async function GET(request: Request) {
  try {
    const user = await getMobileUser(request);
    if (!user) return mobileJson({ error: "Unauthorized" }, 401);
    if (!user.orgId) return mobileJson({ error: "No organization" }, 400);

    const [attendanceStatus, agreementStatus, faceStatus] = await Promise.all([
      getAttendanceStatus(user.id, user.orgId),
      checkUserAcceptance(user.id, user.orgId),
      getFaceEnrollmentStatus(user.id),
    ]);

    return mobileJson({
      ok: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          designation: (user as any).designation,
        },
        attendance: attendanceStatus,
        agreement: {
          required: agreementStatus.required,
          accepted: agreementStatus.accepted,
          version: agreementStatus.agreement?.version,
        },
        face: faceStatus,
      },
    });
  } catch (error: any) {
    console.error("HRMS dashboard API error:", error);
    return mobileJson({ error: error.message ?? "Internal Server Error" }, 500);
  }
}

/**
 * HRMS Mobile Attendance History API
 *
 * GET: Paginated attendance history
 */
import { getMobileUser } from "@/lib/mobile-auth";
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";
import { getAttendanceHistory } from "@/modules/hrms/mobile-attendance";

export async function OPTIONS() {
  return mobileOptions();
}

export async function GET(request: Request) {
  try {
    const user = await getMobileUser(request);
    if (!user) return mobileJson({ error: "Unauthorized" }, 401);
    if (!user.orgId) return mobileJson({ error: "No organization" }, 400);

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);

    const history = await getAttendanceHistory(user.id, user.orgId, page, pageSize);
    return mobileJson({ ok: true, data: history });
  } catch (error: any) {
    return mobileJson({ error: error.message ?? "Failed to fetch attendance history" }, 500);
  }
}

import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { requirePermission, apiError } from "@/lib/rbac";
import { approveLeaveGrant } from "@/modules/leave/grants";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;
    await requirePermission(session!.user.id, "attendance.leave.manage");

    const { id } = await params;
    const grant = await approveLeaveGrant(id, session!.user.id);
    return ok(grant);
  } catch (error) {
    return apiError(error);
  }
}

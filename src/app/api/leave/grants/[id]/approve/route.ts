import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission, apiError } from "@/lib/rbac";
import { approveLeaveGrant, CrossOrgAccessError } from "@/modules/leave/grants";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;
    if (!session!.user.orgId) return err("User has no organisation", 400);
    await requirePermission(session!.user.id, "attendance.leave.manage");

    const { id } = await params;
    const grant = await approveLeaveGrant(id, session!.user.id, session!.user.orgId);
    return ok(grant);
  } catch (error) {
    if (error instanceof CrossOrgAccessError) return err(error.message, 403);
    return apiError(error);
  }
}

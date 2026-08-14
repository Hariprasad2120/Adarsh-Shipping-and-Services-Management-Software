import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { requirePermission, apiError } from "@/lib/rbac";
import { approveCompOffCredit } from "@/modules/leave/compoff";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;
    await requirePermission(session!.user.id, "attendance.leave.approve");

    const { id } = await params;
    const credit = await approveCompOffCredit(id, session!.user.id);
    return ok(credit);
  } catch (error) {
    return apiError(error);
  }
}

import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { requirePermission, apiError } from "@/lib/rbac";
import { archivePolicyVersion } from "@/modules/leave/policy";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;
    await requirePermission(session!.user.id, "attendance.leave.manage");

    const { id } = await params;
    const archived = await archivePolicyVersion(id, session!.user.orgId!, session!.user.id);
    return ok(archived);
  } catch (error) {
    return apiError(error);
  }
}

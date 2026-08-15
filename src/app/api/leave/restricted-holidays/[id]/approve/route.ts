import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { approveRestrictedHolidaySelection, RestrictedHolidayError } from "@/modules/leave/restricted-holidays";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  if (!session!.user.orgId) return err("User has no organisation", 400);
  await requirePermission(session!.user.id, "attendance.leave.approve");

  const { id } = await params;
  try {
    const selection = await approveRestrictedHolidaySelection(id, session!.user.id, session!.user.orgId);
    return ok(selection);
  } catch (approveError) {
    if (approveError instanceof RestrictedHolidayError) return err(approveError.message, 400);
    const message = approveError instanceof Error ? approveError.message : "Failed to approve";
    return err(message);
  }
}

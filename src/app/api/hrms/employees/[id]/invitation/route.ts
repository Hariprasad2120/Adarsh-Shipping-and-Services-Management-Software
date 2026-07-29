import { getSessionOrUnauth, err, ok } from "@/lib/api-helpers";
import { apiError, requirePermission } from "@/lib/rbac";
import { resendEmployeeInvitation } from "@/modules/hrms/employee-invitation";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  try {
    await requirePermission(session!.user.id, "hrms.employee.create");
    const { id } = await params;
    const result = await resendEmployeeInvitation({
      orgId: session!.user.orgId!,
      actorId: session!.user.id,
      userId: id,
    });
    return ok(result);
  } catch (caught) {
    if (
      caught instanceof Error &&
      [
        "Employee not found",
        "This employee has already activated their account",
      ].includes(caught.message)
    ) {
      return err(caught.message, caught.message === "Employee not found" ? 404 : 400);
    }
    return apiError(caught);
  }
}

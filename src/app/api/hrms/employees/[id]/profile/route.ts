import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { can, requirePermission } from "@/lib/rbac";
import {
  employeeSelfProfileUpdateSchema,
  employeeProfileUpdateSchema,
  updateEmployeeHrmsProfile,
  updateEmployeeSelfProfile,
} from "@/modules/hrms/employee-profile";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const canEditAll = await can(session!.user.id, "hrms.employee.edit");

    if (id === session!.user.id && !canEditAll) {
      const parsed = employeeSelfProfileUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return err(
          parsed.error.issues[0]?.message ?? "Invalid self-service profile",
          400,
        );
      }
      return ok(
        await updateEmployeeSelfProfile({
          orgId: session!.user.orgId!,
          userId: id,
          input: parsed.data,
        }),
      );
    }

    await requirePermission(session!.user.id, "hrms.employee.edit");
    const parsed = employeeProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return err(
        parsed.error.issues[0]?.message ?? "Invalid employee profile",
        400,
      );
    }
    const result = await updateEmployeeHrmsProfile({
      orgId: session!.user.orgId!,
      userId: id,
      actorId: session!.user.id,
      input: parsed.data,
    });
    return ok(result);
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Unable to update employee";
    return err(message, message === "Employee not found" ? 404 : 400);
  }
}

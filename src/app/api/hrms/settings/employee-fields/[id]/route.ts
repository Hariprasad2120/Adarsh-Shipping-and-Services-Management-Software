import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import {
  deleteEmployeeProfileField,
  employeeProfileFieldInputSchema,
  updateEmployeeProfileField,
} from "@/modules/hrms/employee-profile";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "hrms.settings.manage");

  const parsed = employeeProfileFieldInputSchema.safeParse(
    await request.json(),
  );
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid custom field", 400);
  }

  try {
    const { id } = await params;
    return ok(
      await updateEmployeeProfileField(
        session!.user.orgId!,
        id,
        parsed.data,
      ),
    );
  } catch (caught) {
    return err(
      caught instanceof Error ? caught.message : "Unable to update field",
      404,
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "hrms.settings.manage");

  try {
    const { id } = await params;
    await deleteEmployeeProfileField(session!.user.orgId!, id);
    return ok({ deleted: true });
  } catch (caught) {
    return err(
      caught instanceof Error ? caught.message : "Unable to delete field",
      404,
    );
  }
}

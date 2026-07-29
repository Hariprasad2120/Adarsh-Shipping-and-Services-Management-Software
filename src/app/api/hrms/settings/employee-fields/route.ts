import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import {
  createEmployeeProfileField,
  employeeProfileFieldInputSchema,
  listEmployeeProfileFields,
} from "@/modules/hrms/employee-profile";

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "hrms.settings.manage");

  return ok(
    await listEmployeeProfileFields(session!.user.orgId!, true),
  );
}

export async function POST(request: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "hrms.settings.manage");

  const parsed = employeeProfileFieldInputSchema.safeParse(
    await request.json(),
  );
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid custom field", 400);
  }

  return ok(
    await createEmployeeProfileField(session!.user.orgId!, parsed.data),
    201,
  );
}

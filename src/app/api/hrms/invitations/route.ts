import { NextRequest } from "next/server";
import { getSessionOrUnauth, err, ok } from "@/lib/api-helpers";
import { apiError, requirePermission } from "@/lib/rbac";
import {
  employeeInvitationInputSchema,
  inviteEmployee,
} from "@/modules/hrms/employee-invitation";

export async function POST(request: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  try {
    await requirePermission(session!.user.id, "hrms.employee.create");
    const parsed = employeeInvitationInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return err(
        parsed.error.issues[0]?.message ?? "Invalid employee invitation",
        400,
      );
    }

    const result = await inviteEmployee({
      orgId: session!.user.orgId!,
      actorId: session!.user.id,
      input: parsed.data,
    });
    const { passwordHash, ...safeUser } = result.user;
    void passwordHash;

    return ok(
      {
        user: safeUser,
        invitation: {
          id: result.invitation.id,
          deliveryStatus: result.invitation.deliveryStatus,
          expiresAt: result.invitation.expiresAt,
        },
      },
      201,
    );
  } catch (caught) {
    if (
      caught instanceof Error &&
      [
        "A user with this email already exists",
        "This employee ID is already in use",
        "Invalid branch",
        "Invalid department",
        "Invalid division",
        "Invalid reporting manager",
        "Invalid secondary reporting manager",
        "One or more roles do not belong to this organisation",
        "The organisation must have an Employee role",
      ].includes(caught.message)
    ) {
      return err(caught.message, 400);
    }
    return apiError(caught);
  }
}

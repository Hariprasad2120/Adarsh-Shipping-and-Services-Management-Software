import { NextRequest } from "next/server";
import { err, getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { apiError, requirePermission } from "@/lib/rbac";
import {
  basicEmployeeInvitationInputSchema,
  getEmployeeNumberSuggestion,
  inviteBasicEmployee,
} from "@/modules/hrms/employee-invitation";

const EXPECTED_INPUT_ERRORS = new Set([
  "A user with this email already exists",
  "This employee ID is already in use",
  "The organisation must have an Employee role",
]);

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  try {
    await requirePermission(session!.user.id, "hrms.employee.create");
    return ok(
      await getEmployeeNumberSuggestion(session!.user.orgId!),
    );
  } catch (caught) {
    return apiError(caught);
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  try {
    await requirePermission(session!.user.id, "hrms.employee.create");
    const parsed = basicEmployeeInvitationInputSchema.safeParse(
      await request.json(),
    );
    if (!parsed.success) {
      return err(
        parsed.error.issues[0]?.message ?? "Invalid employee details",
        400,
      );
    }

    const result = await inviteBasicEmployee({
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
    if (caught instanceof Error && EXPECTED_INPUT_ERRORS.has(caught.message)) {
      return err(caught.message, 400);
    }
    return apiError(caught);
  }
}

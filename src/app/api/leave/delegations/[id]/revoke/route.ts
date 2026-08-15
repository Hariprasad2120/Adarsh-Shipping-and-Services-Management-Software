import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { revokeDelegation } from "@/modules/leave/delegation";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  if (!session!.user.orgId) return err("User has no organisation", 400);

  const { id } = await params;

  // Only the delegator themself or an HR admin may revoke — a delegation
  // is the delegator's own authority being handed off, so this isn't a
  // pure attendance.leave.manage-gated action like other admin routes.
  const delegation = await db.leaveApproverDelegation.findUnique({ where: { id }, select: { delegatorId: true, orgId: true } });
  if (!delegation || delegation.orgId !== session!.user.orgId) return err("Delegation not found", 404);
  if (delegation.delegatorId !== session!.user.id) {
    const isAdmin = await can(session!.user.id, "attendance.leave.manage");
    if (!isAdmin) return err("Forbidden", 403);
  }

  try {
    const result = await revokeDelegation(id, session!.user.id, session!.user.orgId);
    return ok(result);
  } catch (revokeError) {
    const message = revokeError instanceof Error ? revokeError.message : "Failed to revoke delegation";
    return err(message);
  }
}

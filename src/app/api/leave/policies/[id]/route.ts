import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission, apiError } from "@/lib/rbac";
import { db } from "@/lib/db";

/** Full detail view of a single policy version, including its parsed
 *  configuration and applicability rules — used by the "View" action on
 *  the policies table, which previously had no way to see a version's
 *  actual settings after creation without going back through the wizard. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;
    await requirePermission(session!.user.id, "attendance.leave.manage");

    const { id } = await params;
    const version = await db.leavePolicyVersion.findUnique({
      where: { id },
      include: { applicabilityRules: true, leaveType: true },
    });
    if (!version) return err("Policy version not found", 404);

    return ok(version);
  } catch (error) {
    return apiError(error);
  }
}

/** Deletes a DRAFT version outright (published versions are immutable by
 *  design — spec §8 — and must be archived, not deleted, since real leave
 *  requests may already reference them). A draft that was never published
 *  has no requests against it, so a hard delete is safe. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;
    await requirePermission(session!.user.id, "attendance.leave.manage");

    const { id } = await params;
    const version = await db.leavePolicyVersion.findUnique({ where: { id } });
    if (!version) return err("Policy version not found", 404);
    if (version.status !== "DRAFT") {
      return err("Only draft versions can be deleted — published versions must be archived instead.");
    }

    await db.leavePolicyVersion.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}

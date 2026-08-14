import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { can, requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { cancelLeaveRequestPartial } from "@/modules/leave/request";

const BodySchema = z.object({
  reason: z.string().min(1, "Reason is required"),
  cancelFromDate: z.string().transform((s) => new Date(s)),
  cancelToDate: z.string().transform((s) => new Date(s)),
});

/**
 * Partial cancellation (spec §9) — cancels a leading or trailing portion
 * of an approved leave request, recalculating and reversing only the
 * delta rather than the whole reservation.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const { id } = await params;
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const request = await db.leaveRequest.findUnique({
    where: { id },
    select: { userId: true, user: { select: { orgId: true } } },
  });
  if (!request) return err("Leave request not found", 404);
  if (request.user.orgId !== session!.user.orgId) {
    return err("Leave request not found", 404);
  }

  const isOwner = request.userId === session!.user.id;
  const isAdmin = await can(session!.user.id, "attendance.leave.manage");
  if (!isOwner && !isAdmin) {
    await requirePermission(session!.user.id, "attendance.leave.manage");
  }

  try {
    const result = await cancelLeaveRequestPartial({
      requestId: id,
      actorId: session!.user.id,
      reason: parsed.data.reason,
      cancelFromDate: parsed.data.cancelFromDate,
      cancelToDate: parsed.data.cancelToDate,
    });
    return ok(result);
  } catch (partialCancelError) {
    const message = partialCancelError instanceof Error ? partialCancelError.message : "Failed to partially cancel";
    return err(message);
  }
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission, can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { cancelLeaveRequest } from "@/modules/leave/request";

const BodySchema = z.object({ reason: z.string().min(1, "Reason is required") });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const { id } = await params;
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const request = await db.leaveRequest.findUnique({ where: { id }, select: { userId: true } });
  if (!request) return err("Leave request not found", 404);

  const isOwner = request.userId === session!.user.id;
  const isAdmin = await can(session!.user.id, "attendance.leave.manage");
  if (!isOwner && !isAdmin) {
    await requirePermission(session!.user.id, "attendance.leave.manage");
  }

  const result = await cancelLeaveRequest(
    { requestId: id, actorId: session!.user.id, reason: parsed.data.reason },
    isAdmin,
  );
  return ok(result);
}

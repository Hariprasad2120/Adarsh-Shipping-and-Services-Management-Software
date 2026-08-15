import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { can, requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { requestEncashment, EncashmentNotAllowedError } from "@/modules/leave/encashment";

const BodySchema = z.object({
  userId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  units: z.number().positive(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  if (!session!.user.orgId) return err("User has no organisation", 400);

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const isSelf = parsed.data.userId === session!.user.id;
  const isAdmin = await can(session!.user.id, "attendance.leave.manage");
  if (!isSelf && !isAdmin) {
    await requirePermission(session!.user.id, "attendance.leave.manage");
  }

  const targetUser = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: { orgId: true },
  });
  if (!targetUser || targetUser.orgId !== session!.user.orgId) {
    return err("Employee not found", 404);
  }

  try {
    const result = await requestEncashment({
      orgId: session!.user.orgId,
      userId: parsed.data.userId,
      leaveTypeId: parsed.data.leaveTypeId,
      units: parsed.data.units,
      actorId: session!.user.id,
      source: isSelf ? "EMPLOYEE_INITIATED" : "HR_INITIATED",
    });
    return ok(result, 201);
  } catch (encashmentError) {
    if (encashmentError instanceof EncashmentNotAllowedError) {
      return err(encashmentError.message, 400);
    }
    const message = encashmentError instanceof Error ? encashmentError.message : "Failed to process encashment";
    return err(message);
  }
}

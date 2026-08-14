import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission, apiError } from "@/lib/rbac";
import { createLeaveGrant } from "@/modules/leave/grants";

const BodySchema = z.object({
  userId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  amount: z.number().positive(),
  effectiveDate: z.string().transform((s) => new Date(s)),
  expiryDate: z.string().optional().transform((s) => (s ? new Date(s) : undefined)),
  reason: z.string().min(3),
  requiresApproval: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;
    if (!session!.user.orgId) return err("User has no organisation", 400);
    await requirePermission(session!.user.id, "attendance.leave.manage");

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return err("Invalid input");

    const grant = await createLeaveGrant({
      orgId: session!.user.orgId,
      userId: parsed.data.userId,
      leaveTypeId: parsed.data.leaveTypeId,
      amount: parsed.data.amount,
      effectiveDate: parsed.data.effectiveDate,
      expiryDate: parsed.data.expiryDate,
      reason: parsed.data.reason,
      grantedById: session!.user.id,
      requiresApproval: parsed.data.requiresApproval,
    });
    return ok(grant);
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") return apiError(error);
    const message = error instanceof Error ? error.message : "Bad request";
    return err(message);
  }
}

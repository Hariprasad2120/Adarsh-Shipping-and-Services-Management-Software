import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { repairBalanceDrift } from "@/modules/leave/reconciliation";

const BodySchema = z.object({
  userId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  year: z.number().int(),
  reason: z.string().min(3, "Reason is required for a reconciliation repair"),
});

/**
 * Controlled repair action (spec §30) — never runs automatically. Requires
 * an explicit reason and authorized admin. Corrects the materialized
 * balance to match the ledger (the ledger is always authoritative), by
 * posting a real ADJUSTMENT ledger entry, never a direct balance write.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  if (!session!.user.orgId) return err("User has no organisation", 400);
  await requirePermission(session!.user.id, "attendance.leave.manage");

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  const targetUser = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: { orgId: true },
  });
  if (!targetUser || targetUser.orgId !== session!.user.orgId) {
    return err("Employee not found", 404);
  }

  const result = await repairBalanceDrift(
    session!.user.orgId,
    parsed.data.userId,
    parsed.data.leaveTypeId,
    parsed.data.year,
    session!.user.id,
    parsed.data.reason,
  );
  return ok(result);
}

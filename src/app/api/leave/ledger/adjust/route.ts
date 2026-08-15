import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission, apiError } from "@/lib/rbac";
import { postLedgerEntry } from "@/modules/leave/ledger";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";

const BodySchema = z.object({
  userId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  quantity: z.number().refine((v) => v !== 0, "Quantity cannot be zero"),
  year: z.number().int(),
  reason: z.string().min(3, "Reason is required for manual adjustments"),
});

/**
 * HR/admin manual balance adjustment (spec §30) — always requires a reason,
 * always creates a ledger entry (MANUAL_CREDIT/MANUAL_DEBIT), never
 * silently mutates the balance directly.
 */
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;
    if (!session!.user.orgId) return err("User has no organisation", 400);
    await requirePermission(session!.user.id, "attendance.leave.manage");

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

    // Verify the target employee and leave type actually belong to the
    // actor's own organisation — without this, any admin with
    // attendance.leave.manage in ANY org could post an adjustment against
    // an arbitrary userId/leaveTypeId in a different org (found during the
    // closure-pass authorization audit, §12/13).
    const [targetUser, targetLeaveType] = await Promise.all([
      db.user.findUnique({ where: { id: parsed.data.userId }, select: { orgId: true } }),
      db.leaveType.findUnique({ where: { id: parsed.data.leaveTypeId }, select: { orgId: true } }),
    ]);
    if (!targetUser || targetUser.orgId !== session!.user.orgId) {
      return err("Employee not found", 404);
    }
    if (!targetLeaveType || targetLeaveType.orgId !== session!.user.orgId) {
      return err("Leave type not found", 404);
    }

    const entry = await postLedgerEntry({
      orgId: session!.user.orgId,
      userId: parsed.data.userId,
      leaveTypeId: parsed.data.leaveTypeId,
      type: parsed.data.quantity > 0 ? "MANUAL_CREDIT" : "MANUAL_DEBIT",
      quantity: parsed.data.quantity,
      effectiveDate: new Date(),
      year: parsed.data.year,
      source: "ADMIN",
      actorId: session!.user.id,
      reason: parsed.data.reason,
      idempotencyKey: `manual-adjust:${session!.user.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      allowNegative: true,
    });

    // Notification coverage audit (§36) flagged manual adjustments as a
    // missing lifecycle notification — the employee whose balance was
    // touched should know, not just see it silently reflected next login.
    await notify({
      userId: parsed.data.userId,
      orgId: session!.user.orgId,
      kind: "LEAVE_BALANCE_ADJUSTED",
      title: "Leave balance adjusted",
      body: `Your leave balance was manually adjusted by ${parsed.data.quantity > 0 ? "+" : ""}${parsed.data.quantity} unit(s). Reason: ${parsed.data.reason}`,
      link: "/attendance/leaves",
      payload: { ledgerEntryId: entry.id },
    });

    return ok(entry, 201);
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") return apiError(error);
    const message = error instanceof Error ? error.message : "Bad request";
    return err(message);
  }
}

export async function GET(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  if (!session!.user.orgId) return err("User has no organisation", 400);
  await requirePermission(session!.user.id, "attendance.leave.manage");

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const leaveTypeId = searchParams.get("leaveTypeId");
  if (!userId || !leaveTypeId) return err("userId and leaveTypeId are required");

  // orgId is included directly in the where clause (LeaveLedgerEntry
  // carries its own orgId column) rather than trusted from the query
  // string — without this, this endpoint returned any org's ledger
  // history to any admin (closure-pass authorization audit, §12/13, §21
  // IDOR testing).
  const entries = await db.leaveLedgerEntry.findMany({
    where: { userId, leaveTypeId, orgId: session!.user.orgId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return ok(entries);
}

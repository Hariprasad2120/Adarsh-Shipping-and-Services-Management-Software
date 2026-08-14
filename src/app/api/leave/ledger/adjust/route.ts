import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission, apiError } from "@/lib/rbac";
import { postLedgerEntry } from "@/modules/leave/ledger";
import { db } from "@/lib/db";

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
  await requirePermission(session!.user.id, "attendance.leave.manage");

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const leaveTypeId = searchParams.get("leaveTypeId");
  if (!userId || !leaveTypeId) return err("userId and leaveTypeId are required");

  const entries = await db.leaveLedgerEntry.findMany({
    where: { userId, leaveTypeId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return ok(entries);
}

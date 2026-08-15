import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { createDelegation, listActiveDelegations } from "@/modules/leave/delegation";

const BodySchema = z.object({
  delegateId: z.string().min(1),
  effectiveFrom: z.string().transform((s) => new Date(s)),
  effectiveTo: z.string().optional().transform((s) => (s ? new Date(s) : undefined)),
  reason: z.string().optional(),
});

/**
 * Backup approver / delegation (spec §11). A manager delegates their own
 * approval authority to someone else (e.g. while on leave themselves) —
 * self-service, not an HR-admin-only action, so only requires the actor
 * to be delegating their OWN approvals (delegatorId is always the caller).
 */
export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  if (!session!.user.orgId) return err("User has no organisation", 400);

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const delegate = await db.user.findUnique({
    where: { id: parsed.data.delegateId },
    select: { orgId: true },
  });
  if (!delegate || delegate.orgId !== session!.user.orgId) {
    return err("Delegate not found", 404);
  }

  try {
    const delegation = await createDelegation({
      orgId: session!.user.orgId,
      delegatorId: session!.user.id,
      delegateId: parsed.data.delegateId,
      effectiveFrom: parsed.data.effectiveFrom,
      effectiveTo: parsed.data.effectiveTo,
      reason: parsed.data.reason,
      createdById: session!.user.id,
    });
    return ok(delegation, 201);
  } catch (createError) {
    const message = createError instanceof Error ? createError.message : "Failed to create delegation";
    return err(message);
  }
}

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  if (!session!.user.orgId) return err("User has no organisation", 400);

  return ok(await listActiveDelegations(session!.user.orgId));
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { getActivePolicyVersion, parsePolicyConfig } from "@/modules/leave/policy";
import { calculateLeaveRequest } from "@/modules/leave/calculation";

const BodySchema = z.object({
  leaveTypeId: z.string().min(1),
  fromDate: z.string().transform((s) => new Date(s)),
  toDate: z.string().transform((s) => new Date(s)),
  halfDay: z.boolean().optional().default(false),
});

/**
 * Server-side calculation preview endpoint (spec §18/§38) — the frontend
 * calls this before submission to show the calculation summary. Submission
 * itself always recalculates server-side again; this endpoint never
 * mutates state.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  if (!session!.user.orgId) return err("User has no organisation", 400);

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const policyVersion = await getActivePolicyVersion(parsed.data.leaveTypeId, parsed.data.fromDate);
  if (!policyVersion) {
    return err("No published policy version is active for this leave type.", 404);
  }

  const config = parsePolicyConfig(policyVersion.configuration);

  const calculation = await calculateLeaveRequest({
    orgId: session!.user.orgId,
    userId: session!.user.id,
    leaveTypeId: parsed.data.leaveTypeId,
    policyVersionId: policyVersion.id,
    config,
    classification: policyVersion.classification as
      | "PAID"
      | "UNPAID"
      | "ON_DUTY"
      | "RESTRICTED_HOLIDAY"
      | "PARTIALLY_PAID",
    roundingMode: policyVersion.roundingMode,
    roundingIncrement: policyVersion.roundingIncrement,
    fromDate: parsed.data.fromDate,
    toDate: parsed.data.toDate,
    halfDay: parsed.data.halfDay,
  });

  return ok(calculation);
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission, apiError } from "@/lib/rbac";
import { checkPolicyCompliance } from "@/modules/leave/compliance";

const QuerySchema = z.object({
  country: z.string().min(1),
  state: z.string().optional(),
  leaveCategory: z.string().min(1),
});

/**
 * Compares a policy version against applicable statutory compliance
 * templates for a jurisdiction, flagging (not blocking) configurations
 * below the statutory minimum. Spec §27: "flag configurations that appear
 * below a statutory minimum" / "do not silently claim legal compliance."
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;
    await requirePermission(session!.user.id, "attendance.leave.manage");

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      country: searchParams.get("country"),
      state: searchParams.get("state") ?? undefined,
      leaveCategory: searchParams.get("leaveCategory"),
    });
    if (!parsed.success) return err("country and leaveCategory query params are required");

    const results = await checkPolicyCompliance(
      id,
      session!.user.orgId!,
      parsed.data.country,
      parsed.data.state ?? null,
      parsed.data.leaveCategory,
    );
    return ok(results);
  } catch (error) {
    return apiError(error);
  }
}

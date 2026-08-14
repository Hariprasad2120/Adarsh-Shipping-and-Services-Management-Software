import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission, apiError } from "@/lib/rbac";
import { rejectCompOffCredit } from "@/modules/leave/compoff";

const BodySchema = z.object({ reason: z.string().optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;
    await requirePermission(session!.user.id, "attendance.leave.approve");

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return err("Invalid input");

    const { id } = await params;
    const credit = await rejectCompOffCredit(id, session!.user.id, parsed.data.reason);
    return ok(credit);
  } catch (error) {
    return apiError(error);
  }
}

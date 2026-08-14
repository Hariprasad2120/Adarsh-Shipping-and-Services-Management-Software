import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { decideLeaveRequest } from "@/modules/attendance/service";
import { CrossOrgAccessError } from "@/modules/leave/ledger";
import { z } from "zod";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "attendance.leave.approve");

  const { id } = await params;
  const parsed = z.object({ decision: z.enum(["approved", "rejected"]) }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  try {
    return ok(await decideLeaveRequest(id, session!.user.id, parsed.data.decision));
  } catch (decisionError) {
    if (decisionError instanceof CrossOrgAccessError) return err(decisionError.message, 403);
    throw decisionError;
  }
}

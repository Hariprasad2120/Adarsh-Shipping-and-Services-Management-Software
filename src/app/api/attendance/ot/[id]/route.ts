import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { decideOT } from "@/modules/attendance/service";
import { z } from "zod";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "attendance.ot.approve");

  const { id } = await params;
  const parsed = z.object({ decision: z.enum(["approved", "rejected"]) }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  return ok(await decideOT(id, session!.user.id, parsed.data.decision));
}

import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { getLeaveTypes, createLeaveType } from "@/modules/attendance/service";
import { z } from "zod";

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  return ok(await getLeaveTypes(session!.user.orgId!));
}

export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "attendance.leave.manage");

  const parsed = z.object({
    name: z.string().min(1),
    paid: z.boolean().default(true),
    defaultBalance: z.number().min(0),
  }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  return ok(await createLeaveType(session!.user.orgId!, parsed.data), 201);
}

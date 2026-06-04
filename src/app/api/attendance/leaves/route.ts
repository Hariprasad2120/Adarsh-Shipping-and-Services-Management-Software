import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { createLeaveRequest, getLeaveRequests } from "@/modules/attendance/service";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "true";

  const requests = await getLeaveRequests(session!.user.orgId!, {
    userId: mine ? session!.user.id : searchParams.get("userId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    approverId: searchParams.get("approverId") ?? undefined,
  });

  return ok(requests);
}

const createSchema = z.object({
  leaveTypeId: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
  halfDay: z.boolean().default(false),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "attendance.leave.request");

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const request = await createLeaveRequest(session!.user.id, {
    ...parsed.data,
    fromDate: new Date(parsed.data.fromDate),
    toDate: new Date(parsed.data.toDate),
  });

  return ok(request, 201);
}

import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { getHolidays, createHoliday } from "@/modules/attendance/service";
import { getNow } from "@/lib/clock";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? (await getNow()).getFullYear());
  return ok(await getHolidays(session!.user.orgId!, year));
}

export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "attendance.holidays.manage");

  const parsed = z.object({
    date: z.string(),
    name: z.string().min(1),
    branchId: z.string().optional(),
  }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  return ok(await createHoliday(session!.user.orgId!, {
    date: new Date(parsed.data.date),
    name: parsed.data.name,
    branchId: parsed.data.branchId,
  }), 201);
}

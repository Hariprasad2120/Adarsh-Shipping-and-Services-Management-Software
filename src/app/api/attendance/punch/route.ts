import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { punchIn, punchOut, getMonthAttendance } from "@/modules/attendance/service";
import { getNow } from "@/lib/clock";
import { getAttendanceDateParts, toAttendanceDate } from "@/lib/attendance-date";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? session!.user.id;
  const now = await getNow();
  const today = getAttendanceDateParts(now);
  const year = Number(searchParams.get("year") ?? today.year);
  const month = Number(searchParams.get("month") ?? today.month);

  return ok(await getMonthAttendance(userId, year, month));
}

export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const parsed = z.object({
    action: z.enum(["in", "out"]),
    date: z.string().optional(),
    userId: z.string().optional(),
  }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const { action, date, userId } = parsed.data;

  // If punching for another user, require manage permission
  const targetId = userId ?? session!.user.id;
  if (targetId !== session!.user.id) {
    await requirePermission(session!.user.id, "attendance.punch.manage");
  } else {
    await requirePermission(session!.user.id, "attendance.punch.self");
  }

  const d = toAttendanceDate(date ? new Date(date) : await getNow());

  const punch = action === "in" ? await punchIn(targetId, d) : await punchOut(targetId, d);
  return ok(punch);
}

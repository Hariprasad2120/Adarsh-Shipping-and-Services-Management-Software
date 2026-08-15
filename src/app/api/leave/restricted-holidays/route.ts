import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { selectRestrictedHoliday, listAvailableRestrictedHolidays, RestrictedHolidayError } from "@/modules/leave/restricted-holidays";
import { db } from "@/lib/db";

const BodySchema = z.object({
  holidayId: z.string().min(1),
  leaveTypeId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  if (!session!.user.orgId) return err("User has no organisation", 400);

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year")) || new Date().getFullYear();

  const user = await db.user.findUnique({ where: { id: session!.user.id }, select: { branchId: true } });
  const holidays = await listAvailableRestrictedHolidays(session!.user.orgId, user?.branchId ?? null, year);
  return ok(holidays);
}

export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  if (!session!.user.orgId) return err("User has no organisation", 400);

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  try {
    const selection = await selectRestrictedHoliday({
      orgId: session!.user.orgId,
      userId: session!.user.id,
      holidayId: parsed.data.holidayId,
      leaveTypeId: parsed.data.leaveTypeId,
    });
    return ok(selection, 201);
  } catch (selectionError) {
    if (selectionError instanceof RestrictedHolidayError) return err(selectionError.message, 400);
    const message = selectionError instanceof Error ? selectionError.message : "Failed to select holiday";
    return err(message);
  }
}

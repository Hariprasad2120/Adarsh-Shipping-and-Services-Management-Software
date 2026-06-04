import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { createOTEntry, getOTEntries } from "@/modules/attendance/service";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "true";

  return ok(await getOTEntries(session!.user.orgId!, {
    userId: mine ? session!.user.id : undefined,
    status: searchParams.get("status") ?? undefined,
  }));
}

export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "attendance.ot.request");

  const parsed = z.object({
    date: z.string(),
    hours: z.number().min(0.5).max(12),
    notes: z.string().optional(),
  }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  return ok(await createOTEntry(session!.user.id, {
    date: new Date(parsed.data.date),
    hours: parsed.data.hours,
    notes: parsed.data.notes,
  }), 201);
}

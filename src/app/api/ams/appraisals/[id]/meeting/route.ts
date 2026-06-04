import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { confirmMeeting, startMeeting, closeMeeting } from "@/modules/ams/service";
import { z } from "zod";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const { id } = await params;
  const parsed = z.object({
    action: z.enum(["confirm", "start", "close"]),
    scheduledAt: z.string().optional(),
  }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const { action, scheduledAt } = parsed.data;

  if (action === "confirm") {
    await requirePermission(session!.user.id, "ams.meeting.confirm");
    if (!scheduledAt) return err("scheduledAt required");
    await confirmMeeting(id, session!.user.id, new Date(scheduledAt));
  } else if (action === "start") {
    await requirePermission(session!.user.id, "ams.meeting.confirm");
    await startMeeting(id);
  } else {
    await requirePermission(session!.user.id, "ams.meeting.confirm");
    await closeMeeting(id);
  }

  return ok({ done: true });
}

import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { can, requirePermission } from "@/lib/rbac";
import { requestMeetingReschedule, decideMeetingReschedule } from "@/modules/ams/service";
import { z } from "zod";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request"),
    newDate: z.string().min(1),
    reason: z.string().min(1).max(2000),
  }),
  z.object({
    action: z.literal("decide"),
    rescheduleId: z.string().min(1),
    approve: z.boolean(),
  }),
]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  try {
    if (parsed.data.action === "request") {
      // Assigned reviewers, HR, and management can raise a request.
      const allowed =
        (await can(session!.user.id, "ams.meeting.confirm")) ||
        (await can(session!.user.id, "ams.appraisal.management_review")) ||
        (await can(session!.user.id, "ams.appraisal.review"));
      if (!allowed) return err("Forbidden", 403);

      const newDate = new Date(parsed.data.newDate);
      if (Number.isNaN(newDate.getTime())) return err("Invalid date");
      await requestMeetingReschedule(id, session!.user.id, newDate, parsed.data.reason);
      return ok({ requested: true });
    }

    await requirePermission(session!.user.id, "ams.meeting.confirm");
    await decideMeetingReschedule(parsed.data.rescheduleId, session!.user.id, parsed.data.approve);
    return ok({ decided: true });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Reschedule action failed");
  }
}

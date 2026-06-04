import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { addMeetingMinute } from "@/modules/ams/service";
import { z } from "zod";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "ams.meeting.minutes");

  const { id } = await params;
  const parsed = z.object({
    role: z.enum(["HR", "MANAGEMENT", "EMPLOYEE"]),
    content: z.string().min(1),
  }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  return ok(await addMeetingMinute(id, session!.user.id, parsed.data.role, parsed.data.content));
}

import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { castMeetingDateVote, assertAppraisalInOrg } from "@/modules/ams/service";
import { z } from "zod";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "ams.appraisal.review");

  const { id } = await params;
  await assertAppraisalInOrg(id, session!.user.orgId);
  const parsed = z
    .object({
      votedDate: z.string().min(1),
      comment: z.string().max(1000).optional(),
    })
    .safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const votedDate = new Date(parsed.data.votedDate);
  if (Number.isNaN(votedDate.getTime())) return err("Invalid date");

  try {
    await castMeetingDateVote(id, session!.user.id, votedDate, parsed.data.comment);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to record vote");
  }
  return ok({ voted: true });
}

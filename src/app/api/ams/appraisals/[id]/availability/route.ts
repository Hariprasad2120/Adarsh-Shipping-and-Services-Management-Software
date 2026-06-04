import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { can } from "@/lib/rbac";
import { setReviewerAvailability } from "@/modules/ams/service";
import { z } from "zod";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const { id } = await params;
  const parsed = z.object({
    available: z.boolean(),
    force: z.boolean().default(false),
    userId: z.string().optional(),
  }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const { available, force, userId } = parsed.data;
  const targetId = userId ?? session!.user.id;

  if (force) {
    const canForce = await can(session!.user.id, "ams.appraisal.force_reviewer");
    if (!canForce) return err("Forbidden", 403);
  }

  await setReviewerAvailability(id, targetId, available, force);
  return ok({ updated: true });
}

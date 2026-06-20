import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { assignReviewers } from "@/modules/ams/service";
import { z } from "zod";

const schema = z.object({
  reviewers: z.array(z.object({
    userId: z.string(),
    kind: z.enum(["HR", "TL", "MANAGER"]),
  })),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "ams.appraisal.assign_reviewers");

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  try {
    await assignReviewers(id, parsed.data.reviewers, session!.user.id);
    return ok({ assigned: true });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Unable to assign reviewers.";
    return err(message);
  }
}

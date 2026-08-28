import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { submitReviewerRatingReview } from "@/modules/ams/service";
import { z } from "zod";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "ams.appraisal.review");

  const { id } = await params;
  const parsed = z
    .object({
      action: z.enum(["DRAFT", "SUBMITTED"]),
      selfEval: z.enum(["AGREE", "OVERRATED", "UNDERRATED"]),
      revisedCategoryPoints: z.record(z.string(), z.coerce.number().min(0).max(100)).optional(),
      reason: z.string().max(2000).optional(),
    })
    .safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  try {
    await submitReviewerRatingReview(
      id,
      session!.user.id,
      {
        selfEval: parsed.data.selfEval,
        revisedCategoryPoints: parsed.data.revisedCategoryPoints,
        reason: parsed.data.reason,
      },
      parsed.data.action,
    );
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to save rating review");
  }
  return ok({ submitted: parsed.data.action === "SUBMITTED" });
}

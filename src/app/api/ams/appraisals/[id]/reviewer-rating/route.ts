import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { submitReviewerRating } from "@/modules/ams/service";
import { z } from "zod";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "ams.appraisal.review");

  const { id } = await params;
  const parsed = z
    .object({
      action: z.enum(["DRAFT", "SUBMITTED"]),
      ratings: z.object({
        version: z.literal("v2"),
        categoryPoints: z.record(z.string(), z.number().min(1).max(5)).default({}),
        subItemRatings: z.record(z.string(), z.record(z.string(), z.number().min(1).max(5))).default({}),
        comments: z.record(z.string(), z.string()).default({}),
      }),
      overallComments: z.string().optional(),
    })
    .safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  await submitReviewerRating(id, session!.user.id, parsed.data.ratings, parsed.data.action, parsed.data.overallComments);
  return ok({ submitted: parsed.data.action === "SUBMITTED" });
}

import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { can, requirePermission } from "@/lib/rbac";
import { computeAppraisalScore } from "@/modules/ams/service";
import { z } from "zod";

const ratingsSchema = z.object({
  version: z.literal("v2"),
  categoryPoints: z.record(z.string(), z.number().min(1).max(5)).default({}),
  subItemRatings: z.record(z.string(), z.record(z.string(), z.number().min(1).max(5))).default({}),
  responses: z.record(
    z.string(),
    z.record(z.string(), z.object({
      value: z.string().optional(),
      option: z.string().optional(),
      explanation: z.string().optional(),
    })),
  ).optional(),
  comments: z.record(z.string(), z.string()).default({}),
  previousCategoryPoints: z.record(z.string(), z.number().min(1).max(5)).optional(),
  previousSubItemRatings: z.record(z.string(), z.record(z.string(), z.number().min(1).max(5))).optional(),
  changeReasons: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const canManage = await can(session!.user.id, "ams.appraisal.management_review");
  const canViewAll = await can(session!.user.id, "ams.appraisal.view_all");
  if (!canManage && !canViewAll) {
    await requirePermission(session!.user.id, "ams.appraisal.management_review");
  }

  const { id } = await params;
  const parsed = z.object({ ratings: ratingsSchema }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const preview = await computeAppraisalScore(id, parsed.data.ratings);
  return ok(preview);
}

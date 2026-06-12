import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { submitManagementReview } from "@/modules/ams/service";
import { z } from "zod";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "ams.appraisal.management_review");

  const { id } = await params;
  const parsed = z
    .object({
      action: z.enum(["DRAFT", "SUBMITTED"]),
      ratings: z.object({
        version: z.literal("v2"),
        categoryPoints: z.record(z.string(), z.number().min(1).max(5)).default({}),
        subItemRatings: z.record(z.string(), z.record(z.string(), z.number().min(1).max(5))).default({}),
        comments: z.record(z.string(), z.string()).default({}),
        previousCategoryPoints: z.record(z.string(), z.number().min(1).max(5)).optional(),
        previousSubItemRatings: z.record(z.string(), z.record(z.string(), z.number().min(1).max(5))).optional(),
        changeReasons: z.record(z.string(), z.string()).optional(),
      }),
      proposedDates: z.array(z.string()),
    })
    .safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  await submitManagementReview(
    id,
    session!.user.id,
    parsed.data.ratings,
    parsed.data.proposedDates.map((d) => new Date(d)),
    parsed.data.action,
  );
  return ok({ submitted: parsed.data.action === "SUBMITTED" });
}

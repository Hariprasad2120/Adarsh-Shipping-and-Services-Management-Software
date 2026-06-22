import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { moveApplicationStage } from "@/modules/recruit/employer-service";
import { RECRUIT_APP_STAGES } from "@/modules/recruit/types";

const schema = z.object({
  stage: z.enum(RECRUIT_APP_STAGES),
  reason: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.application.manage");

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input: " + parsed.error.message);

  try {
    const result = await moveApplicationStage(
      session!.user.orgId!,
      id,
      session!.user.id,
      parsed.data.stage,
      parsed.data.reason
    );
    return ok(result);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Stage move failed");
  }
}

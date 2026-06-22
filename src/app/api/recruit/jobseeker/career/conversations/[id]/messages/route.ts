import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { addCareerMessage } from "@/modules/recruit/jobseeker-service";

const createSchema = z.object({
  content: z.string().min(1).max(50000),
  role: z.enum(["USER", "ASSISTANT"]).default("USER"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.jobseeker.use");

  const { id } = await params;
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input: " + parsed.error.message);

  const message = await addCareerMessage(session!.user.id, id, parsed.data.role, parsed.data.content);
  return ok({ message }, 201);
}

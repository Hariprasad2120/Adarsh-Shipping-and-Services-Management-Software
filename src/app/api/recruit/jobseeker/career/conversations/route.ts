import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { listCareerConversations, getConversation, getOrCreateJobSeekerProfile } from "@/modules/recruit/jobseeker-service";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.jobseeker.use");

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const conv = await getConversation(session!.user.id, id);
    if (!conv) return err("Not found", 404);
    return ok(conv);
  }
  return ok(await listCareerConversations(session!.user.id));
}

const createSchema = z.object({ title: z.string().min(1).max(300) });

export async function POST(req: NextRequest) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.jobseeker.use");

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input: " + parsed.error.message);

  const ownerId = session!.user.id;
  const profile = await getOrCreateJobSeekerProfile(ownerId);

  const conv = await db.recruitCareerConversation.create({
    data: { ownerId, profileId: profile.id, title: parsed.data.title },
  });
  return ok(conv, 201);
}

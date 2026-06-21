import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { listApplications, createApplication } from "@/modules/recruit/employer-service";

export async function GET(req: NextRequest) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.application.manage");

  const { searchParams } = new URL(req.url);
  return ok(
    await listApplications(session!.user.orgId!, {
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 25),
      search: searchParams.get("search") ?? undefined,
      stage: searchParams.get("stage") ?? undefined,
      jobOpeningId: searchParams.get("jobOpeningId") ?? undefined,
      candidateId: searchParams.get("candidateId") ?? undefined,
    })
  );
}

const createSchema = z.object({
  jobOpeningId: z.string(),
  candidateId: z.string(),
  source: z.string().max(100).optional(),
  resumeVersionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.application.manage");

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input: " + parsed.error.message);

  try {
    const application = await createApplication(session!.user.orgId!, session!.user.id, parsed.data);
    return ok(application, 201);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to create application");
  }
}

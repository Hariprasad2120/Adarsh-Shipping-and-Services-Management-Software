import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { listJsApplications, createJsApplication } from "@/modules/recruit/jobseeker-service";

export async function GET(req: NextRequest) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.jobseeker.application.manage");

  const { searchParams } = new URL(req.url);
  return ok(
    await listJsApplications(session!.user.id, {
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 25),
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    })
  );
}

const createSchema = z.object({
  jobTitle: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  listingId: z.string().optional(),
  internalJobId: z.string().optional(),
  source: z.string().max(100).optional(),
  applicationUrl: z.string().url().max(1000).optional(),
  resumeVersionId: z.string().optional(),
  privateStatus: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.jobseeker.application.manage");

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input: " + parsed.error.message);

  const application = await createJsApplication(session!.user.id, parsed.data);
  return ok(application, 201);
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { listJobOpenings, createJobOpening } from "@/modules/recruit/employer-service";

export async function GET(req: NextRequest) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.view");

  const { searchParams } = new URL(req.url);
  return ok(
    await listJobOpenings(session!.user.orgId!, {
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 25),
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    })
  );
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  internalCode: z.string().max(50).optional(),
  departmentId: z.string().optional(),
  designationText: z.string().max(100).optional(),
  branchId: z.string().optional(),
  location: z.string().max(200).optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]).optional(),
  workplaceType: z.enum(["ONSITE", "HYBRID", "REMOTE"]).optional(),
  openings: z.number().int().min(1).max(999).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  targetJoiningDate: z.string().optional(),
  hiringManagerId: z.string().optional(),
  experienceMin: z.number().min(0).optional(),
  experienceMax: z.number().min(0).optional(),
  educationRequired: z.string().max(200).optional(),
  mandatorySkills: z.array(z.string()).max(30).optional(),
  preferredSkills: z.array(z.string()).max(30).optional(),
  responsibilities: z.string().max(10000).optional(),
  compensationMin: z.number().min(0).optional(),
  compensationMax: z.number().min(0).optional(),
  compensationCcy: z.string().length(3).optional(),
  sourcingChannels: z.array(z.string()).optional(),
  closingDate: z.string().optional(),
  jobDescriptionHtml: z.string().max(100000).optional(),
  requirementsJson: z.unknown().optional(),
  screeningQuestions: z.unknown().optional(),
  interviewPlanJson: z.unknown().optional(),
});

export async function POST(req: NextRequest) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.job.create");

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input: " + parsed.error.message);

  const data = parsed.data;
  const job = await createJobOpening(session!.user.orgId!, session!.user.id, {
    ...data,
    targetJoiningDate: data.targetJoiningDate ? new Date(data.targetJoiningDate) : undefined,
    closingDate: data.closingDate ? new Date(data.closingDate) : undefined,
  });

  return ok(job, 201);
}

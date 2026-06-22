import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { listCandidates, createCandidate, checkDuplicates } from "@/modules/recruit/employer-service";

export async function GET(req: NextRequest) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.candidate.view");

  const { searchParams } = new URL(req.url);
  return ok(
    await listCandidates(session!.user.orgId!, {
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 25),
      search: searchParams.get("search") ?? undefined,
    })
  );
}

const createSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(20).optional(),
  currentLocation: z.string().max(200).optional(),
  preferredLocation: z.string().max(200).optional(),
  currentCompany: z.string().max(200).optional(),
  currentTitle: z.string().max(200).optional(),
  totalExperienceYears: z.number().min(0).max(60).optional(),
  relevantExpYears: z.number().min(0).max(60).optional(),
  noticePeriodDays: z.number().int().min(0).max(365).optional(),
  currentCompensation: z.number().min(0).optional(),
  expectedCompensation: z.number().min(0).optional(),
  skills: z.array(z.string().max(100)).max(50).optional(),
  workAuthorization: z.string().max(100).optional(),
  source: z.string().max(100).optional(),
  sourceDetail: z.string().max(500).optional(),
  consentStatus: z.enum(["PENDING", "GIVEN", "WITHDRAWN"]).optional(),
  checkDuplicates: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.candidate.create");

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input: " + parsed.error.message);

  const orgId = session!.user.orgId!;
  const { checkDuplicates: doCheck, ...input } = parsed.data;

  if (doCheck) {
    const dupes = await checkDuplicates(orgId, { email: input.email, phone: input.phone });
    if (dupes.length > 0) {
      return ok({ duplicates: dupes, candidate: null }, 200);
    }
  }

  const candidate = await createCandidate(orgId, session!.user.id, input);
  return ok({ duplicates: [], candidate }, 201);
}

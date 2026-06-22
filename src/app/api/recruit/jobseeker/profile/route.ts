import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { getOrCreateJobSeekerProfile, updateJobSeekerProfile } from "@/modules/recruit/jobseeker-service";

export async function GET() {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.jobseeker.use");

  const profile = await getOrCreateJobSeekerProfile(session!.user.id);
  return ok(profile);
}

const updateSchema = z.object({
  preferredRoles: z.array(z.string()).max(20).optional(),
  preferredIndustries: z.array(z.string()).max(20).optional(),
  preferredLocations: z.array(z.string()).max(20).optional(),
  workplacePreference: z.enum(["REMOTE", "HYBRID", "ONSITE", "ANY"]).optional(),
  employmentTypes: z.array(z.string()).max(10).optional(),
  seniority: z.string().max(50).optional().nullable(),
  totalExpYears: z.number().min(0).max(60).optional().nullable(),
  skills: z.array(z.string()).max(100).optional(),
  workAuthorization: z.string().max(100).optional().nullable(),
  noticePeriodDays: z.number().int().min(0).max(365).optional().nullable(),
  compensationMin: z.number().min(0).optional().nullable(),
  compensationMax: z.number().min(0).optional().nullable(),
  compensationCcy: z.string().length(3).optional(),
  relocationOpen: z.boolean().optional(),
  excludedCompanies: z.array(z.string()).max(50).optional(),
  jobKeywords: z.array(z.string()).max(50).optional(),
  alertsEnabled: z.boolean().optional(),
  alertFrequency: z.enum(["DAILY", "WEEKLY", "INSTANT"]).optional(),
});

export async function PATCH(req: NextRequest) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.jobseeker.profile.manage");

  // Ensure profile exists first
  await getOrCreateJobSeekerProfile(session!.user.id);

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input: " + parsed.error.message);

  const updated = await updateJobSeekerProfile(session!.user.id, parsed.data as Parameters<typeof updateJobSeekerProfile>[1]);
  return ok(updated);
}

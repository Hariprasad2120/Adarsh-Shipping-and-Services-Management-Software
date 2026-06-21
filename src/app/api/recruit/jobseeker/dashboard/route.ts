import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { getJobSeekerDashboardCounts } from "@/modules/recruit/jobseeker-service";

export async function GET() {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.jobseeker.use");

  return ok(await getJobSeekerDashboardCounts(session!.user.id));
}

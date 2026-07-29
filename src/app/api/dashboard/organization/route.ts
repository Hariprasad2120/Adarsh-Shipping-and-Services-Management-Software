import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { getOrg } from "@/modules/core/organisation/service";
import { listUsersForDashboard } from "@/modules/core/user/service";

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  if (!session!.user.orgId) return ok(null);

  const [org, employees] = await Promise.all([
    getOrg(session!.user.orgId),
    listUsersForDashboard(session!.user.orgId, { active: true, take: 200 }),
  ]);
  return ok({
    departments: org?.departments ?? [],
    branches: org?.branches ?? [],
    employees,
  });
}

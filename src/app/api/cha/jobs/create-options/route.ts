import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { getCreateJobOptions } from "@/modules/cha/jobs/queries";

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  if (!session!.user.orgId) return ok({ error: "Organisation setup required." }, 400);

  await requirePermission(session!.user.id, "cha.job.create");
  return ok(await getCreateJobOptions(session!.user.orgId));
}

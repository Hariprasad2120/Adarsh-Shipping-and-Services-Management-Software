import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { getOrg } from "@/modules/core/organisation/service";

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  if (!session!.user.orgId) return ok(null);
  return ok(await getOrg(session!.user.orgId));
}

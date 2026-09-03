import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { comparePolicyVersions } from "@/modules/leave/policy";

export async function GET(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "attendance.leave.manage");

  const { searchParams } = new URL(req.url);
  const versionA = searchParams.get("versionA");
  const versionB = searchParams.get("versionB");
  if (!versionA || !versionB) return err("versionA and versionB query params are required");

  const diffs = await comparePolicyVersions(versionA, versionB, session!.user.orgId!);
  return ok(diffs);
}

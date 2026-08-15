import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { reconcileOrgBalances } from "@/modules/leave/reconciliation";

/**
 * Balance reconciliation report (spec §30) — compares materialized
 * LeaveBalance against the ledger-derived sum, flags drift. Read-only.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  if (!session!.user.orgId) return err("User has no organisation", 400);
  await requirePermission(session!.user.id, "attendance.leave.manage");

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year")) || new Date().getFullYear();

  const rows = await reconcileOrgBalances(session!.user.orgId, year);
  return ok(rows);
}

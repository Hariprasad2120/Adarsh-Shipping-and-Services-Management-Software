import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { getAccountingApprovalWorkflowSummary } from "@/modules/accounting/phase9-workspaces";

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "accounting.document.approve");
  return ok(await getAccountingApprovalWorkflowSummary(session!.user.orgId!));
}

import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { getAccountingCommunicationWorkspace } from "@/modules/accounting/phase9-workspaces";

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "accounting.reports.view");
  return ok(await getAccountingCommunicationWorkspace(session!.user.orgId!));
}

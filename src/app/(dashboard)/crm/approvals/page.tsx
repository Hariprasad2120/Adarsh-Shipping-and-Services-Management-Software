import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { fetchPendingApprovals, fetchApprovalMetrics } from "@/modules/crm/approval-actions";
import ApprovalsClient from "./approvals-client";

export const metadata = { title: "Approval Queue — CRM" };

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [canApproveQuote, canApproveInvoice, canApproveSO] = await Promise.all([
    can(userId, "crm.quote.approve"),
    can(userId, "crm.invoice.approve"),
    can(userId, "crm.sales_order.approve"),
  ]);

  const hasAnyApprovePerms = canApproveQuote || canApproveInvoice || canApproveSO;

  const [pending, metrics] = await Promise.all([
    hasAnyApprovePerms ? fetchPendingApprovals() : Promise.resolve([]),
    fetchApprovalMetrics(),
  ]);

  const caps = {
    canApproveQuote,
    canApproveInvoice,
    canApproveSO,
    canAdminRestore: await can(userId, "crm.invoice.admin_restore"),
  };

  return <ApprovalsClient pending={pending} metrics={metrics} caps={caps} />;
}

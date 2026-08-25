import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAll, can as hasPermission, requirePermission } from "@/lib/rbac";
import { getPayrollWorkspaceData } from "@/modules/hrms/payroll";
import { PayRunSummaryClient } from "@/modules/payroll/components/pay-run-summary-client";

function parsePeriod(searchPeriod: string | undefined) {
  if (!searchPeriod) return new Date();
  const match = searchPeriod.match(/^(\d{4})-(\d{2})$/);
  if (!match) return new Date();
  const [, year, month] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

// Phase 16-17 (+ Zoho payrun-preview reskin): Regular pay-run draft detail
// page. Data fetching (getPayrollWorkspaceData, permission checks) is
// unchanged from the original PayrollClient-based route — only the
// presentation layer below was rebuilt to match Zoho Payroll's payrun
// preview page 1:1 (see PayRunSummaryClient). The real approve mutation
// (approvePayrollRunAction) is called directly from that client component,
// same as it was here before.
export default async function PayrollRegularRunPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  await requirePermission(session.user.id, "hrms.salary.read");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/login");

  const params = await searchParams;
  const selectedPeriod = parsePeriod(
    typeof params.period === "string" ? params.period : undefined,
  );

  const [workspace, canApproveRun, canPostAccrual] = await Promise.all([
    getPayrollWorkspaceData(orgId, selectedPeriod),
    canAll(session.user.id, ["hrms.salary.manage", "accounting.integration.post"]),
    hasPermission(session.user.id, "accounting.post"),
  ]);

  return (
    <PayRunSummaryClient
      workspace={workspace}
      canApproveRun={canApproveRun}
      canPostAccrual={canPostAccrual}
    />
  );
}

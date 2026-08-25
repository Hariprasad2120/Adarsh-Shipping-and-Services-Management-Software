import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { canAll, can as hasPermission, requirePermission } from "@/lib/rbac";
import { getPayrollBatches } from "@/modules/accounting/service";
import { getPayrollWorkspaceData } from "@/modules/hrms/payroll";
import { PayrollClient } from "@/app/(dashboard)/hrms/payroll/payroll-client";
import { WorkspacePanel } from "@/components/layout/workspace";

function parsePeriod(searchPeriod: string | undefined) {
  if (!searchPeriod) return new Date();
  const match = searchPeriod.match(/^(\d{4})-(\d{2})$/);
  if (!match) return new Date();
  const [, year, month] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

// Phase 16-17: Regular pay-run processing. Reuses the existing, real
// engine (PayrollClient) — moved here, on its own route, so the Pay Runs
// list page (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, page 00009)
// isn't cluttered with the full processing UI stacked underneath it.
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

  const [workspace, batches, canApproveRun, canPostAccrual] = await Promise.all([
    getPayrollWorkspaceData(orgId, selectedPeriod),
    getPayrollBatches(orgId),
    canAll(session.user.id, ["hrms.salary.manage", "accounting.integration.post"]),
    hasPermission(session.user.id, "accounting.post"),
  ]);

  const serializedBatches = batches
    .filter((batch) => batch.type === "REGULAR")
    .map((batch) => ({
      id: batch.id,
      month: batch.month.toISOString(),
      type: batch.type,
      status: batch.status,
      totalAmount: Number(batch.totalAmount),
      journalVoucherNo: batch.journalEntry?.voucherNo ?? null,
      journalEntryId: batch.journalEntry?.id ?? null,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
    }));

  return (
    <div className="space-y-4">
      <Link
        href="/payroll/pay-runs"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Pay Runs
      </Link>
      <WorkspacePanel className="p-0">
        <PayrollClient
          canApproveRun={canApproveRun}
          canPostAccrual={canPostAccrual}
          initialBatches={serializedBatches}
          workspace={workspace}
        />
      </WorkspacePanel>
    </div>
  );
}

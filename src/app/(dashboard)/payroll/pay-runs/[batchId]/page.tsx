import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { WorkspaceAlert, WorkspaceBadge, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { formatPayrollMoney, formatPayrollDate } from "@/modules/payroll/service";
import { MarkPaidControl } from "@/modules/payroll/components/mark-paid-control";

const TYPE_LABELS: Record<string, string> = {
  OFF_CYCLE: "Off-Cycle Payroll",
  TERMINATION: "Final Settlement Payroll",
  BONUS: "Statutory Bonus",
};

// Off-cycle and termination batches don't have a per-employee breakdown
// stored (only the aggregate GL total) — this shows what's real rather than
// fabricating Zoho's per-employee payslip/TDS-sheet table for them.
export default async function PayrollBatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const { batchId } = await params;
  const batch = await db.payrollBatch.findFirst({
    where: { id: batchId, orgId: session.user.orgId, type: { in: ["OFF_CYCLE", "TERMINATION", "BONUS"] } },
    include: { journalEntry: { select: { voucherNo: true } } },
  });
  if (!batch) notFound();

  const canPost = await can(session.user.id, "accounting.integration.post");

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/pay-runs"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Pay Runs
      </Link>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title={`${TYPE_LABELS[batch.type] ?? batch.type} — ${formatPayrollDate(batch.month.toISOString())}`}
          description={
            <WorkspaceBadge variant={batch.status === "PAID" ? "success" : "warning"}>
              {batch.status === "PAID" ? "Paid" : "Payment Due"}
            </WorkspaceBadge>
          }
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">Total Amount</div>
            <div className="mt-1 text-xl font-semibold text-[var(--mnx-text)]">{formatPayrollMoney(Number(batch.totalAmount))}</div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">Voucher</div>
            <div className="mt-1 text-xl font-semibold text-[var(--mnx-text)]">{batch.journalEntry?.voucherNo ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">Status</div>
            <div className="mt-1 text-xl font-semibold text-[var(--mnx-text)]">{batch.status}</div>
          </div>
        </div>
        {batch.status !== "PAID" && canPost ? <MarkPaidControl batchId={batch.id} /> : null}
        <WorkspaceAlert variant="info">
          No bank-transfer provider is integrated — &quot;Mark as Paid&quot; records
          that this amount was paid outside Monolith; it does not initiate a real
          transfer. Per-employee payslip/TDS-sheet breakdown isn&apos;t stored for
          off-cycle/termination batches yet, only the aggregate total.
        </WorkspaceAlert>
      </WorkspacePanel>
    </div>
  );
}

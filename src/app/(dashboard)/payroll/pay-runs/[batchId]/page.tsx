import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { WorkspaceAlert, WorkspaceBadge, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { Button } from "@/components/ui/button";
import { formatPayrollMoney, formatPayrollDate } from "@/modules/payroll/service";
import { MarkPaidControl } from "@/modules/payroll/components/mark-paid-control";
import { SummaryCardGrid, PeriodCostCard, PayDayCard, TaxesDeductionsCard } from "@/modules/payroll/components/pay-run-summary-header";
import type { OffCycleBatchMetadata } from "@/modules/hrms/off-cycle-payroll";
import type { TerminationBatchMetadata } from "@/modules/hrms/termination-payroll";

const TYPE_LABELS: Record<string, string> = {
  OFF_CYCLE: "Off-Cycle Payroll",
  TERMINATION: "Final Settlement Payroll",
  BULK_TERMINATION: "Bulk Termination Payroll",
  BONUS: "Statutory Bonus",
};

type EmployeeRow = {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  subLabel: string | null;
  paidDays: number | string;
  netPay: number;
};

// Phase 34 (Zoho pay-run parity, pages 00010/00065/00067): off-cycle and
// termination/bulk-termination batch detail — header summary cards, a real
// "Initiate Payment" action (the same batch status-transition action Mark
// as Paid always used — see its comment for why there's no real bank
// transfer), and a per-employee table sourced from the batch's
// PayrollBatch.metadata snapshot (src/modules/hrms/off-cycle-payroll.ts /
// termination-payroll.ts). Batches created before that metadata field
// existed only have the aggregate GL total — the alert below says so rather
// than fabricating rows.
export default async function PayrollBatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const { batchId } = await params;
  const batch = await db.payrollBatch.findFirst({
    where: { id: batchId, orgId: session.user.orgId, type: { in: ["OFF_CYCLE", "TERMINATION", "BULK_TERMINATION", "BONUS"] } },
    include: { journalEntry: { select: { voucherNo: true, id: true } } },
  });
  if (!batch) notFound();

  const canPost = await can(session.user.id, "accounting.integration.post");

  const isTermination = batch.type === "TERMINATION" || batch.type === "BULK_TERMINATION";
  const isOffCycle = batch.type === "OFF_CYCLE";

  let rows: EmployeeRow[] = [];
  let notesFromMetadata: string | null = null;
  if (isOffCycle && batch.metadata) {
    const metadata = batch.metadata as unknown as OffCycleBatchMetadata;
    rows = metadata.entries.map((e) => ({
      employeeId: e.employeeId,
      employeeName: e.employeeName,
      employeeNumber: e.employeeNumber,
      subLabel: e.componentLabel,
      paidDays: "—",
      netPay: e.amount,
    }));
  } else if (isTermination && batch.metadata) {
    const metadata = batch.metadata as unknown as TerminationBatchMetadata;
    notesFromMetadata = metadata.notes;
    rows = metadata.entries.map((e) => ({
      employeeId: e.employeeId,
      employeeName: e.employeeName,
      employeeNumber: e.employeeNumber,
      subLabel: `Last Day of Work: ${formatPayrollDate(e.lastWorkingDay)}`,
      paidDays: e.payableDays,
      netPay: e.netPay,
    }));
  }

  const totalAmount = Number(batch.totalAmount);
  const payDay = {
    day: String(batch.month.getUTCDate()).padStart(2, "0"),
    monthYear: new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "UTC" })
      .format(batch.month)
      .toUpperCase(),
  };
  const totalDeductions = isTermination
    ? (batch.metadata as unknown as TerminationBatchMetadata | null)?.entries.reduce((sum, e) => sum + e.deductionsTotal, 0) ?? 0
    : 0;

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/pay-runs"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Pay Runs
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-[var(--mnx-text)]">
            {TYPE_LABELS[batch.type] ?? batch.type} — {formatPayrollDate(batch.month.toISOString())}
          </h1>
          <WorkspaceBadge variant={batch.status === "PAID" ? "success" : "warning"}>
            {batch.status === "PAID" ? "Paid" : "Payment Due"}
          </WorkspaceBadge>
        </div>
        {batch.status !== "PAID" && canPost ? (
          <MarkPaidControl batchId={batch.id} label="Initiate Payment" pendingLabel="Initiating…" />
        ) : batch.status === "PAID" && canPost ? (
          <span className="text-sm text-[var(--mnx-muted)]">Payment recorded — see Payment Status below.</span>
        ) : null}
      </div>

      <SummaryCardGrid>
        <PeriodCostCard
          periodLabel={`Pay Date: ${formatPayrollDate(batch.month.toISOString())}`}
          baseDays={isTermination ? (batch.metadata as unknown as TerminationBatchMetadata | null)?.entries[0]?.baseDays ?? null : null}
          payrollCost={totalAmount}
          totalNetPay={totalAmount}
        />
        <PayDayCard day={payDay.day} monthYear={payDay.monthYear} employeeCount={rows.length} />
        <TaxesDeductionsCard taxesTotal={0} benefitsTotal={0} otherDeductionsTotal={totalDeductions} />
      </SummaryCardGrid>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading index="02" title="Employees" />
        {notesFromMetadata ? (
          <p className="text-sm text-[var(--mnx-muted)]">
            <span className="font-medium text-[var(--mnx-text)]">Notes: </span>
            {notesFromMetadata}
          </p>
        ) : null}
        {rows.length === 0 ? (
          <WorkspaceAlert variant="info">
            No per-employee breakdown is stored for this pay run — it was processed before the
            per-employee snapshot (Phase 34) existed, so only the aggregate total below is
            available.
          </WorkspaceAlert>
        ) : (
          <div className="mnx-table-wrap overflow-x-auto rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)]">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-[var(--mnx-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--mnx-muted)]">
                  <th className="px-3 py-2">Employee Name</th>
                  <th className="px-3 py-2">{isOffCycle ? "Component" : "Paid Days"}</th>
                  <th className="px-3 py-2">Net Pay</th>
                  <th className="px-3 py-2">Payslip</th>
                  <th className="px-3 py-2">TDS Sheet</th>
                  <th className="px-3 py-2">Payment Mode</th>
                  <th className="px-3 py-2">Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.employeeId} className="border-b border-[var(--mnx-border)] last:border-b-0">
                    <td className="px-3 py-2">
                      <div className="font-medium text-[var(--mnx-accent-strong)]">
                        {row.employeeName} <span className="text-xs font-normal text-[var(--mnx-muted)]">({row.employeeNumber})</span>
                      </div>
                      {row.subLabel ? <div className="text-xs text-[var(--mnx-muted)]">{row.subLabel}</div> : null}
                    </td>
                    <td className="px-3 py-2 text-[var(--mnx-text)]">{row.paidDays}</td>
                    <td className="px-3 py-2 font-semibold text-[var(--mnx-text)]">{formatPayrollMoney(row.netPay)}</td>
                    {/* No batch-specific payslip/TDS-sheet document generator exists for
                        off-cycle/termination settlements yet — the regular monthly payslip
                        generator (src/modules/payroll/pdf/generate-payslip.tsx) computes from
                        attendance-based monthly pay and would show the wrong figures here, so
                        this is left honestly unavailable rather than linking to it. */}
                    <td className="px-3 py-2 text-[var(--mnx-muted)]">Not available</td>
                    <td className="px-3 py-2 text-[var(--mnx-muted)]">Not available</td>
                    <td className="px-3 py-2 text-[var(--mnx-muted)]">Not tracked</td>
                    <td className="px-3 py-2">
                      <WorkspaceBadge variant={batch.status === "PAID" ? "success" : "warning"}>
                        {batch.status === "PAID" ? "Paid" : "Payment Due"}
                      </WorkspaceBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WorkspacePanel>

      <WorkspacePanel className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">Voucher</div>
            <div className="mt-1 text-sm font-medium text-[var(--mnx-text)]">{batch.journalEntry?.voucherNo ?? "—"}</div>
          </div>
          {/* No bank-advice/payment-file generator exists in this codebase yet
              (grepped for "bank advice"/"payment advice" — no hits). Left as a
              clearly-labeled disabled stub instead of faking a download. */}
          <Button
            type="button"
            variant="outline"
            disabled
            title="No bank-advice file generator is wired up yet"
            className="cursor-not-allowed opacity-60"
          >
            Download Bank Advice
          </Button>
        </div>
        <WorkspaceAlert variant="info">
          No bank-transfer provider is integrated — &quot;Initiate Payment&quot; records that this
          amount was paid outside Monolith; it does not initiate a real transfer. Statutory
          deduction recompute (taxes/benefits) is not applied to off-cycle/termination amounts —
          they post as entered (Phase 26 work), so the Taxes &amp; Benefits rows above are not
          computed for this pay run.
        </WorkspaceAlert>
      </WorkspacePanel>
    </div>
  );
}

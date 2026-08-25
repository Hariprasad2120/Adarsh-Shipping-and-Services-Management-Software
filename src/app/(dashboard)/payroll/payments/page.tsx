import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Landmark, ReceiptIndianRupee, WalletCards } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspaceAlert, WorkspaceMetric, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { formatPayrollMoney, formatPayrollMonth, getPayrollModuleSnapshot } from "@/modules/payroll/service";

export default async function PayrollPaymentsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const snapshot = await getPayrollModuleSnapshot(session.user.orgId, new Date());

  return (
    <div className="space-y-6">
      <section className="mnx-workspace-metrics" aria-label="Payroll payment metrics">
        <WorkspaceMetric
          icon={<ReceiptIndianRupee aria-hidden="true" />}
          label="Approved batches"
          value={snapshot.currentMonth.approvedBatchCount}
          detail="Current-period immutable HRMS payroll approvals"
        />
        <WorkspaceMetric
          icon={<Landmark aria-hidden="true" />}
          label="Posted batches"
          value={snapshot.currentMonth.postedBatchCount}
          detail="Current-period payrolls already handed into Accounting"
        />
        <WorkspaceMetric
          icon={<WalletCards aria-hidden="true" />}
          label="Net payroll"
          value={formatPayrollMoney(snapshot.workspace.summary.netPayroll)}
          detail="Current-month salary liability after employee deductions"
        />
        <WorkspaceMetric
          icon={<Building2 aria-hidden="true" />}
          label="Accounting defaults"
          value={
            snapshot.workspace.settingsConfigured ? "Configured" : "Attention needed"
          }
          detail="Salary expense, payable, and bank mapping posture"
        />
      </section>

      {!snapshot.workspace.settingsConfigured ? (
        <WorkspaceAlert variant="warning">
          Finance posting is blocked until Accounting defaults are configured.
        </WorkspaceAlert>
      ) : null}

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Payroll payment and posting timeline"
          description="This section follows the standalone payroll model from the reference corpus: approve the pay run, hand off to Accounting, then continue banking operations without duplicating the finance engine."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link className="mnx-button mnx-button-secondary" href="/payroll/pay-runs">
                Open pay runs
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/accounting/banking">
                Banking
              </Link>
            </div>
          }
        />
        <div className="space-y-3">
          {snapshot.batches.length === 0 ? (
            <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4 text-sm text-[var(--mnx-muted)]">
              No payroll batches have been approved yet.
            </div>
          ) : (
            snapshot.batches.map((batch) => (
              <article
                key={batch.id}
                className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--mnx-text)]">
                      {formatPayrollMonth(batch.month)}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--mnx-muted)]">
                      Total {formatPayrollMoney(batch.totalAmount)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--mnx-muted)]">
                      Status {batch.status}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {batch.journalEntryId ? (
                      <Link
                        className="mnx-button mnx-button-secondary"
                        href={`/accounting/journal-entries/${batch.journalEntryId}`}
                      >
                        Open journal
                      </Link>
                    ) : null}
                    <Link className="mnx-button mnx-button-secondary" href="/accounting/banking">
                      Banking follow-up
                    </Link>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </WorkspacePanel>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { FileBadge2, FolderOpen, Printer } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspaceAlert, WorkspaceMetric, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { formatPayrollMonth, getPayrollModuleSnapshot } from "@/modules/payroll/service";

export default async function PayrollPayslipsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const snapshot = await getPayrollModuleSnapshot(session.user.orgId, new Date());
  const releasableBatches = snapshot.batches.filter((batch) =>
    ["FINALIZED", "POSTED", "PAID"].includes(batch.status),
  );

  return (
    <div className="space-y-6">
      <section className="mnx-workspace-metrics" aria-label="Payroll payslip metrics">
        <WorkspaceMetric
          icon={<Printer aria-hidden="true" />}
          label="Payroll periods in history"
          value={snapshot.batches.length}
          detail="Approved and posted payroll periods known to the module"
        />
        <WorkspaceMetric
          icon={<FileBadge2 aria-hidden="true" />}
          label="Releasable periods"
          value={releasableBatches.length}
          detail="Periods that are posted enough to serve as a payslip release anchor"
        />
        <WorkspaceMetric
          icon={<FolderOpen aria-hidden="true" />}
          label="Employee profiles"
          value={snapshot.employees.length}
          detail="Potential ESS payroll recipients once payslip generation is wired"
        />
      </section>

      <WorkspaceAlert variant="info">
        Payslip, TDS sheet, and Form 16 document generation are not yet connected to
        a native Payroll document pipeline in this repository. This module tracks the
        release posture and historical periods without faking document output.
      </WorkspaceAlert>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Payslip release staging"
          description="The reference screens separate payslips and tax forms per employee and per payroll period. This module now owns that staging area even though final document generation still needs implementation."
          actions={
            <Link className="mnx-button mnx-button-secondary" href="/payroll/payments">
              Open payment history
            </Link>
          }
        />
        <div className="space-y-3">
          {snapshot.batches.map((batch) => (
            <div
              key={batch.id}
              className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[var(--mnx-text)]">
                    {formatPayrollMonth(batch.month)}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--mnx-muted)]">Batch status {batch.status}</p>
                </div>
                <p className="text-sm text-[var(--mnx-muted)]">
                  {["FINALIZED", "POSTED", "PAID"].includes(batch.status)
                    ? "Ready for payslip release pipeline"
                    : "Awaiting final posting"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </WorkspacePanel>
    </div>
  );
}

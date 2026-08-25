import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";

const DATASETS: { dataset: string; title: string; description: string }[] = [
  {
    dataset: "employees",
    title: "Employees",
    description: "Employee ID, name, email, designation, department, location, date of joining, and annual gross.",
  },
  {
    dataset: "salary-components",
    title: "Salary components",
    description: "Every configured earning, deduction, benefit, and reimbursement component with its calculation rule.",
  },
  {
    dataset: "loans",
    title: "Employee loans",
    description: "Loan number, employee, principal, EMI, disbursed date, status, and notes for every payroll loan.",
  },
];

// Zoho reference settings_data-backup. Real CSV export, generated on request
// (no scheduled/background backup engine exists in this repo, so this page
// only covers on-demand export — not automated periodic backups).
export default async function PayrollDataBackupSettingsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");
  const orgId = session.user.orgId;

  const [employeeCount, componentCount, loanCount] = await Promise.all([
    db.user.count({ where: { orgId } }),
    db.salaryComponent.count({ where: { orgId } }),
    db.payrollLoan.count({ where: { orgId } }),
  ]);
  const counts: Record<string, number> = {
    employees: employeeCount,
    "salary-components": componentCount,
    loans: loanCount,
  };

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/settings"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Settings
      </Link>
      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Data Backup / Export"
          description="Download the current state of payroll data as CSV. Each export streams directly from the live database — there is no scheduled backup job in this repository."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {DATASETS.map((entry) => (
            <div
              key={entry.dataset}
              className="flex flex-col justify-between gap-3 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm text-[var(--mnx-text)]">{entry.title}</strong>
                  <span className="text-xs text-[var(--mnx-muted)]">{counts[entry.dataset]} rows</span>
                </div>
                <p className="mt-1 text-sm text-[var(--mnx-muted)]">{entry.description}</p>
              </div>
              <a
                className="mnx-button mnx-button-secondary inline-flex items-center justify-center gap-1.5"
                href={`/api/payroll/settings/data-backup/export?dataset=${entry.dataset}`}
              >
                <Download className="size-4" aria-hidden="true" />
                Download CSV
              </a>
            </div>
          ))}
        </div>
      </WorkspacePanel>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspaceAlert, WorkspaceBadge, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";

// Phase 29: reference taxes-and-forms_form24q (labeled "Form 138 (Formerly
// Form 24Q)" in the captured org) — docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md,
// page 00019. Quarterly due dates below are standard, publicly-fixed TDS
// return deadlines (31 Jul / 31 Oct / 31 Jan / 31 May), not guessed. Per-quarter
// TDS totals are not shown — this repo's GL lines bundle TDS inside
// EMPLOYEE_DEDUCTIONS rather than storing it as its own component, so an
// accurate quarterly figure isn't available yet without fabricating one.
function fiscalYearQuarters() {
  const now = new Date();
  const fyStartYear = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const quarters = [
    { label: "Q1", start: new Date(Date.UTC(fyStartYear, 3, 1)), end: new Date(Date.UTC(fyStartYear, 5, 30)), due: new Date(Date.UTC(fyStartYear, 6, 31)) },
    { label: "Q2", start: new Date(Date.UTC(fyStartYear, 6, 1)), end: new Date(Date.UTC(fyStartYear, 8, 30)), due: new Date(Date.UTC(fyStartYear, 9, 31)) },
    { label: "Q3", start: new Date(Date.UTC(fyStartYear, 9, 1)), end: new Date(Date.UTC(fyStartYear, 11, 31)), due: new Date(Date.UTC(fyStartYear + 1, 0, 31)) },
    { label: "Q4", start: new Date(Date.UTC(fyStartYear + 1, 0, 1)), end: new Date(Date.UTC(fyStartYear + 1, 2, 31)), due: new Date(Date.UTC(fyStartYear + 1, 4, 31)) },
  ];
  return { fyStartYear, quarters };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export default async function PayrollForm24QPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const { fyStartYear, quarters } = fiscalYearQuarters();
  const now = new Date();

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/taxes-and-forms"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Taxes &amp; Forms
      </Link>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title={`Form 24Q — FY ${fyStartYear}-${fyStartYear + 1}`}
          description="Quarterly TDS return filing periods."
        />
        <ul className="space-y-2">
          {quarters.map((q) => {
            const overdueDays = now > q.due ? Math.floor((now.getTime() - q.due.getTime()) / 86_400_000) : 0;
            return (
              <li
                key={q.label}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-3 text-sm"
              >
                <div>
                  <div className="font-semibold text-[var(--mnx-text)]">
                    {q.label} · Deposit Period {formatDate(q.start)} - {formatDate(q.end)}
                  </div>
                  <div className="text-xs text-[var(--mnx-muted)]">Due Date {formatDate(q.due)}</div>
                </div>
                {overdueDays > 0 ? (
                  <WorkspaceBadge variant="danger">Overdue by {overdueDays} days</WorkspaceBadge>
                ) : (
                  <WorkspaceBadge variant="neutral">Upcoming</WorkspaceBadge>
                )}
              </li>
            );
          })}
        </ul>
        <WorkspaceAlert variant="info">
          Per-quarter TDS totals and return preparation/export are not
          implemented — this repository does not store a per-component TDS
          breakdown per pay run yet (Phase 29 gap).
        </WorkspaceAlert>
      </WorkspacePanel>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getPayrollWorkspaceData } from "@/modules/hrms/payroll";
import { WorkspaceBadge, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import {
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import { formatPayrollMoney } from "@/modules/payroll/service";

function prevMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
}

// Phase 61: real variance/anomaly review comparing the current period's
// computed rows against the previous period's, both from the same live
// calculation engine — no separate/duplicate calc path.
export default async function PayrollVarianceReportPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");
  const orgId = session.user.orgId;

  const now = new Date();
  const [current, previous] = await Promise.all([
    getPayrollWorkspaceData(orgId, now),
    getPayrollWorkspaceData(orgId, prevMonth(now)),
  ]);
  const previousByEmployee = new Map(previous.rows.map((r) => [r.employeeId, r]));

  type Flag = { employee: string; issue: string };
  const flags: Flag[] = [];

  for (const row of current.rows) {
    if (row.netPay < 0) flags.push({ employee: row.employeeName, issue: "Negative net pay" });
    if (row.grossEarnings > 0 && row.netPay === 0) flags.push({ employee: row.employeeName, issue: "Zero net pay despite gross earnings" });
    if (row.otHours > 0 && row.otAmount === 0) flags.push({ employee: row.employeeName, issue: "OT hours logged with zero OT amount" });

    const prev = previousByEmployee.get(row.employeeId);
    if (prev && prev.netPay > 0) {
      const changePct = ((row.netPay - prev.netPay) / prev.netPay) * 100;
      if (Math.abs(changePct) >= 25) {
        flags.push({
          employee: row.employeeName,
          issue: `Net pay changed ${changePct > 0 ? "+" : ""}${changePct.toFixed(1)}% vs previous period`,
        });
      }
    }
  }

  const totalChangePct =
    previous.summary.netPayroll > 0
      ? ((current.summary.netPayroll - previous.summary.netPayroll) / previous.summary.netPayroll) * 100
      : null;

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/reports"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Reports Centre
      </Link>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Payroll Variance & Anomaly Review"
          description={`${current.period.label} vs ${previous.period.label}`}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-3 text-sm">
            <div className="text-xs text-[var(--mnx-muted)]">Net Payroll (current)</div>
            <div className="font-semibold text-[var(--mnx-text)]">{formatPayrollMoney(current.summary.netPayroll)}</div>
          </div>
          <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-3 text-sm">
            <div className="text-xs text-[var(--mnx-muted)]">Net Payroll (previous)</div>
            <div className="font-semibold text-[var(--mnx-text)]">{formatPayrollMoney(previous.summary.netPayroll)}</div>
          </div>
          <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-3 text-sm">
            <div className="text-xs text-[var(--mnx-muted)]">Change</div>
            <div className="font-semibold text-[var(--mnx-text)]">{totalChangePct != null ? `${totalChangePct > 0 ? "+" : ""}${totalChangePct.toFixed(1)}%` : "—"}</div>
          </div>
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading index="02" title="Flags" description="Negative pay, zero net despite earnings, OT inconsistency, and >=25% period-over-period swings." />
        {flags.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">No anomalies detected this period.</p>
        ) : (
          <PeopleTable>
            <PeopleTableHeader>
              <PeopleTableRow>
                <PeopleTableHead>Employee</PeopleTableHead>
                <PeopleTableHead>Flag</PeopleTableHead>
              </PeopleTableRow>
            </PeopleTableHeader>
            <PeopleTableBody>
              {flags.map((flag, index) => (
                <PeopleTableRow key={index}>
                  <PeopleTableCell>{flag.employee}</PeopleTableCell>
                  <PeopleTableCell>
                    <WorkspaceBadge variant="warning">
                      <TriangleAlert className="mr-1 inline size-3" aria-hidden="true" />
                      {flag.issue}
                    </WorkspaceBadge>
                  </PeopleTableCell>
                </PeopleTableRow>
              ))}
            </PeopleTableBody>
          </PeopleTable>
        )}
      </WorkspacePanel>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, CircleDollarSign, TimerReset, TriangleAlert } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspaceMetric, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import {
  PeopleSection,
  PeopleSectionHeader,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import { formatPayrollMoney, getPayrollModuleSnapshot } from "@/modules/payroll/service";

export default async function PayrollInputsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const snapshot = await getPayrollModuleSnapshot(session.user.orgId, new Date());
  const rows = snapshot.workspace.rows.filter(
    (row) =>
      row.otHours > 0 ||
      row.unpaidLeaveDays > 0 ||
      row.manualLopDays > 0 ||
      row.partialPayDeductionDays > 0 ||
      row.incentives > 0,
  );

  return (
    <div className="space-y-6">
      <section className="mnx-workspace-metrics" aria-label="Payroll input metrics">
        <WorkspaceMetric
          icon={<CalendarClock aria-hidden="true" />}
          label="LOP impact"
          value={formatPayrollMoney(snapshot.workspace.summary.lopImpact)}
          detail="Current period proration impact from unpaid leave, manual LOP, and partial-pay leave"
        />
        <WorkspaceMetric
          icon={<TimerReset aria-hidden="true" />}
          label="Overtime amount"
          value={formatPayrollMoney(snapshot.workspace.summary.overtimeAmount)}
          detail="Approved OT amount flowing from attendance operations"
        />
        <WorkspaceMetric
          icon={<CircleDollarSign aria-hidden="true" />}
          label="Incentives"
          value={formatPayrollMoney(snapshot.currentMonth.approvedIncentiveAmount)}
          detail={`${snapshot.currentMonth.incentiveCount} current-month incentive entries`}
        />
        <WorkspaceMetric
          icon={<TriangleAlert aria-hidden="true" />}
          label="Review blockers"
          value={snapshot.workspace.issues.length}
          detail="Employees blocked from approval because of input issues"
        />
      </section>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Input sources"
          description="Payroll consumes upstream modules instead of creating duplicate timesheets or employee finance records."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link className="mnx-button mnx-button-secondary" href="/attendance/leaves">
                Leave
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/attendance/ot">
                Attendance and OT
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/hrms/incentives">
                Incentives
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/hrms/reimbursement">
                Reimbursements
              </Link>
            </div>
          }
        />
      </WorkspacePanel>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Current-period input register"
          title="Employees with payroll-affecting inputs"
          description="Rows below surface the same categories repeatedly highlighted in the reference product screens: attendance shortfall, OT, incentives, and leave-driven proration."
        />
        <PeopleTable>
          <PeopleTableHeader>
            <PeopleTableRow>
              <PeopleTableHead>Employee</PeopleTableHead>
              <PeopleTableHead>Attendance and leave</PeopleTableHead>
              <PeopleTableHead>OT and incentive</PeopleTableHead>
              <PeopleTableHead>Result</PeopleTableHead>
            </PeopleTableRow>
          </PeopleTableHeader>
          <PeopleTableBody>
            {rows.map((row) => (
              <PeopleTableRow key={row.employeeId}>
                <PeopleTableCell>
                  <div className="font-semibold text-[var(--mnx-text)]">{row.employeeName}</div>
                  <div className="text-xs text-[var(--mnx-muted)]">
                    #{row.employeeNumber} {row.designation ? `• ${row.designation}` : ""}
                  </div>
                </PeopleTableCell>
                <PeopleTableCell>
                  <div className="space-y-1 text-sm text-[var(--mnx-muted)]">
                    <div>Present {row.presentDays}</div>
                    <div>Paid leave {row.paidLeaveDays}</div>
                    <div>Unpaid leave {row.unpaidLeaveDays}</div>
                    <div>Manual LOP {row.manualLopDays}</div>
                    <div>Partial-pay deduction {row.partialPayDeductionDays}</div>
                  </div>
                </PeopleTableCell>
                <PeopleTableCell>
                  <div className="space-y-1 text-sm text-[var(--mnx-muted)]">
                    <div>OT {row.otHours}h</div>
                    <div>OT amount {formatPayrollMoney(row.otAmount)}</div>
                    <div>Incentives {formatPayrollMoney(row.incentives)}</div>
                  </div>
                </PeopleTableCell>
                <PeopleTableCell>
                  <div className="space-y-1 text-sm">
                    <div className="text-[var(--mnx-text)]">
                      Payable days {row.payableDays}
                    </div>
                    <div className="text-[var(--mnx-muted)]">
                      Gross earnings {formatPayrollMoney(row.grossEarnings)}
                    </div>
                    <div className="text-[var(--mnx-muted)]">{row.status}</div>
                  </div>
                </PeopleTableCell>
              </PeopleTableRow>
            ))}
          </PeopleTableBody>
        </PeopleTable>
      </PeopleSection>
    </div>
  );
}

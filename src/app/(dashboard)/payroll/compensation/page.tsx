import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, FileSpreadsheet, TrendingUp } from "lucide-react";
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

export default async function PayrollCompensationPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const snapshot = await getPayrollModuleSnapshot(session.user.orgId, new Date());
  const configuredEmployees = snapshot.employees.filter((employee) => employee.monthlyGross > 0);
  const averageAnnualCtc =
    configuredEmployees.length === 0
      ? 0
      : configuredEmployees.reduce((sum, employee) => sum + employee.annualCtc, 0) /
        configuredEmployees.length;

  return (
    <div className="space-y-6">
      <section className="mnx-workspace-metrics" aria-label="Payroll compensation metrics">
        <WorkspaceMetric
          icon={<BarChart3 aria-hidden="true" />}
          label="Salary-revision records"
          value={snapshot.salaryRevisions.length}
          detail="Existing effective-dated compensation history from HRMS"
        />
        <WorkspaceMetric
          icon={<FileSpreadsheet aria-hidden="true" />}
          label="Configured employees"
          value={configuredEmployees.length}
          detail={`${snapshot.currentMonth.employeesMissingSalarySetup} active employees still missing setup`}
        />
        <WorkspaceMetric
          icon={<TrendingUp aria-hidden="true" />}
          label="Average annual CTC"
          value={formatPayrollMoney(averageAnnualCtc)}
          detail="Derived from active payroll-linked employee compensation"
        />
      </section>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Compensation hub"
          description="The standalone Payroll module consumes the existing salary-structure and salary-revision engines rather than duplicating them."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link className="mnx-button mnx-button-secondary" href="/hrms/salary-structure">
                Salary structure
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/hrms/salary-revisions">
                Salary revisions
              </Link>
            </div>
          }
        />
      </WorkspacePanel>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Current pay basis"
          title="Employee compensation overview"
          description="This view gives Payroll its own read-model over HRMS compensation so pay runs, compliance, and payments can operate independently as a module."
        />
        <PeopleTable>
          <PeopleTableHeader>
            <PeopleTableRow>
              <PeopleTableHead>Employee</PeopleTableHead>
              <PeopleTableHead>Monthly gross</PeopleTableHead>
              <PeopleTableHead>Annual CTC</PeopleTableHead>
              <PeopleTableHead>Run posture</PeopleTableHead>
            </PeopleTableRow>
          </PeopleTableHeader>
          <PeopleTableBody>
            {snapshot.employees.map((employee) => (
              <PeopleTableRow key={employee.id}>
                <PeopleTableCell>
                  <div className="font-semibold text-[var(--mnx-text)]">
                    {employee.employeeName}
                  </div>
                  <div className="text-xs text-[var(--mnx-muted)]">
                    #{employee.employeeNumber} {employee.designation ? `• ${employee.designation}` : ""}
                  </div>
                </PeopleTableCell>
                <PeopleTableCell>{formatPayrollMoney(employee.monthlyGross)}</PeopleTableCell>
                <PeopleTableCell>{formatPayrollMoney(employee.annualCtc)}</PeopleTableCell>
                <PeopleTableCell>
                  <div className="text-sm text-[var(--mnx-muted)]">
                    {employee.runStatus} • {employee.issueCount} issues
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

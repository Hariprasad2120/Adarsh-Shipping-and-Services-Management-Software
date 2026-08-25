import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import {
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import { getPayrollEmployeeDetail } from "@/modules/payroll/employee-detail-service";
import { formatPayrollMoney } from "@/modules/payroll/service";

export default async function PayrollMySalaryDetailsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const employee = await getPayrollEmployeeDetail(session.user.orgId, session.user.id);
  if (!employee) notFound();

  return (
    <WorkspacePanel className="space-y-4 p-5">
      <WorkspaceSectionHeading index="01" title="Salary Details" />
      <div className="flex flex-wrap gap-6">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">Annual CTC</div>
          <div className="text-xl font-semibold text-[var(--mnx-text)]">{formatPayrollMoney(employee.salary.annualCtc)}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">Monthly CTC</div>
          <div className="text-xl font-semibold text-[var(--mnx-text)]">{formatPayrollMoney(employee.salary.monthlyCtc)}</div>
        </div>
      </div>
      {employee.salary.components.length > 0 ? (
        <PeopleTable>
          <PeopleTableHeader>
            <PeopleTableRow>
              <PeopleTableHead>Component</PeopleTableHead>
              <PeopleTableHead>Monthly</PeopleTableHead>
              <PeopleTableHead>Annual</PeopleTableHead>
            </PeopleTableRow>
          </PeopleTableHeader>
          <PeopleTableBody>
            {employee.salary.components.map((c) => (
              <PeopleTableRow key={c.label}>
                <PeopleTableCell>{c.label}</PeopleTableCell>
                <PeopleTableCell>{formatPayrollMoney(c.monthly)}</PeopleTableCell>
                <PeopleTableCell>{formatPayrollMoney(c.annual)}</PeopleTableCell>
              </PeopleTableRow>
            ))}
          </PeopleTableBody>
        </PeopleTable>
      ) : null}
    </WorkspacePanel>
  );
}

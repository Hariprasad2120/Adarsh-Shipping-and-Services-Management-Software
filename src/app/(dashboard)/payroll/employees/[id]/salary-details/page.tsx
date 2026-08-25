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
import { listSalaryTemplates } from "@/modules/payroll/salary-template-actions";
import { AssignTemplateControl } from "@/modules/payroll/components/assign-template-control";
import { ProposeRevisionControl } from "@/modules/payroll/components/propose-revision-control";

export default async function PayrollEmployeeSalaryDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const { id } = await params;
  const employee = await getPayrollEmployeeDetail(session.user.orgId, id);
  if (!employee) notFound();

  const templates = await listSalaryTemplates(session.user.orgId);
  const revisions = employee.salaryRevision?.revisions ?? [];

  return (
    <div className="space-y-6">
      <WorkspacePanel className="space-y-1 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Salary Details"
          actions={
            <div className="flex gap-2">
              <AssignTemplateControl employeeId={id} templates={templates} />
              <ProposeRevisionControl employeeId={id} currentCtc={employee.salary.annualCtc} />
            </div>
          }
        />
        <div className="flex flex-wrap items-baseline gap-6">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">
              Annual CTC
            </div>
            <div className="text-2xl font-semibold text-[var(--mnx-text)]">
              {formatPayrollMoney(employee.salary.annualCtc)} <span className="text-sm font-normal text-[var(--mnx-muted)]">per year</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--mnx-muted)]">
              Monthly CTC
            </div>
            <div className="text-2xl font-semibold text-[var(--mnx-text)]">
              {formatPayrollMoney(employee.salary.monthlyCtc)} <span className="text-sm font-normal text-[var(--mnx-muted)]">per month</span>
            </div>
          </div>
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading index="02" title="Salary Structure" description="Earnings" />
        {employee.salary.components.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">No salary components configured yet.</p>
        ) : (
          <PeopleTable>
            <PeopleTableHeader>
              <PeopleTableRow>
                <PeopleTableHead>Salary Components</PeopleTableHead>
                <PeopleTableHead>Monthly Amount</PeopleTableHead>
                <PeopleTableHead>Annual Amount</PeopleTableHead>
              </PeopleTableRow>
            </PeopleTableHeader>
            <PeopleTableBody>
              {employee.salary.components.map((component) => (
                <PeopleTableRow key={component.label}>
                  <PeopleTableCell>{component.label}</PeopleTableCell>
                  <PeopleTableCell>{formatPayrollMoney(component.monthly)}</PeopleTableCell>
                  <PeopleTableCell>{formatPayrollMoney(component.annual)}</PeopleTableCell>
                </PeopleTableRow>
              ))}
              <PeopleTableRow>
                <PeopleTableCell className="font-semibold text-[var(--mnx-text)]">
                  Cost to Company
                </PeopleTableCell>
                <PeopleTableCell className="font-semibold text-[var(--mnx-text)]">
                  {formatPayrollMoney(employee.salary.monthlyCtc)}
                </PeopleTableCell>
                <PeopleTableCell className="font-semibold text-[var(--mnx-text)]">
                  {formatPayrollMoney(employee.salary.annualCtc)}
                </PeopleTableCell>
              </PeopleTableRow>
            </PeopleTableBody>
          </PeopleTable>
        )}
      </WorkspacePanel>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading index="03" title="Salary Revision History" />
        {revisions.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">No salary revisions on record.</p>
        ) : (
          <PeopleTable>
            <PeopleTableHeader>
              <PeopleTableRow>
                <PeopleTableHead>Previous CTC</PeopleTableHead>
                <PeopleTableHead>Revised CTC</PeopleTableHead>
                <PeopleTableHead>Change</PeopleTableHead>
                <PeopleTableHead>Effective From</PeopleTableHead>
                <PeopleTableHead>Status</PeopleTableHead>
              </PeopleTableRow>
            </PeopleTableHeader>
            <PeopleTableBody>
              {revisions.map((revision) => (
                <PeopleTableRow key={revision.id}>
                  <PeopleTableCell>
                    {revision.ctcAnnual != null ? formatPayrollMoney(revision.ctcAnnual) : "—"}
                  </PeopleTableCell>
                  <PeopleTableCell>
                    {revision.revisedCtcAnnual != null ? formatPayrollMoney(revision.revisedCtcAnnual) : "—"}
                  </PeopleTableCell>
                  <PeopleTableCell>
                    {revision.revisionPercent != null ? `${revision.revisionPercent.toFixed(2)}%` : "—"}
                  </PeopleTableCell>
                  <PeopleTableCell>{revision.effectiveLabel}</PeopleTableCell>
                  <PeopleTableCell>{revision.statusLabel}</PeopleTableCell>
                </PeopleTableRow>
              ))}
            </PeopleTableBody>
          </PeopleTable>
        )}
      </WorkspacePanel>
    </div>
  );
}

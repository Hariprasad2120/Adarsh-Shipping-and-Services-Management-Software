import { redirect } from "next/navigation";
import { FileBadge2, Landmark, ShieldCheck, TriangleAlert } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspaceAlert, WorkspaceMetric, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
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

export default async function PayrollCompliancePage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const snapshot = await getPayrollModuleSnapshot(session.user.orgId, new Date());
  const missingIdentity = snapshot.employees.filter(
    (employee) =>
      employee.payrollEligibility === "PAYROLL_ACTIVE" &&
      (!employee.panMasked || !employee.uanMasked),
  );

  return (
    <div className="space-y-6">
      <section className="mnx-workspace-metrics" aria-label="Payroll compliance metrics">
        <WorkspaceMetric
          icon={<Landmark aria-hidden="true" />}
          label="Employee deductions"
          value={formatPayrollMoney(snapshot.workspace.summary.employeeDeductions)}
          detail="Current-month payroll deductions flowing through employee payroll"
        />
        <WorkspaceMetric
          icon={<ShieldCheck aria-hidden="true" />}
          label="Employer contribution"
          value={formatPayrollMoney(snapshot.workspace.summary.employerContributions)}
          detail="Employer-side contribution burden in the current payroll"
        />
        <WorkspaceMetric
          icon={<FileBadge2 aria-hidden="true" />}
          label="Identity coverage"
          value={`${snapshot.currentMonth.employeesWithPan}/${snapshot.employees.length}`}
          detail={`${snapshot.currentMonth.employeesWithUan} employees also carry UAN data`}
        />
        <WorkspaceMetric
          icon={<TriangleAlert aria-hidden="true" />}
          label="Compliance review queue"
          value={missingIdentity.length}
          detail="Payroll-active employees missing PAN or UAN identity coverage"
        />
      </section>

      {missingIdentity.length > 0 ? (
        <WorkspaceAlert variant="warning">
          Some payroll-active employees still lack the tax and statutory identity
          fields needed for richer payroll compliance workflows.
        </WorkspaceAlert>
      ) : null}

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Current compliance scope"
          description="The module already exposes payroll-side deduction and contribution visibility. Full statutory engines such as PF, ESI, PT, LWF, TDS, declarations, Form 16, and filing outputs still require deeper implementation."
        />
      </WorkspacePanel>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Identity and readiness"
          title="Employee statutory-readiness register"
          description="This view maps the scraped Taxes & Forms and employee-proof concepts into Monolith payroll readiness without pretending government filing workflows already exist."
        />
        <PeopleTable>
          <PeopleTableHeader>
            <PeopleTableRow>
              <PeopleTableHead>Employee</PeopleTableHead>
              <PeopleTableHead>PAN</PeopleTableHead>
              <PeopleTableHead>UAN</PeopleTableHead>
              <PeopleTableHead>Payment mode</PeopleTableHead>
              <PeopleTableHead>Current run posture</PeopleTableHead>
            </PeopleTableRow>
          </PeopleTableHeader>
          <PeopleTableBody>
            {snapshot.employees.map((employee) => (
              <PeopleTableRow key={employee.id}>
                <PeopleTableCell>
                  <div className="font-semibold text-[var(--mnx-text)]">{employee.employeeName}</div>
                  <div className="text-xs text-[var(--mnx-muted)]">#{employee.employeeNumber}</div>
                </PeopleTableCell>
                <PeopleTableCell>{employee.panMasked ?? "Missing"}</PeopleTableCell>
                <PeopleTableCell>{employee.uanMasked ?? "Missing"}</PeopleTableCell>
                <PeopleTableCell>{employee.paymentMode ?? "Missing"}</PeopleTableCell>
                <PeopleTableCell>
                  {employee.runStatus} • {employee.issueCount} issues
                </PeopleTableCell>
              </PeopleTableRow>
            ))}
          </PeopleTableBody>
        </PeopleTable>
      </PeopleSection>
    </div>
  );
}

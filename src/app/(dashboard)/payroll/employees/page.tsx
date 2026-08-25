import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeIndianRupee,
  Building2,
  ShieldCheck,
  TriangleAlert,
  UserRoundSearch,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { WorkspaceAlert, WorkspaceMetric, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import {
  PeopleControlInput,
  PeopleSection,
  PeopleSectionHeader,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import {
  formatPayrollDate,
  formatPayrollMoney,
  getPayrollModuleSnapshot,
} from "@/modules/payroll/service";

type SearchParams = { q?: string; status?: string };

export default async function PayrollEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const { q = "", status = "" } = await searchParams;

  const snapshot = await getPayrollModuleSnapshot(session.user.orgId, new Date());
  const activeEmployees = snapshot.employees.filter(
    (employee) => employee.payrollEligibility === "PAYROLL_ACTIVE",
  );
  const incompleteEmployees = snapshot.employees.filter((employee) => employee.issueCount > 0);

  const query = q.trim().toLowerCase();
  const visibleEmployees = snapshot.employees.filter((employee) => {
    const matchesQuery =
      query.length === 0 ||
      employee.employeeName.toLowerCase().includes(query) ||
      employee.employeeNumber.toLowerCase().includes(query) ||
      (employee.departmentName ?? "").toLowerCase().includes(query);
    const matchesStatus = status.length === 0 || employee.payrollEligibility === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <section className="mnx-workspace-metrics" aria-label="Payroll employee metrics">
        <WorkspaceMetric
          icon={<UserRoundSearch aria-hidden="true" />}
          label="Payroll active"
          value={activeEmployees.length}
          detail={`${snapshot.employees.length} employee profiles in payroll view`}
        />
        <WorkspaceMetric
          icon={<BadgeIndianRupee aria-hidden="true" />}
          label="Configured monthly gross"
          value={activeEmployees.filter((employee) => employee.monthlyGross > 0).length}
          detail={`${snapshot.currentMonth.employeesMissingSalarySetup} active employees still missing salary setup`}
        />
        <WorkspaceMetric
          icon={<ShieldCheck aria-hidden="true" />}
          label="Payment-ready"
          value={activeEmployees.filter((employee) => employee.paymentMode && employee.bankAccountMasked).length}
          detail={`${snapshot.currentMonth.employeesMissingPaymentSetup} missing payment setup`}
        />
        <WorkspaceMetric
          icon={<Building2 aria-hidden="true" />}
          label="Review queue"
          value={snapshot.workspace.summary.reviewEmployees}
          detail="Employees currently failing payroll validation in this period"
        />
      </section>

      {incompleteEmployees.length > 0 ? (
        <WorkspaceAlert variant="warning">
          <span className="flex items-center gap-2">
            <TriangleAlert className="size-4" aria-hidden="true" />
            You have {incompleteEmployees.length} incomplete employee
            {incompleteEmployees.length === 1 ? "" : "s"}.
          </span>
        </WorkspaceAlert>
      ) : null}

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Payroll employee master"
          title="Payroll-linked employee register"
          description="This module references canonical HRMS employees and extends them with payroll status, payment setup, compensation visibility, and masked tax and bank identity details."
          actions={
            <Link className="mnx-button mnx-button-secondary" href="/payroll/employees/import">
              Import
            </Link>
          }
        />
        <form
          className="flex flex-wrap items-center gap-2"
          method="get"
          aria-label="Filter payroll employees"
        >
          <PeopleControlInput
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name, number, or department"
            className="min-w-60 flex-1"
          />
          <NativeSelect name="status" defaultValue={status} className="w-auto">
            <option value="">All eligibility</option>
            <option value="PAYROLL_ACTIVE">Payroll active</option>
            <option value="ON_HOLD">On hold</option>
            <option value="EXITED">Exited</option>
            <option value="NOT_ELIGIBLE">Not eligible</option>
          </NativeSelect>
          <Button type="submit" variant="inverse">
            Apply
          </Button>
          {(q || status) && (
            <Link className="mnx-button mnx-button-secondary" href="/payroll/employees">
              Clear
            </Link>
          )}
        </form>
        <PeopleTable>
          <PeopleTableHeader>
            <PeopleTableRow>
              <PeopleTableHead>Employee</PeopleTableHead>
              <PeopleTableHead>Organisation</PeopleTableHead>
              <PeopleTableHead>Compensation</PeopleTableHead>
              <PeopleTableHead>Payment setup</PeopleTableHead>
              <PeopleTableHead>Tax IDs</PeopleTableHead>
              <PeopleTableHead>Eligibility</PeopleTableHead>
            </PeopleTableRow>
          </PeopleTableHeader>
          <PeopleTableBody>
            {visibleEmployees.length === 0 ? (
              <PeopleTableRow>
                <PeopleTableCell className="text-sm text-[var(--mnx-muted)]">
                  No employees match this search.
                </PeopleTableCell>
              </PeopleTableRow>
            ) : null}
            {visibleEmployees.map((employee) => (
              <PeopleTableRow key={employee.id}>
                <PeopleTableCell>
                  <div className="space-y-1">
                    <Link
                      href={`/payroll/employees/${employee.id}`}
                      className="font-semibold text-[var(--mnx-text)] hover:text-[var(--mnx-accent-strong)] hover:underline"
                    >
                      {employee.employeeName}
                    </Link>
                    <div className="text-xs text-[var(--mnx-muted)]">
                      #{employee.employeeNumber} {employee.designation ? `• ${employee.designation}` : ""}
                    </div>
                    <div className="text-xs text-[var(--mnx-muted)]">
                      Join {formatPayrollDate(employee.joinDate)}
                      {employee.exitDate ? ` • Exit ${formatPayrollDate(employee.exitDate)}` : ""}
                    </div>
                  </div>
                </PeopleTableCell>
                <PeopleTableCell>
                  <div className="space-y-1 text-sm text-[var(--mnx-muted)]">
                    <div>{employee.departmentName ?? "No department"}</div>
                    <div>{employee.branchName ?? "No branch"}</div>
                    <div>{employee.employmentType ?? "No employment type"}</div>
                  </div>
                </PeopleTableCell>
                <PeopleTableCell>
                  <div className="space-y-1 text-sm">
                    <div className="text-[var(--mnx-text)]">
                      Monthly {formatPayrollMoney(employee.monthlyGross)}
                    </div>
                    <div className="text-[var(--mnx-muted)]">
                      Annual CTC {formatPayrollMoney(employee.annualCtc)}
                    </div>
                    <div className="text-xs text-[var(--mnx-muted)]">
                      Run status {employee.runStatus}
                    </div>
                  </div>
                </PeopleTableCell>
                <PeopleTableCell>
                  <div className="space-y-1 text-sm text-[var(--mnx-muted)]">
                    <div>{employee.paymentMode ?? "No payment mode"}</div>
                    <div>{employee.bankName ?? "No bank"}</div>
                    <div>{employee.bankAccountMasked ?? "No account"}</div>
                  </div>
                </PeopleTableCell>
                <PeopleTableCell>
                  <div className="space-y-1 text-sm text-[var(--mnx-muted)]">
                    <div>PAN {employee.panMasked ?? "Missing"}</div>
                    <div>UAN {employee.uanMasked ?? "Missing"}</div>
                    <div>IFSC {employee.ifscMasked ?? "Missing"}</div>
                  </div>
                </PeopleTableCell>
                <PeopleTableCell>
                  <div className="space-y-1 text-sm">
                    <div className="font-medium text-[var(--mnx-text)]">
                      {employee.payrollEligibility}
                    </div>
                    <div className="text-[var(--mnx-muted)]">
                      {employee.issueCount} payroll issues this period
                    </div>
                  </div>
                </PeopleTableCell>
              </PeopleTableRow>
            ))}
          </PeopleTableBody>
        </PeopleTable>
      </PeopleSection>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Standalone payroll employee surface"
          description="The reference corpus showed payroll as its own employee-facing subspace with salary details, investments, payslips, and loans. This register is the native Monolith entry point for that split."
        />
      </WorkspacePanel>
    </div>
  );
}

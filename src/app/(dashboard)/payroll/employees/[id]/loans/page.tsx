import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { listPayrollLoans } from "@/modules/payroll/loan-actions";
import { LoansClient } from "@/modules/payroll/components/loans-client";
import { getPayrollEmployeeDetail } from "@/modules/payroll/employee-detail-service";

// Phase 22: employee-scoped loan list/creation, matching the captured
// Zoho employee Loans tab.
export default async function PayrollEmployeeLoansPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const { id } = await params;
  const employee = await getPayrollEmployeeDetail(session.user.orgId, id);
  if (!employee) notFound();

  const loans = await listPayrollLoans(session.user.orgId, id);

  return (
    <WorkspacePanel className="space-y-4 p-5">
      <WorkspaceSectionHeading index="01" title="Loans" />
      <LoansClient
        loans={loans}
        employees={[{ id: employee.id, name: employee.name, employeeNumber: employee.employeeNumber }]}
        fixedEmployeeId={id}
      />
    </WorkspacePanel>
  );
}

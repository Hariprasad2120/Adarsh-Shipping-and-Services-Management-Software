import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { getEmployeeDeclaration } from "@/modules/payroll/investment-declaration-actions";
import { getPayrollEmployeeDetail } from "@/modules/payroll/employee-detail-service";
import { InvestmentDeclarationClient } from "@/modules/payroll/components/investment-declaration-client";

function currentFiscalYear() {
  const now = new Date();
  const startYear = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

// Phase 24-25: IT Declaration / Proof of Investments
// (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, page 00140).
export default async function PayrollEmployeeInvestmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const { id } = await params;
  const employee = await getPayrollEmployeeDetail(session.user.orgId, id);
  if (!employee) notFound();

  const fiscalYear = currentFiscalYear();
  const declaration = await getEmployeeDeclaration(session.user.orgId, id, fiscalYear);

  return (
    <WorkspacePanel className="space-y-4 p-5">
      <WorkspaceSectionHeading index="01" title="IT Declaration / Proof of Investments" />
      <InvestmentDeclarationClient
        employeeId={id}
        fiscalYear={fiscalYear}
        declaration={declaration ? { status: declaration.status, lines: declaration.lines } : null}
      />
    </WorkspacePanel>
  );
}

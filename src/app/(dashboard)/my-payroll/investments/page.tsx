import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { getEmployeeDeclaration } from "@/modules/payroll/investment-declaration-actions";
import { InvestmentDeclarationClient } from "@/modules/payroll/components/investment-declaration-client";

function currentFiscalYear() {
  const now = new Date();
  const startYear = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export default async function PayrollMyInvestmentsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const fiscalYear = currentFiscalYear();
  const declaration = await getEmployeeDeclaration(session.user.orgId, session.user.id, fiscalYear);

  return (
    <WorkspacePanel className="space-y-4 p-5">
      <WorkspaceSectionHeading index="01" title="Investment Declaration" />
      <InvestmentDeclarationClient
        employeeId={session.user.id}
        fiscalYear={fiscalYear}
        declaration={declaration ? { status: declaration.status, lines: declaration.lines } : null}
      />
    </WorkspacePanel>
  );
}

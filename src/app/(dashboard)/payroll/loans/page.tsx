import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { listPayrollLoans } from "@/modules/payroll/loan-actions";
import { LoansClient } from "@/modules/payroll/components/loans-client";
import { db } from "@/lib/db";

// Phase 22: reference loans (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md,
// page 00008). v1 scope: full loan CRUD + repayment tracking. Automatic EMI
// deduction inside the pay-run calculation engine is a documented near-term
// gap (docs/payroll/MONOLITH_PAYROLL_INTEGRATION_MAP.md).
export default async function PayrollLoansPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");
  const orgId = session.user.orgId;

  const [loans, employees] = await Promise.all([
    listPayrollLoans(orgId),
    db.user.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true, employeeNumber: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const employeeOptions = employees.map((e) => ({
    id: e.id,
    name: e.name,
    employeeNumber: e.employeeNumber == null ? "-" : String(e.employeeNumber),
  }));

  return (
    <div className="space-y-6">
      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading index="01" title="All Loans" />
        <LoansClient loans={loans} employees={employeeOptions} />
      </WorkspacePanel>
    </div>
  );
}

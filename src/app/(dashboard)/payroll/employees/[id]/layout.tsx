import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspaceBadge } from "@/components/layout/workspace";
import { EmployeeTabNav } from "@/modules/payroll/components/employee-tab-nav";
import { getPayrollEmployeeDetail } from "@/modules/payroll/employee-detail-service";

// Phase 5: employee payroll profile shell. Tab set matches the captured
// Zoho employee record exactly (Overview / Salary Details / Investments /
// Payslips & Forms / Loans) — docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md,
// pages 00027 and 00138-00164.
export default async function PayrollEmployeeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const { id } = await params;
  const employee = await getPayrollEmployeeDetail(session.user.orgId, id);
  if (!employee) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/payroll/employees"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Employees
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-[var(--mnx-text)]">
          {employee.employeeNumber} - {employee.name}
        </h1>
        <WorkspaceBadge variant={employee.active ? "success" : "neutral"}>
          {employee.active ? "Active" : "Inactive"}
        </WorkspaceBadge>
        {employee.designation ? (
          <span className="text-sm text-[var(--mnx-muted)]">{employee.designation}</span>
        ) : null}
      </div>
      <EmployeeTabNav employeeId={id} />
      {children}
    </div>
  );
}

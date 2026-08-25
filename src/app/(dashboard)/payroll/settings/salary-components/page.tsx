import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { listSalaryComponents } from "@/modules/payroll/salary-component-actions";
import { SalaryComponentsClient } from "@/modules/payroll/components/salary-components-client";

// Phase 7: reference settings_salary-components_earnings
// (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, page 00106).
export default async function PayrollSalaryComponentsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const components = await listSalaryComponents(session.user.orgId);

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/settings"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Settings
      </Link>
      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Salary Components"
          description="Configurable earnings, deductions, benefits, and reimbursements used to build salary templates and compute payroll."
        />
        <SalaryComponentsClient components={components} />
      </WorkspacePanel>
    </div>
  );
}

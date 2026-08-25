import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { listSalaryComponents } from "@/modules/payroll/salary-component-actions";
import { listSalaryTemplates } from "@/modules/payroll/salary-template-actions";
import { SalaryTemplatesClient } from "@/modules/payroll/components/salary-templates-client";

// Phase 8: reference settings_salary-templates
// (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, page 00107).
export default async function PayrollSalaryTemplatesPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const [components, templates] = await Promise.all([
    listSalaryComponents(session.user.orgId),
    listSalaryTemplates(session.user.orgId),
  ]);

  const earningComponents = components
    .filter((c) => c.category === "EARNING" && c.active)
    .map((c) => ({ id: c.id, name: c.name, category: c.category }));

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
        <WorkspaceSectionHeading index="01" title="Salary Templates" />
        <SalaryTemplatesClient templates={templates} earningComponents={earningComponents} />
      </WorkspacePanel>
    </div>
  );
}

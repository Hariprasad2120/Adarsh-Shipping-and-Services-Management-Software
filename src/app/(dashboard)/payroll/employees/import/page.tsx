import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { PayrollImportClient } from "@/modules/payroll/components/payroll-import-client";

// Phase 6: reference employees/import wizard
// (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, page 00115).
export default async function PayrollEmployeeImportPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/employees"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Employees
      </Link>
      <PayrollImportClient />
      <WorkspacePanel className="space-y-3 p-5">
        <WorkspaceSectionHeading index="04" title="Things to Note" />
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--mnx-muted)]">
          <li>Create all work locations under HRMS &gt; Branches before importing.</li>
          <li>Employees are matched by employee number — unmatched numbers are reported as errors, not created.</li>
          <li>Only payroll-owned fields are written: compensation breakup, payment mode, bank/PAN/UAN.</li>
          <li>Canonical employee records (name, joining, department) are owned by HRMS — use its bulk onboarding import for new hires.</li>
        </ul>
      </WorkspacePanel>
    </div>
  );
}

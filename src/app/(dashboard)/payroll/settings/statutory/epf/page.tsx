import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { getEpfConfig } from "@/modules/payroll/statutory-epf-actions";
import { EpfConfigClient } from "@/modules/payroll/components/epf-config-client";

// Phase 26: reference settings_statutory-details_list (EPF)
// (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, page 00108).
export default async function PayrollStatutoryEpfPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const config = await getEpfConfig(session.user.orgId);

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/settings/organization"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Organization &amp; Taxes
      </Link>
      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading index="01" title="Employees' Provident Fund" />
        <EpfConfigClient
          initial={{
            enabled: config.enabled,
            epfNumber: config.epfNumber,
            deductionCycle: config.deductionCycle,
            employeeContributionPercent: config.employeeContributionPercent,
            employerContributionPercent: config.employerContributionPercent,
            restrictToWageCeiling: config.restrictToWageCeiling,
            wageCeiling: config.wageCeiling,
            includeEmployerPfInCtc: config.includeEmployerPfInCtc,
            includeEdliInCtc: config.includeEdliInCtc,
            includeAdminChargesInCtc: config.includeAdminChargesInCtc,
            allowEmployeeOverride: config.allowEmployeeOverride,
            prorateRestrictedWage: config.prorateRestrictedWage,
            considerLopForApplicability: config.considerLopForApplicability,
            eligibleForAbry: config.eligibleForAbry,
          }}
        />
      </WorkspacePanel>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { getEsiConfig } from "@/modules/payroll/statutory-esi-actions";
import { EsiConfigClient } from "@/modules/payroll/components/esi-config-client";

// ESI has no field-level reference capture (unlike EPF), but its rates are
// nationally uniform statutory law, not guessed — same reasoning as EPF's
// settings page, sibling route to it.
export default async function PayrollStatutoryEsiPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const config = await getEsiConfig(session.user.orgId);

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
        <WorkspaceSectionHeading index="01" title="Employees' State Insurance" />
        <EsiConfigClient
          initial={{
            enabled: config.enabled,
            employeeContributionPercent: config.employeeContributionPercent,
            employerContributionPercent: config.employerContributionPercent,
            wageCeiling: config.wageCeiling,
          }}
        />
      </WorkspacePanel>
    </div>
  );
}

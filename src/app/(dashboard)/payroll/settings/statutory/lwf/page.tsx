import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { listLwfConfigs } from "@/modules/payroll/statutory-lwf-actions";
import { LwfConfigClient } from "@/modules/payroll/components/lwf-config-client";

export default async function PayrollStatutoryLwfPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const configs = await listLwfConfigs(session.user.orgId);

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
        <WorkspaceSectionHeading index="01" title="Labour Welfare Fund" />
        <LwfConfigClient
          configs={configs.map((c) => ({
            id: c.id,
            state: c.state,
            enabled: c.enabled,
            employeeAmount: c.employeeAmount,
            employerAmount: c.employerAmount,
          }))}
        />
      </WorkspacePanel>
    </div>
  );
}

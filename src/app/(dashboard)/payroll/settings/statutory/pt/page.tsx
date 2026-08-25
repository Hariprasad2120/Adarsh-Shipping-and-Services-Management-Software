import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { listPtSlabs } from "@/modules/payroll/statutory-pt-actions";
import { PtSlabsClient } from "@/modules/payroll/components/pt-slabs-client";

export default async function PayrollStatutoryPtPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const slabs = await listPtSlabs(session.user.orgId);

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
        <WorkspaceSectionHeading index="01" title="Professional Tax" />
        <PtSlabsClient
          slabs={slabs.map((s) => ({
            id: s.id,
            state: s.state,
            minGross: s.minGross,
            maxGross: s.maxGross,
            monthlyAmount: s.monthlyAmount,
          }))}
        />
      </WorkspacePanel>
    </div>
  );
}

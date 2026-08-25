import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { getBonusConfig } from "@/modules/payroll/statutory-bonus-actions";
import { BonusConfigClient } from "@/modules/payroll/components/bonus-config-client";

export default async function PayrollStatutoryBonusPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const config = await getBonusConfig(session.user.orgId);

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
        <WorkspaceSectionHeading index="01" title="Statutory Bonus" />
        <BonusConfigClient
          initial={{
            enabled: config.enabled,
            percent: config.percent,
            eligibilityWageCeiling: config.eligibilityWageCeiling,
            calculationWageCeiling: config.calculationWageCeiling,
          }}
        />
      </WorkspacePanel>
      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading index="02" title="Run annual bonus" description="Preview and confirm a Statutory Bonus payout for a fiscal year." />
        <Link href="/payroll/bonus/run" className="mnx-button mnx-button-primary inline-flex w-fit">
          Go to Bonus Run
        </Link>
      </WorkspacePanel>
    </div>
  );
}

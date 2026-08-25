import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { BonusRunClient } from "@/modules/payroll/components/bonus-run-client";

export default async function PayrollBonusRunPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  await requirePermission(session.user.id, "hrms.salary.manage");

  return (
    <div className="space-y-4">
      <Link
        href="/payroll/settings/statutory/bonus"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Bonus Settings
      </Link>
      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading index="01" title="Statutory Bonus Run" description="Preview eligible employees for a fiscal year, then confirm to post the run." />
        <BonusRunClient />
      </WorkspacePanel>
    </div>
  );
}

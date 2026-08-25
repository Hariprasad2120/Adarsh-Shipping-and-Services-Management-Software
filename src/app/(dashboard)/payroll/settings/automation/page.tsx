import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspaceAlert, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { listAutomationRules, listAutomationLogs } from "@/modules/payroll/automation-actions";
import { AutomationRulesClient } from "@/modules/payroll/components/automation-rules-client";

// Scoped payroll automation, not a generic workflow engine: a fixed set of
// real payroll lifecycle triggers wired to real existing actions
// (notification, to-do task). No custom trigger/action authoring.
export default async function PayrollAutomationPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const [rules, logs] = await Promise.all([
    listAutomationRules(session.user.orgId),
    listAutomationLogs(session.user.orgId),
  ]);

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
          title="Payroll Automation"
          description="Fixed set of real payroll triggers wired to real actions — not a generic workflow builder."
        />
        <WorkspaceAlert variant="info">
          Only two triggers are wired to real events right now: a loan being fully repaid (manual
          or auto payroll-deduction), and a salary revision being approved. &quot;Notify manager&quot; needs
          the employee to have a manager set in HRMS; &quot;Notify HR&quot;/&quot;Create to-do&quot; go to every
          user with salary-management permission.
        </WorkspaceAlert>
        <AutomationRulesClient
          rules={rules.map((r) => ({ id: r.id, trigger: r.trigger, actionType: r.actionType, enabled: r.enabled }))}
          logs={logs.map((l) => ({ id: l.id, triggeredAt: l.triggeredAt.toISOString(), subjectType: l.subjectType, outcome: l.outcome, detail: l.detail }))}
        />
      </WorkspacePanel>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleCheckBig, Settings2, TriangleAlert } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspaceAlert, WorkspaceMetric, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { getPayrollModuleSnapshot } from "@/modules/payroll/service";

export default async function PayrollSettingsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const snapshot = await getPayrollModuleSnapshot(session.user.orgId, new Date());
  const configuredCount = [
    snapshot.settings.defaultSalaryExpenseConfigured,
    snapshot.settings.defaultSalaryPayableConfigured,
    snapshot.settings.defaultBankConfigured,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <section className="mnx-workspace-metrics" aria-label="Payroll settings metrics">
        <WorkspaceMetric
          icon={<Settings2 aria-hidden="true" />}
          label="Accounting mappings"
          value={`${configuredCount}/3`}
          detail="Salary expense, salary payable, and bank configuration coverage"
        />
        <WorkspaceMetric
          icon={<CircleCheckBig aria-hidden="true" />}
          label="Payroll run readiness"
          value={snapshot.workspace.settingsConfigured ? "Ready" : "Partial"}
          detail="Posting readiness for the current period"
        />
        <WorkspaceMetric
          icon={<TriangleAlert aria-hidden="true" />}
          label="Review dependencies"
          value={snapshot.workspace.issues.length}
          detail="Validation issues currently affecting run approval"
        />
      </section>

      {!snapshot.workspace.settingsConfigured ? (
        <WorkspaceAlert variant="warning">
          The reference pay-schedule and settings screens are now mapped into this
          standalone Payroll area, but core posting settings still depend on the
          existing Accounting configuration surface.
        </WorkspaceAlert>
      ) : null}

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Settings map"
          description="The scrape corpus highlighted pay schedules, statutory components, salary components, claims and declarations, customisations, and automations as separate payroll configuration surfaces. This route is the standalone home for those settings in Monolith."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link className="mnx-button mnx-button-secondary" href="/payroll/settings/organization">
                Organization &amp; taxes
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/payroll/settings/work-locations">
                Work locations
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/payroll/settings/banking">
                Banking
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/payroll/settings/record-locking">
                Record locking
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/payroll/settings/branding">
                Branding
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/payroll/settings/communications">
                Communications &amp; integrations
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/payroll/settings/pay-schedule">
                Pay schedule
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/payroll/settings/salary-components">
                Salary components
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/payroll/settings/salary-templates">
                Salary templates
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/payroll/settings/fbp">
                Flexible benefit plan
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/accounting/settings">
                Accounting settings
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/hrms/salary-structure">
                Salary structure
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/hrms/salary-revisions">
                Salary revisions
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/payroll/settings/automation">
                Automation
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/payroll/settings/data-backup">
                Data backup / export
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/payroll/settings/loan-custom-fields">
                Loan custom fields
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/payroll/settings/portal-preferences">
                Portal preferences
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/payroll/settings/org-profile">
                Organisation profile
              </Link>
              <Link className="mnx-button mnx-button-secondary" href="/payroll/settings/reporting-tags">
                Reporting tags
              </Link>
            </div>
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4 text-sm text-[var(--mnx-muted)]">
            <strong className="block text-[var(--mnx-text)]">Pay schedule</strong>
            Pay-schedule UX is now represented in standalone Payroll, but a native persisted pay-schedule engine still needs implementation.
          </div>
          <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4 text-sm text-[var(--mnx-muted)]">
            <strong className="block text-[var(--mnx-text)]">Statutory setup</strong>
            EPF, ESI, and Statutory Bonus are configured under Organization &amp; taxes (national law, safe defaults).
            PT and LWF are also configurable there, but need your org&apos;s own state figures — nothing is guessed.
          </div>
          <div className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-4 text-sm text-[var(--mnx-muted)]">
            <strong className="block text-[var(--mnx-text)]">Automations</strong>
            A scoped set of real payroll triggers (loan fully repaid, salary revision approved) wired to
            real notification/to-do actions — not a general workflow builder. See Automation above.
          </div>
        </div>
      </WorkspacePanel>
    </div>
  );
}

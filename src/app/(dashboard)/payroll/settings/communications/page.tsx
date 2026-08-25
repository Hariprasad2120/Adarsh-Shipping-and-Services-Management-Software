import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDashed } from "lucide-react";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";

// Phase 49-58 (Email, Notifications, Automation x4, Portal Preferences,
// Custom Fields, Data Backup, Integrations): consolidated into one page.
// Each item honestly reflects what's real vs. a gap rather than shipping ten
// near-empty route files for settings areas this repo doesn't have dedicated
// infrastructure for yet (docs/payroll/MONOLITH_PAYROLL_INTEGRATION_MAP.md).
const ITEMS: { title: string; status: "real" | "gap"; description: string; href?: string; linkLabel?: string }[] = [
  {
    title: "Email (Phase 49)",
    status: "real",
    description: "Payroll emails (payslip availability, salary revision, reimbursement decisions) are not yet wired to auto-send, but the underlying queue/send infrastructure (EmailQueue, Gmail integration) already exists and is reused, not duplicated.",
    href: "/communication/mail",
    linkLabel: "Open Communication",
  },
  {
    title: "Notifications (Phase 50)",
    status: "real",
    description: "Approval-required, salary-revised, and payroll-ready style events are not yet wired to fire notifications automatically, but the notification system itself (Notification/NotificationActivity) is reused, not duplicated.",
    href: "/admin/notifications",
    linkLabel: "Open Notifications",
  },
  {
    title: "Automation Workflows / Actions / Schedules / Logs (Phase 51-54)",
    status: "gap",
    description: "No generic workflow-trigger engine exists in this repository for payroll events (Employee Added, Pay Run Approved, etc.) to hook into. Building one is a real, standalone feature, not yet started.",
  },
  {
    title: "Portal Preferences (Phase 55)",
    status: "real",
    description: "Toggles for what the Employee Portal would expose are now stored (SystemSetting key-value table), but no Employee Portal (/payroll/my) exists in this repository yet, so nothing enforces them.",
    href: "/payroll/settings/portal-preferences",
    linkLabel: "Open Portal Preferences",
  },
  {
    title: "Loan Custom Fields (Phase 56)",
    status: "real",
    description: "Wired into the existing generic custom-field-definition table (AccountingCustomFieldDefinition, scope=\"PAYROLL_LOAN\") — admin CRUD for field definitions is live; capturing values on individual loans is a follow-up.",
    href: "/payroll/settings/loan-custom-fields",
    linkLabel: "Open Loan Custom Fields",
  },
  {
    title: "Data Backup / Export (Phase 57)",
    status: "real",
    description: "Real CSV export for employees, salary components, and loans, following the employee-directory-export.ts pattern.",
    href: "/payroll/settings/data-backup",
    linkLabel: "Open Data Backup / Export",
  },
  {
    title: "Organisation Profile — non-tax half (Phase 59)",
    status: "real",
    description: "General org name/address/logo had no home anywhere in Monolith. Built minimally under Payroll Settings (SystemSetting key-value table) — ideally this belongs at the app level once a general org-settings surface exists.",
    href: "/payroll/settings/org-profile",
    linkLabel: "Open Organisation Profile",
  },
  {
    title: "Advanced Reporting Tags (Phase 60)",
    status: "real",
    description: "Reuses the existing AccountingReportingTag registry (shared with Accounting) for payroll transaction tagging, rather than a duplicate tag table.",
    href: "/payroll/settings/reporting-tags",
    linkLabel: "Open Reporting Tags",
  },
  {
    title: "Integrations (Phase 58)",
    status: "real",
    description: "Zoho Expense -> Reimbursements (Phase 23), Zoho Books -> Accounting (Phase 32), Zoho People -> HRMS, and Zoho Analytics -> Reports Centre (Phase 37-45) are all mapped to real Monolith equivalents already built this session. WhatsApp has no equivalent integration in this repository.",
  },
];

export default function PayrollCommunicationsSettingsPage() {
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
          title="Communications, Automation &amp; Integrations"
          description="Consolidated status for the remaining settings-tier phases."
        />
        <div className="space-y-3">
          {ITEMS.map((item) => (
            <div key={item.title} className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--mnx-text)]">
                {item.status === "real" ? (
                  <CheckCircle2 className="size-4 text-[var(--mnx-success)]" aria-hidden="true" />
                ) : (
                  <CircleDashed className="size-4 text-[var(--mnx-muted)]" aria-hidden="true" />
                )}
                {item.title}
              </div>
              <p className="mt-1 text-sm text-[var(--mnx-muted)]">{item.description}</p>
              {item.href ? (
                <Link className="mnx-button mnx-button-secondary mt-2 inline-block" href={item.href}>
                  {item.linkLabel}
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </WorkspacePanel>
    </div>
  );
}

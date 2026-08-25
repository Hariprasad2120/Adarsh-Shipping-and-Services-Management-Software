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
    status: "gap",
    description: "No settings toggle exists yet to control what employees can see/do in the Employee Portal (/payroll/my) — it currently exposes a fixed feature set to everyone.",
  },
  {
    title: "Loan Custom Fields (Phase 56)",
    status: "real",
    description: "This repository has a generic custom-field engine (CustomField model) elsewhere, but it is not wired into the Loan model yet.",
  },
  {
    title: "Data Backup / Export (Phase 57)",
    status: "gap",
    description: "No CSV/export action exists for Payroll data yet, though the repo has an established export pattern (employee-directory-export.ts) that a payroll export could follow.",
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

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspaceAlert, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { Button } from "@/components/ui/button";
import {
  getPayrollPortalPreferences,
  savePayrollPortalPreferencesAction,
  type PayrollPortalPreferences,
} from "@/modules/payroll/portal-preferences";

const TOGGLES: { key: keyof PayrollPortalPreferences; label: string; description: string }[] = [
  {
    key: "showPayslips",
    label: "Payslips",
    description: "Employees can view and download their own payslips.",
  },
  {
    key: "showLoanRequests",
    label: "Loan requests",
    description: "Employees can submit loan requests for approval.",
  },
  {
    key: "showInvestmentDeclarations",
    label: "Investment declarations",
    description: "Employees can submit and edit tax investment declarations.",
  },
  {
    key: "showAttendance",
    label: "Attendance",
    description: "Employees can view their own attendance and shift records.",
  },
  {
    key: "allowProfileEdits",
    label: "Profile edits",
    description: "Employees can edit their own contact and bank details, subject to review.",
  },
];

// Zoho reference settings_portal_preferences. No Employee Portal
// (/payroll/my) exists in this repository yet, so these toggles are stored
// but not enforced by anything — see portal-preferences.ts for the storage
// approach (reused SystemSetting key-value table, no new model/migration).
export default async function PayrollPortalPreferencesSettingsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const preferences = await getPayrollPortalPreferences(session.user.orgId);

  async function saveAction(formData: FormData) {
    "use server";
    const next: PayrollPortalPreferences = {
      showPayslips: formData.get("showPayslips") === "on",
      showLoanRequests: formData.get("showLoanRequests") === "on",
      showInvestmentDeclarations: formData.get("showInvestmentDeclarations") === "on",
      showAttendance: formData.get("showAttendance") === "on",
      allowProfileEdits: formData.get("allowProfileEdits") === "on",
    };
    const result = await savePayrollPortalPreferencesAction(next);
    if (!result.ok) throw new Error(result.error);
  }

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
          title="Portal Preferences"
          description="Controls what the Employee Portal would expose to employees, once one exists."
        />
        <WorkspaceAlert variant="warning">
          Not yet enforced: this repository has no Employee Portal route
          (/payroll/my). These toggles are saved for when one is built, but
          nothing currently reads them to hide or show anything.
        </WorkspaceAlert>
        <form action={saveAction} className="space-y-3">
          {TOGGLES.map((toggle) => (
            <label
              key={toggle.key}
              className="flex items-start gap-3 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-3 text-sm"
            >
              <input
                defaultChecked={preferences[toggle.key]}
                name={toggle.key}
                type="checkbox"
                className="mt-0.5"
              />
              <span>
                <span className="block font-medium text-[var(--mnx-text)]">{toggle.label}</span>
                <span className="text-[var(--mnx-muted)]">{toggle.description}</span>
              </span>
            </label>
          ))}
          <Button type="submit">Save preferences</Button>
        </form>
      </WorkspacePanel>
    </div>
  );
}

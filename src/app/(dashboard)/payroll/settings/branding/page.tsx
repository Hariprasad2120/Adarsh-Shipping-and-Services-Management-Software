import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WorkspaceAlert, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";

// Phase 48: reference settings_branding (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md,
// page 00089). Theme/accent-color branding is already app-wide in Monolith
// (OrganisationThemeSettings, applied in the root dashboard layout) — Payroll
// pages already inherit it automatically. No duplicate branding system.
export default function PayrollBrandingSettingsPage() {
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
          title="Branding"
          description="Theme and accent color are configured once for the whole organisation and apply to every module, including Payroll."
        />
        <Link className="mnx-button mnx-button-secondary" href="/admin/design-system">
          Open Organisation Branding
        </Link>
        <WorkspaceAlert variant="info">
          Payslip PDFs render with a fixed neutral style — they are generated
          server-side (@react-pdf/renderer) and are not theme-aware.
        </WorkspaceAlert>
      </WorkspacePanel>
    </div>
  );
}

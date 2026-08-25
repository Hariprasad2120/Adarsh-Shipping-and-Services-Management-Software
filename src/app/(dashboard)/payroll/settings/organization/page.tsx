import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { getPayrollOrgTaxProfile } from "@/modules/payroll/org-tax-profile-actions";
import { OrgTaxProfileClient } from "@/modules/payroll/components/org-tax-profile-client";
import { getEpfConfig } from "@/modules/payroll/statutory-epf-actions";
import { getEsiConfig } from "@/modules/payroll/statutory-esi-actions";
import { listPtSlabs } from "@/modules/payroll/statutory-pt-actions";
import { listLwfConfigs } from "@/modules/payroll/statutory-lwf-actions";
import { getBonusConfig } from "@/modules/payroll/statutory-bonus-actions";

// PT/LWF are state-specific slab tables — no default VALUES are guessed
// (a real compliance-risk if wrong), but the org-configurable infrastructure
// is fully built: org enters their own state's correct figures. Statutory
// Bonus is central law (Payment of Bonus Act, 1965), safe to default like
// EPF/ESI.

// Phase 11: reference settings_orgprofile / settings_statutory-details_list /
// settings_taxes / settings_employee_contractor
// (docs/payroll/ZOHO_PAYROLL_REFERENCE_MANIFEST.md, pages 00101/00108/00110/00096).
// Organisation Profile (name/logo/address) is NOT payroll-specific and has no
// canonical home in Monolith yet — not duplicated here, flagged as a gap.
// Statutory component configuration (EPF/ESI/PT/LWF/Bonus rates) is deep
// enough to be its own phase (26) — shown here as an honest status list.
export default async function PayrollOrganizationSettingsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const [profile, epfConfig, esiConfig, ptSlabs, lwfConfigs, bonusConfig] = await Promise.all([
    getPayrollOrgTaxProfile(session.user.orgId),
    getEpfConfig(session.user.orgId),
    getEsiConfig(session.user.orgId),
    listPtSlabs(session.user.orgId),
    listLwfConfigs(session.user.orgId),
    getBonusConfig(session.user.orgId),
  ]);
  const ptStates = new Set(ptSlabs.map((s) => s.state)).size;
  const lwfStates = lwfConfigs.filter((c) => c.enabled).length;

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
          title="Tax Details"
          description="Organisation TDS deductor details used for Form 16/24Q filing."
        />
        <OrgTaxProfileClient
          initial={{
            pan: profile?.pan ?? "",
            tan: profile?.tan ?? "",
            tdsCircleAoCode: profile?.tdsCircleAoCode ?? "",
            taxPaymentFrequency: profile?.taxPaymentFrequency ?? "",
            deductorType: (profile?.deductorType as "EMPLOYEE" | "NON_EMPLOYEE") ?? "EMPLOYEE",
            deductorName: profile?.deductorName ?? "",
            deductorFatherName: profile?.deductorFatherName ?? "",
          }}
        />
      </WorkspacePanel>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="02"
          title="Statutory Components"
          description="EPF/ESI/Bonus use safe national defaults. PT/LWF need your org's own state figures — nothing is pre-filled."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/payroll/settings/statutory/epf"
            className="flex items-center justify-between rounded-[var(--mn-radius-panel)] border border-[var(--mnx-accent)] bg-[var(--mnx-surface-soft)] p-3 text-sm hover:bg-[var(--mnx-surface)]"
          >
            <span className="text-[var(--mnx-text)]">EPF</span>
            <span className="inline-flex items-center gap-1 text-xs text-[var(--mnx-accent-strong)]">
              {epfConfig.enabled ? `${epfConfig.employeeContributionPercent}% / ${epfConfig.employerContributionPercent}%` : "Disabled"}
              <ArrowRight className="size-3" aria-hidden="true" />
            </span>
          </Link>
          <Link
            href="/payroll/settings/statutory/esi"
            className="flex items-center justify-between rounded-[var(--mn-radius-panel)] border border-[var(--mnx-accent)] bg-[var(--mnx-surface-soft)] p-3 text-sm hover:bg-[var(--mnx-surface)]"
          >
            <span className="text-[var(--mnx-text)]">ESI</span>
            <span className="inline-flex items-center gap-1 text-xs text-[var(--mnx-accent-strong)]">
              {esiConfig.enabled ? `${esiConfig.employeeContributionPercent}% / ${esiConfig.employerContributionPercent}%` : "Disabled"}
              <ArrowRight className="size-3" aria-hidden="true" />
            </span>
          </Link>
          <Link
            href="/payroll/settings/statutory/pt"
            className="flex items-center justify-between rounded-[var(--mn-radius-panel)] border border-[var(--mnx-accent)] bg-[var(--mnx-surface-soft)] p-3 text-sm hover:bg-[var(--mnx-surface)]"
          >
            <span className="text-[var(--mnx-text)]">Professional Tax</span>
            <span className="inline-flex items-center gap-1 text-xs text-[var(--mnx-accent-strong)]">
              {ptStates > 0 ? `${ptStates} state${ptStates === 1 ? "" : "s"}` : "Not configured"}
              <ArrowRight className="size-3" aria-hidden="true" />
            </span>
          </Link>
          <Link
            href="/payroll/settings/statutory/lwf"
            className="flex items-center justify-between rounded-[var(--mn-radius-panel)] border border-[var(--mnx-accent)] bg-[var(--mnx-surface-soft)] p-3 text-sm hover:bg-[var(--mnx-surface)]"
          >
            <span className="text-[var(--mnx-text)]">Labour Welfare Fund</span>
            <span className="inline-flex items-center gap-1 text-xs text-[var(--mnx-accent-strong)]">
              {lwfStates > 0 ? `${lwfStates} state${lwfStates === 1 ? "" : "s"}` : "Not configured"}
              <ArrowRight className="size-3" aria-hidden="true" />
            </span>
          </Link>
          <Link
            href="/payroll/settings/statutory/bonus"
            className="flex items-center justify-between rounded-[var(--mn-radius-panel)] border border-[var(--mnx-accent)] bg-[var(--mnx-surface-soft)] p-3 text-sm hover:bg-[var(--mnx-surface)]"
          >
            <span className="text-[var(--mnx-text)]">Statutory Bonus</span>
            <span className="inline-flex items-center gap-1 text-xs text-[var(--mnx-accent-strong)]">
              {bonusConfig.enabled ? `${bonusConfig.percent}%` : "Disabled"}
              <ArrowRight className="size-3" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="space-y-2 p-5">
        <WorkspaceSectionHeading index="03" title="Employees & Contractors" />
        <p className="text-sm text-[var(--mnx-muted)]">
          This repository has no contractor concept distinct from employees —
          the Contractors module from the reference is not applicable until
          that distinction exists in HRMS.
        </p>
      </WorkspacePanel>
    </div>
  );
}

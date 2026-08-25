import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspaceAlert, WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { Button } from "@/components/ui/button";
import {
  getOrganisationProfile,
  saveOrganisationProfileAction,
  type OrganisationProfile,
} from "@/modules/core/organisation/org-profile-settings";

// Zoho reference settings_orgprofile (non-tax half — name, address, logo).
// Payroll's settings/organization page already covers the tax half
// (PAN/TAN, TDS circle). General company identity has no home anywhere else
// in Monolith today (confirmed: no orgprofile/OrganisationProfile page
// app-wide), so this is built here, minimally, under Payroll Settings.
// Ideally this belongs at the app level (it applies to every module, not
// just Payroll) — ownership should move once an app-level settings surface
// exists.
export default async function PayrollOrgProfileSettingsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const profile = await getOrganisationProfile(session.user.orgId);

  async function saveAction(formData: FormData) {
    "use server";
    const next: OrganisationProfile = {
      legalName: String(formData.get("legalName") ?? ""),
      addressLine1: String(formData.get("addressLine1") ?? ""),
      addressLine2: String(formData.get("addressLine2") ?? ""),
      city: String(formData.get("city") ?? ""),
      state: String(formData.get("state") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      country: String(formData.get("country") ?? ""),
      logoUrl: String(formData.get("logoUrl") ?? ""),
    };
    const result = await saveOrganisationProfileAction(next);
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
          title="Organisation Profile"
          description="General company identity — name, registered address, and logo. Separate from the PAN/TAN tax profile below."
          actions={
            <Link className="mnx-button mnx-button-secondary" href="/payroll/settings/organization">
              Tax profile (PAN/TAN)
            </Link>
          }
        />
        <WorkspaceAlert variant="info">
          This is currently scoped to Payroll Settings, but the data itself is
          not payroll-specific — it belongs at the app level once a general
          organisation-settings surface exists in Monolith.
        </WorkspaceAlert>
        <form action={saveAction} className="grid gap-3 md:grid-cols-2">
          <label className="mnx-field md:col-span-2">
            <span>Organisation name</span>
            <input defaultValue={profile.legalName} name="legalName" required />
          </label>
          <label className="mnx-field md:col-span-2">
            <span>Address line 1</span>
            <input defaultValue={profile.addressLine1} name="addressLine1" />
          </label>
          <label className="mnx-field md:col-span-2">
            <span>Address line 2</span>
            <input defaultValue={profile.addressLine2} name="addressLine2" />
          </label>
          <label className="mnx-field">
            <span>City</span>
            <input defaultValue={profile.city} name="city" />
          </label>
          <label className="mnx-field">
            <span>State</span>
            <input defaultValue={profile.state} name="state" />
          </label>
          <label className="mnx-field">
            <span>Postal code</span>
            <input defaultValue={profile.postalCode} name="postalCode" />
          </label>
          <label className="mnx-field">
            <span>Country</span>
            <input defaultValue={profile.country} name="country" />
          </label>
          <label className="mnx-field md:col-span-2">
            <span>Logo URL</span>
            <input defaultValue={profile.logoUrl} name="logoUrl" placeholder="https://…" type="url" />
          </label>
          <div className="md:col-span-2">
            <Button type="submit">Save profile</Button>
          </div>
        </form>
      </WorkspacePanel>
    </div>
  );
}

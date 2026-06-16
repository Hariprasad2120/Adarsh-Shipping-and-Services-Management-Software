import Link from "next/link";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getAppraisalSettings } from "@/modules/ams/settings";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const allowed = await can(session.user.id, "admin.org.manage");
  if (!allowed) redirect("/dashboard");

  const settings = await getAppraisalSettings(session.user.orgId!);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-on-surface-variant hover:text-on-surface-variant">
          ← Admin
        </Link>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface p-6">
        <h2 className="ds-h2 mb-4 text-on-surface-variant">Reviewer Availability</h2>
        <SettingsClient
          initialDays={settings.availabilityDeadlineDays}
          initialWeights={settings.reviewerRoleWeights}
        />
      </div>
    </div>
  );
}

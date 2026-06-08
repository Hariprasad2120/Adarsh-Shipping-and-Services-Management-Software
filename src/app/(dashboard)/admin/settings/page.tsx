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
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          ← Admin
        </Link>
        <h1 className="ds-h1 mt-2 text-gray-900">Appraisal Settings</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="ds-h2 mb-4 text-gray-900">Reviewer Availability</h2>
        <SettingsClient
          initialDays={settings.availabilityDeadlineDays}
          initialWeights={settings.reviewerRoleWeights}
        />
      </div>
    </div>
  );
}

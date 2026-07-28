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
        <Link href="/admin" className="text-sm text-mono-muted hover:text-mono-muted">
          ← Admin
        </Link>
      </div>

      <div className="rounded-xl border border-mono-border bg-mono-card p-6">
        <h2 className="monolith-h2 mb-4 text-mono-muted">Reviewer Availability</h2>
        <SettingsClient
          initialDays={settings.availabilityDeadlineDays}
          initialWeights={settings.reviewerRoleWeights}
        />
      </div>
    </div>
  );
}

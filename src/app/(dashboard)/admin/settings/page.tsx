import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getAppraisalSettings } from "@/modules/ams/settings";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { AdminPanel, AdminPanelHeader } from "@/modules/admin/components/admin-workspace";

export default async function AdminSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const allowed = await can(session.user.id, "admin.org.manage");
  if (!allowed) redirect("/dashboard");

  const settings = await getAppraisalSettings(session.user.orgId!);

  return (
    <AdminPanel>
      <AdminPanelHeader
        eyebrow="Review policy"
        title="Reviewer availability and weighting"
        description="Set the response deadline and relative influence of each reviewer role."
      />
      <div className="mnx-admin-panel-body">
        <SettingsClient
          initialDays={settings.availabilityDeadlineDays}
          initialWeights={settings.reviewerRoleWeights}
        />
      </div>
    </AdminPanel>
  );
}

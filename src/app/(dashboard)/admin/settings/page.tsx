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
  const canManageAccountingDemo = await can(
    session.user.id,
    "accounting.settings.manage",
  );

  const settings = await getAppraisalSettings(session.user.orgId!);

  return (
    <AdminPanel>
      <AdminPanelHeader
        eyebrow="Organisation settings"
        title="Appraisal controls and Accounting demo"
        description="Maintain reviewer policy and trigger a dedicated July 2026 Accounting demo dataset from one admin workspace."
      />
      <div className="mnx-admin-panel-body">
        <SettingsClient
          initialDays={settings.availabilityDeadlineDays}
          initialWeights={settings.reviewerRoleWeights}
          canManageAccountingDemo={canManageAccountingDemo}
        />
      </div>
    </AdminPanel>
  );
}

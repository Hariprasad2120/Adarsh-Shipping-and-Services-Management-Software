import { getSession } from "@/lib/auth";
import { getVisibleSections } from "@/lib/navigation";
import { loadCaps } from "@/lib/rbac";
import {
  TOGGLEABLE_MODULE_SECTION_IDS,
  type ToggleableModuleSectionId,
} from "@/modules/core/organisation/module-config";
import { getEnabledModuleIds } from "@/modules/core/organisation/module-settings";
import { getDashboardModuleSnapshot } from "@/modules/dashboard/service";
import { getDashboardWidgets, getMe, getTeamReportees } from "@/modules/hrms/service";
import { DashboardWidgetsData, UserProfile } from "@/modules/hrms/types";
import { isChaEdition } from "@/lib/app-edition";
import { redirect } from "next/navigation";
import { HrmsPortalClient } from "./portal-client";

const TOGGLEABLE_MODULE_SET = new Set<string>(TOGGLEABLE_MODULE_SECTION_IDS);

async function getPermittedModuleSnapshot(userId: string, orgId: string) {
  const [caps, enabledModuleIds] = await Promise.all([
    loadCaps(userId),
    getEnabledModuleIds(orgId),
  ]);
  const visibleModuleSections = getVisibleSections(caps, enabledModuleIds).filter(
    (section): section is typeof section & { id: ToggleableModuleSectionId } =>
      TOGGLEABLE_MODULE_SET.has(section.id),
  );
  const moduleSnapshot = await getDashboardModuleSnapshot({
    orgId,
    userId,
    caps,
    visibleModuleIds: visibleModuleSections.map((section) => section.id),
  });
  const permittedHrefsByModule = new Map(
    visibleModuleSections.map((section) => [
      section.id,
      new Set([section.href, ...section.items.map((item) => item.href)]),
    ]),
  );

  return {
    ...moduleSnapshot,
    modules: moduleSnapshot.modules.map((module) => ({
      ...module,
      actions: module.actions.filter((action) =>
        permittedHrefsByModule.get(module.id)?.has(action.href),
      ),
    })),
  };
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (isChaEdition()) redirect("/cha");

  const orgId = session.user.orgId!;

  const [profileData, dashboardData, reportees, permittedModuleSnapshot] =
    await Promise.all([
      getMe(session.user.id),
      getDashboardWidgets(session.user.id, orgId),
      getTeamReportees(session.user.id, orgId),
      getPermittedModuleSnapshot(session.user.id, orgId),
    ]);

  const initialProfile: UserProfile = {
    ...profileData.user,
    attendanceStatus: profileData.attendanceStatus,
    totalInTime: profileData.totalInTime,
    widgets: profileData.widgets,
    pendingCounts: profileData.pendingCounts,
  };

  return (
    <HrmsPortalClient
      sessionUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
      initialProfile={initialProfile}
      initialWidgetsData={dashboardData as DashboardWidgetsData}
      initialReportees={reportees}
      initialModuleSnapshot={permittedModuleSnapshot}
    />
  );
}

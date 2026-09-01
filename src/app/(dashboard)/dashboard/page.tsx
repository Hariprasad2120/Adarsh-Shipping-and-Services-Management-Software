import { getDashboardContext } from "@/lib/dashboard-context";
import { getVisibleSections } from "@/lib/navigation";
import type { Caps } from "@/lib/rbac";
import {
  TOGGLEABLE_MODULE_SECTION_IDS,
  type ToggleableModuleSectionId,
} from "@/modules/core/organisation/module-config";
import { getDashboardCommandCenterSnapshot } from "@/modules/dashboard/command-center";
import { getDashboardModuleSnapshot } from "@/modules/dashboard/service";
import type { DashboardCommandCenterSnapshot } from "@/modules/dashboard/types";
import { getDashboardWidgets, getMe } from "@/modules/hrms/service";
import { DashboardWidgetsData, UserProfile } from "@/modules/hrms/types";
import { isChaEdition } from "@/lib/app-edition";
import { redirect } from "next/navigation";
import { HrmsPortalClient } from "./portal-client";

const TOGGLEABLE_MODULE_SET = new Set<string>(TOGGLEABLE_MODULE_SECTION_IDS);

async function getPermittedModuleSnapshot(
  userId: string,
  orgId: string,
  caps: Caps,
  enabledModuleIds: ToggleableModuleSectionId[],
) {
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

async function getPermittedCommandCenterSnapshot(
  userId: string,
  orgId: string,
  caps: Caps,
  moduleSnapshot: Awaited<ReturnType<typeof getPermittedModuleSnapshot>>,
): Promise<DashboardCommandCenterSnapshot> {
  return getDashboardCommandCenterSnapshot({
    userId,
    orgId,
    caps,
    moduleSnapshot,
  });
}

export default async function DashboardPage() {
  const context = await getDashboardContext();
  if (!context) redirect("/login");
  if (!context.orgId) redirect("/setup");
  if (isChaEdition()) redirect("/cha");

  const { session, orgId, caps, enabledModuleIds } = context;

  const [profileData, dashboardData, permittedModuleSnapshot] =
    await Promise.all([
      getMe(session.user.id),
      getDashboardWidgets(session.user.id, orgId),
      getPermittedModuleSnapshot(
        session.user.id,
        orgId,
        caps,
        enabledModuleIds,
      ),
    ]);
  const commandCenterSnapshot = await getPermittedCommandCenterSnapshot(
    session.user.id,
    orgId,
    caps,
    permittedModuleSnapshot,
  );

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
      initialCommandCenterSnapshot={commandCenterSnapshot}
    />
  );
}

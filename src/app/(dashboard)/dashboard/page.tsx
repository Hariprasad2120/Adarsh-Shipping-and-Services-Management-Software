import { auth } from "@/lib/auth";
import { getOrg } from "@/modules/core/organisation/service";
import { listUsersForDashboard } from "@/modules/core/user/service";
import { getDashboardWidgets, getMe, getTeamReportees } from "@/modules/hrms/service";
import { DashboardWidgetsData, UserProfile } from "@/modules/hrms/types";
import { isChaEdition } from "@/lib/app-edition";
import { redirect } from "next/navigation";
import { HrmsPortalClient } from "./portal-client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (isChaEdition()) redirect("/cha");

  const orgId = session.user.orgId!;

  const [org, users, profileData, dashboardData, reportees] = await Promise.all([
    getOrg(orgId),
    listUsersForDashboard(orgId, { active: true }),
    getMe(session.user.id),
    getDashboardWidgets(session.user.id, orgId),
    getTeamReportees(session.user.id, orgId),
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
      departments={org?.departments ?? []}
      branches={org?.branches ?? []}
      initialUsers={users}
      initialProfile={initialProfile}
      initialWidgetsData={dashboardData as DashboardWidgetsData}
      initialReportees={reportees}
    />
  );
}

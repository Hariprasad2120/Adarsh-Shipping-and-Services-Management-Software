"use client";

import { Building2, Sparkles, Users2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MonolithPage } from "@/components/monolith/foundation";
import { WorkspaceLoadingState } from "@/components/monolith/workspace-states";
import type { DashboardModuleSnapshot } from "@/modules/dashboard/types";
import type { DashboardWidgetsData, UserProfile } from "@/modules/hrms/types";
import { AttendanceCommand } from "./_components/attendance-command";
import { DashboardOrganization } from "./_components/dashboard-organization";
import { DashboardOverview } from "./_components/dashboard-overview";
import { DashboardTeam } from "./_components/dashboard-team";
import type {
  DashboardTab,
  PunchAction,
  ReporteeSummary,
} from "./_components/dashboard-types";

interface HrmsPortalClientProps {
  sessionUser: { id: string; name: string; email: string };
  initialProfile: UserProfile;
  initialWidgetsData: DashboardWidgetsData;
  initialReportees: ReporteeSummary[];
  initialModuleSnapshot: DashboardModuleSnapshot;
}

type ProfilePayload = {
  user: Pick<
    UserProfile,
    "id" | "employeeNo" | "name" | "email" | "designation" | "department" | "branch" | "manager" | "photo"
  >;
  widgets: UserProfile["widgets"];
  attendanceStatus: UserProfile["attendanceStatus"];
  totalInTime: UserProfile["totalInTime"];
  pendingCounts?: UserProfile["pendingCounts"];
};

type OrganizationPayload = {
  departments: unknown[];
  branches: unknown[];
  employees: unknown[];
};

const tabs: {
  id: DashboardTab;
  label: string;
  detail: string;
  icon: typeof Sparkles;
}[] = [
  {
    id: "myspace",
    label: "My space",
    detail: "Your day, tasks, and next signals",
    icon: Sparkles,
  },
  {
    id: "team",
    label: "Team",
    detail: "Reportees and live attendance",
    icon: Users2,
  },
  {
    id: "organization",
    label: "Organization",
    detail: "People, policies, and company news",
    icon: Building2,
  },
];

function toUserProfile(raw: ProfilePayload): UserProfile {
  return {
    id: raw.user.id,
    employeeNo: raw.user.employeeNo,
    name: raw.user.name,
    email: raw.user.email,
    designation: raw.user.designation,
    department: raw.user.department,
    branch: raw.user.branch,
    manager: raw.user.manager,
    photo: raw.user.photo,
    attendanceStatus: raw.attendanceStatus,
    totalInTime: raw.totalInTime,
    widgets: raw.widgets,
    pendingCounts: raw.pendingCounts,
  };
}

async function readApiResponse<T>(response: Response) {
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error?.message || "The dashboard could not be updated.");
  }
  return payload.data as T;
}

export function HrmsPortalClient({
  sessionUser,
  initialProfile,
  initialWidgetsData,
  initialReportees,
  initialModuleSnapshot,
}: HrmsPortalClientProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("myspace");
  const [profile, setProfile] = useState(initialProfile);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [reportees, setReportees] = useState(initialReportees);
  const [widgets, setWidgets] = useState(initialWidgetsData);
  const [moduleSnapshot, setModuleSnapshot] = useState(initialModuleSnapshot);
  const [organization, setOrganization] = useState<OrganizationPayload | null>(null);
  const organizationRequestRef = useRef(false);

  useEffect(() => {
    if (activeTab !== "organization" || organization || organizationRequestRef.current) return;
    let active = true;
    organizationRequestRef.current = true;
    void fetch("/api/dashboard/organization")
      .then((response) => readApiResponse<OrganizationPayload>(response))
      .then((payload) => {
        if (active) setOrganization(payload);
      })
      .finally(() => {
        organizationRequestRef.current = false;
      });
    return () => {
      active = false;
    };
  }, [activeTab, organization]);

  async function refreshDashboard() {
    const [profileResponse, widgetsResponse, reporteesResponse] = await Promise.all([
      fetch("/api/hrms/me"),
      fetch("/api/hrms/dashboard"),
      fetch("/api/hrms/team/reportees"),
    ]);

    const [profilePayload, widgetsPayload, reporteesPayload] = await Promise.all([
      readApiResponse<ProfilePayload>(profileResponse),
      readApiResponse<DashboardWidgetsData>(widgetsResponse),
      readApiResponse<ReporteeSummary[]>(reporteesResponse),
    ]);

    const nextProfile = toUserProfile(profilePayload);
    setProfile(nextProfile);
    setWidgets(widgetsPayload);
    setReportees(reporteesPayload);
    setModuleSnapshot((current) => ({
      ...current,
      modules: current.modules.map((module) =>
        module.id === "attendance"
          ? {
              ...module,
              primaryMetric: {
                ...module.primaryMetric,
                value: nextProfile.attendanceStatus === "YET_TO_CHECK_IN" ? 0 : 1,
              },
            }
          : module,
      ),
    }));
  }

  async function handlePunchAction(action: PunchAction) {
    setAttendanceLoading(true);

    try {
      const response = await fetch("/api/hrms/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await readApiResponse(response);
      await refreshDashboard();
    } catch (error) {
      throw error;
    } finally {
      setAttendanceLoading(false);
    }
  }

  return (
    <MonolithPage>
      <AttendanceCommand
        profile={profile}
        loading={attendanceLoading}
        onPunchAction={handlePunchAction}
      />

      <nav className="mnx-dashboard-tabs" aria-label="Dashboard workspaces">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              className={isActive ? "is-active" : ""}
              onClick={() => setActiveTab(tab.id)}
              aria-current={isActive ? "page" : undefined}
            >
              <span><Icon size={18} /></span>
              <span><b>{tab.label}</b><small>{tab.detail}</small></span>
            </button>
          );
        })}
      </nav>

      <div className="mnx-dashboard-tab-content">
        {activeTab === "myspace" ? (
          <DashboardOverview
            profile={profile}
            sessionUser={sessionUser}
            data={widgets}
            moduleSnapshot={moduleSnapshot}
          />
        ) : null}
        {activeTab === "team" ? <DashboardTeam reportees={reportees} /> : null}
        {activeTab === "organization" && organization ? (
          <DashboardOrganization
            data={widgets}
            employees={organization.employees}
            departments={organization.departments}
            branches={organization.branches}
          />
        ) : null}
        {activeTab === "organization" && !organization ? (
          <WorkspaceLoadingState
            title="Loading organization"
            description="Preparing the employee directory and organization structure."
          />
        ) : null}
      </div>
    </MonolithPage>
  );
}

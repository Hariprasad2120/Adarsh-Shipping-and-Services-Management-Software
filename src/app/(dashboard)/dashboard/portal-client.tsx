"use client";

import { Building2, Sparkles, Users2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MonolithPage } from "@/components/ui/foundation";
import {
  WorkspaceErrorState,
  WorkspaceLoadingState,
} from "@/components/feedback/workspace-states";
import type {
  DashboardCommandCenterSnapshot,
  DashboardModuleSnapshot,
} from "@/modules/dashboard/types";
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
  initialModuleSnapshot: DashboardModuleSnapshot;
  initialCommandCenterSnapshot: DashboardCommandCenterSnapshot;
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

type ApiEnvelope<T> = {
  ok?: boolean;
  data?: T;
  error?: {
    message?: string;
  } | string;
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
  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | T
    | null;

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error
        ? typeof payload.error === "string"
          ? payload.error
          : payload.error.message
        : undefined;
    throw new Error(message || "The dashboard could not be updated.");
  }

  if (payload && typeof payload === "object" && "ok" in payload) {
    if (!payload.ok) {
      const message =
        typeof payload.error === "string"
          ? payload.error
          : payload.error?.message;
      throw new Error(message || "The dashboard could not be updated.");
    }

    if (!("data" in payload)) {
      throw new Error("The dashboard response did not include data.");
    }

    return payload.data as T;
  }

  return payload as T;
}

export function HrmsPortalClient({
  sessionUser,
  initialProfile,
  initialWidgetsData,
  initialModuleSnapshot,
  initialCommandCenterSnapshot,
}: HrmsPortalClientProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("myspace");
  const [profile, setProfile] = useState(initialProfile);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [reportees, setReportees] = useState<ReporteeSummary[] | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [widgets, setWidgets] = useState(initialWidgetsData);
  const [moduleSnapshot, setModuleSnapshot] = useState(initialModuleSnapshot);
  const [commandCenterSnapshot] = useState(initialCommandCenterSnapshot);
  const [organization, setOrganization] = useState<OrganizationPayload | null>(null);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const organizationRequestRef = useRef(false);
  const teamRequestRef = useRef(false);

  useEffect(() => {
    if (activeTab !== "team" || reportees || teamRequestRef.current) return;
    let active = true;
    teamRequestRef.current = true;
    setTeamError(null);
    void fetch("/api/hrms/team/reportees")
      .then((response) => readApiResponse<ReporteeSummary[]>(response))
      .then((payload) => {
        if (active) setReportees(payload);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setTeamError(
          error instanceof Error
            ? error.message
            : "The team workspace could not be loaded.",
        );
      })
      .finally(() => {
        teamRequestRef.current = false;
      });
    return () => {
      active = false;
    };
  }, [activeTab, reportees]);

  useEffect(() => {
    if (activeTab !== "organization" || organization || organizationRequestRef.current) return;
    let active = true;
    organizationRequestRef.current = true;
    setOrganizationError(null);
    void fetch("/api/dashboard/organization")
      .then((response) => readApiResponse<OrganizationPayload>(response))
      .then((payload) => {
        if (active) setOrganization(payload);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setOrganizationError(
          error instanceof Error
            ? error.message
            : "The organization workspace could not be loaded.",
        );
      })
      .finally(() => {
        organizationRequestRef.current = false;
      });
    return () => {
      active = false;
    };
  }, [activeTab, organization]);

  async function refreshDashboard() {
    const [profileResponse, widgetsResponse] = await Promise.all([
      fetch("/api/hrms/me"),
      fetch("/api/hrms/dashboard"),
    ]);

    const [profilePayload, widgetsPayload] = await Promise.all([
      readApiResponse<ProfilePayload>(profileResponse),
      readApiResponse<DashboardWidgetsData>(widgetsResponse),
    ]);

    const nextProfile = toUserProfile(profilePayload);
    setProfile(nextProfile);
    setWidgets(widgetsPayload);
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
    <MonolithPage className="mnx-dashboard-page-shell">
      <AttendanceCommand
        profile={profile}
        moduleSnapshot={moduleSnapshot}
        loading={attendanceLoading}
        onPunchAction={handlePunchAction}
      />

      <nav className="mnx-dashboard-tabs" aria-label="Dashboard workspaces">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            // eslint-disable-next-line no-restricted-syntax -- Dashboard workspace tabs require native button semantics with route-local active-state styling.
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
            commandCenterSnapshot={commandCenterSnapshot}
          />
        ) : null}
        {activeTab === "team" && reportees ? <DashboardTeam reportees={reportees} /> : null}
        {activeTab === "team" && !reportees && !teamError ? (
          <WorkspaceLoadingState
            title="Loading team"
            description="Preparing reportees and live attendance."
          />
        ) : null}
        {activeTab === "team" && teamError ? (
          <WorkspaceErrorState
            title="Team workspace unavailable"
            description={teamError}
          />
        ) : null}
        {activeTab === "organization" && organization ? (
          <DashboardOrganization
            data={widgets}
            employees={organization.employees}
            departments={organization.departments}
            branches={organization.branches}
          />
        ) : null}
        {activeTab === "organization" && !organization && !organizationError ? (
          <WorkspaceLoadingState
            title="Loading organization"
            description="Preparing the employee directory and organization structure."
          />
        ) : null}
        {activeTab === "organization" && organizationError ? (
          <WorkspaceErrorState
            title="Organization workspace unavailable"
            description={organizationError}
          />
        ) : null}
      </div>
    </MonolithPage>
  );
}

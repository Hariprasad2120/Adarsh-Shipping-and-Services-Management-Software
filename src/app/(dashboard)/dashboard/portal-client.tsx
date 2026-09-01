"use client";

import { Building2, Sparkles, Users2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MonolithPage } from "@/components/ui/foundation";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import {
  WorkspaceErrorState,
  WorkspaceLoadingState,
} from "@/components/feedback/workspace-states";
import type {
  DashboardCommandCenterSnapshot,
} from "@/modules/dashboard/types";
import type { DashboardWidgetsData, UserProfile } from "@/modules/hrms/types";
import { WelcomeNote, PunchCard } from "@/components/ds";
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

const tabs: TabItem[] = [
  { value: "myspace", label: "My space", icon: <Sparkles size={15} /> },
  { value: "team", label: "Team", icon: <Users2 size={15} /> },
  { value: "organization", label: "Organization", icon: <Building2 size={15} /> },
];

function getTimeBasedGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

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
  initialCommandCenterSnapshot,
}: HrmsPortalClientProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("myspace");
  const [profile, setProfile] = useState(initialProfile);
  const [greeting, setGreeting] = useState(() => getTimeBasedGreeting());
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [reportees, setReportees] = useState<ReporteeSummary[] | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [widgets, setWidgets] = useState(initialWidgetsData);
  const [commandCenterSnapshot] = useState(initialCommandCenterSnapshot);
  const [organization, setOrganization] = useState<OrganizationPayload | null>(null);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const organizationRequestRef = useRef(false);
  const teamRequestRef = useRef(false);
  const displayName = (profile.name || sessionUser.name || profile.designation || "there")
    .split(" ")
    .filter(Boolean)[0] || "there";

  useEffect(() => {
    const updateGreeting = () => setGreeting(getTimeBasedGreeting());
    updateGreeting();

    const intervalId = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

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
      <WelcomeNote
        title={`${greeting}, ${displayName}`}
        eyebrow="My space"
        message="Your operational overview — what needs you now, and where work stands."
        trailing={
          <PunchCard
            status={profile.attendanceStatus}
            since={profile.totalInTime}
            loading={attendanceLoading}
            onPunch={handlePunchAction}
          />
        }
      />

      <Tabs
        className="mnx-dash2-tabs"
        items={tabs}
        value={activeTab}
        onChange={(value) => setActiveTab(value as DashboardTab)}
      />

      <div className="mnx-dashboard-tab-content">
        {activeTab === "myspace" ? (
          <DashboardOverview
            profile={profile}
            sessionUser={sessionUser}
            data={widgets}
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

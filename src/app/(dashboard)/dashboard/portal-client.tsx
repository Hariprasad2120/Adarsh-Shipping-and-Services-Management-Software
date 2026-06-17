"use client";

import React, { useState } from "react";
import { Building2, Sparkles, Users2 } from "lucide-react";
import { DashboardWidgetsData, UserProfile } from "@/modules/hrms/types";
import { ProfileSummary } from "@/components/hrms/profile-summary";
import { ActionList } from "@/components/hrms/action-list";
import { OrgServices } from "@/components/hrms/org-services";
import { ReporteesList } from "@/components/hrms/reportees-list";
import { toast } from "sonner";

interface HrmsPortalClientProps {
  sessionUser: { id: string; name: string; email: string };
  departments: unknown[];
  branches: unknown[];
  initialUsers: unknown[];
  initialProfile: UserProfile;
  initialWidgetsData: DashboardWidgetsData;
  initialReportees: ReporteeSummary[];
}

interface ReporteeSummary {
  id: string;
  name: string;
  email: string;
  employeeNo: string;
  designation: string;
  location: string;
  photo: string | null;
  punchStatus: "YET_TO_CHECK_IN" | "CHECKED_IN" | "ON_BREAK" | "CHECKED_OUT";
  shift: {
    name: string;
    startTime: string;
    endTime: string;
  } | null;
}

type ProfilePayload = {
  user: Pick<UserProfile, "id" | "employeeNo" | "name" | "email" | "designation" | "department" | "branch" | "manager" | "photo">;
  widgets: UserProfile["widgets"];
  attendanceStatus: UserProfile["attendanceStatus"];
  totalInTime: UserProfile["totalInTime"];
  pendingCounts?: UserProfile["pendingCounts"];
};

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

export function HrmsPortalClient({
  sessionUser,
  departments,
  branches,
  initialUsers,
  initialProfile,
  initialWidgetsData,
  initialReportees,
}: HrmsPortalClientProps) {
  const [activeTab, setActiveTab] = useState<string>("myspace");
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [reportees, setReportees] = useState<ReporteeSummary[]>(initialReportees);
  const [widgetsData, setWidgetsData] = useState<DashboardWidgetsData>(initialWidgetsData);

  const loadProfile = async () => {
    try {
      const res = await fetch("/api/hrms/me");
      const json = await res.json();
      if (json.ok) {
        const raw = json.data as ProfilePayload;
        setProfile(toUserProfile(raw));
      } else {
        toast.error("Failed to load profile context");
      }
    } catch {
      toast.error("Network error while loading profile context");
    }
  };

  const refreshDashboardData = async () => {
    try {
      const res = await fetch("/api/hrms/dashboard");
      const json = await res.json();
      if (json.ok) {
        setWidgetsData(json.data as DashboardWidgetsData);
      }
    } catch {
      console.error("Failed to sync dashboard widgets");
    }
  };

  const refreshReportees = async () => {
    try {
      const res = await fetch("/api/hrms/team/reportees");
      const json = await res.json();
      if (json.ok) {
        setReportees(json.data as ReporteeSummary[]);
      }
    } catch {
      console.error("Failed to sync reportees");
    }
  };

  const handlePunchAction = async (action: "CHECK_IN" | "CHECK_OUT" | "START_BREAK" | "RESUME_WORK") => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.ok) {
        await Promise.all([
          loadProfile(),
          refreshDashboardData(),
          refreshReportees(),
        ]);
      } else {
        throw new Error(json.error?.message || "Failed to log attendance punch");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-12">
      <ProfileSummary
        profile={profile}
        onPunchAction={handlePunchAction}
        loading={loading}
      />

      <div className="flex flex-col gap-8 px-6 py-8 lg:px-8 xl:px-10">

      <div className="border border-outline-variant bg-surface-container-low">
        <div className="grid md:grid-cols-3 divide-x divide-outline-variant">
          {[
            {
              key: "myspace",
              label: "My Space",
              detail: "Personal rhythm, tasks, and check-in context.",
              icon: Sparkles,
            },
            {
              key: "team",
              label: "Team",
              detail: "Reportee visibility and attendance at a glance.",
              icon: Users2,
            },
            {
              key: "organization",
              label: "Organization",
              detail: "Announcements, directory, and company services.",
              icon: Building2,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`group flex items-start gap-3 px-5 py-4 text-left transition-all cursor-pointer w-full ${
                  isActive
                    ? "bg-[#0f1c22] text-white border-b-2 border-b-[#00cec4]"
                    : "bg-transparent text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <span
                  className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border ${
                    isActive
                      ? "border-white/15 bg-white/10 text-[#00cec4]"
                      : "border-outline-variant bg-surface text-[#00cec4]"
                  }`}
                >
                  <Icon className="size-4" />
                </span>
                <span className="block">
                  <span className={`block text-xs font-semibold uppercase tracking-[0.12em] ${isActive ? "text-[#00cec4]" : "text-on-surface-variant"}`}>
                    {tab.label}
                  </span>
                  <span className={`mt-1 block text-sm leading-relaxed ${isActive ? "text-white/70" : "text-on-surface-variant"}`}>
                    {tab.detail}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        {activeTab === "myspace" && (
          <ActionList
            profile={profile}
            sessionUser={sessionUser}
            data={widgetsData}
          />
        )}
        {activeTab === "team" && <ReporteesList reportees={reportees} />}
        {activeTab === "organization" && (
          <OrgServices
            data={widgetsData}
            employees={initialUsers}
            departments={departments}
            branches={branches}
          />
        )}
      </div>

      </div>
    </div>
  );
}

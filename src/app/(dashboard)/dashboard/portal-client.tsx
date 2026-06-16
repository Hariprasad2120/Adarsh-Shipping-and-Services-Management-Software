"use client";

import React, { useState, useEffect } from "react";
import { ModuleKey, UserProfile } from "@/modules/hrms/peopleplus/types";
import { PeoplePlusSidebar } from "@/components/hrms/peopleplus/sidebar";
import { PeoplePlusTopNav } from "@/components/hrms/peopleplus/top-nav";
import { ProfileSummary } from "@/components/hrms/peopleplus/profile-summary";
import { ActionList } from "@/components/hrms/peopleplus/action-list";
import { OrgServices } from "@/components/hrms/peopleplus/org-services";
import { FilesView } from "@/components/hrms/peopleplus/files-view";
import { SettingsServices } from "@/components/hrms/peopleplus/settings-services";
import { UsersTable } from "@/components/hrms/peopleplus/users-table";
import { ReporteesList } from "@/components/hrms/peopleplus/reportees-list";
import { WorkReportsView } from "@/components/hrms/peopleplus/work-reports";
import { OnboardingView } from "@/components/hrms/peopleplus/onboarding-view";
import { LmsView } from "@/components/hrms/peopleplus/lms-view";
import { PmsView } from "@/components/hrms/peopleplus/pms-view";
import { TravelView } from "@/components/hrms/peopleplus/travel-view";
import { LettersView } from "@/components/hrms/peopleplus/letters-view";
import { TasksView } from "@/components/hrms/peopleplus/tasks-view";
import { ApprovalsView } from "@/components/hrms/peopleplus/approvals-view";
import { toast } from "sonner";

interface PeoplePlusPortalClientProps {
  sessionUser: { id: string; name: string; email: string };
  permissions: string[];
  departments: any[];
  branches: any[];
  initialUsers: any[];
}

export function PeoplePlusPortalClient({
  sessionUser,
  permissions,
  departments,
  branches,
  initialUsers,
}: PeoplePlusPortalClientProps) {
  const [activeModule, setActiveModule] = useState<ModuleKey>("home");
  const [activeTab, setActiveTab] = useState<string>("myspace");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportees, setReportees] = useState<any[]>([]);
  const [widgetsData, setWidgetsData] = useState<{
    upcomingHolidays: any[];
    announcements: any[];
    recentTasks: any[];
  }>({ upcomingHolidays: [], announcements: [], recentTasks: [] });

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/peopleplus/me");
      const json = await res.json();
      if (json.ok) {
        const raw = json.data;
        setProfile({
          ...raw,
          ...raw.user,
        });
      } else {
        toast.error("Failed to load profile context");
      }
    } catch (error) {
      toast.error("Network error while loading profile context");
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const res = await fetch("/api/hrms/peopleplus/dashboard");
      const json = await res.json();
      if (json.ok) {
        setWidgetsData(json.data);
      }
    } catch (error) {
      console.error("Failed to sync dashboard widgets");
    }
  };

  const loadReportees = async () => {
    try {
      const res = await fetch("/api/hrms/peopleplus/team/reportees");
      const json = await res.json();
      if (json.ok) {
        setReportees(json.data);
      }
    } catch (error) {
      console.error("Failed to sync reportees");
    }
  };

  useEffect(() => {
    loadProfile();
    loadDashboardData();
    loadReportees();
  }, []);

  const handlePunchAction = async (action: "CHECK_IN" | "CHECK_OUT" | "START_BREAK" | "RESUME_WORK") => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/peopleplus/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.ok) {
        await loadProfile();
      } else {
        throw new Error(json.error?.message || "Failed to log attendance punch");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFetchFiles = async (scope: string) => {
    const res = await fetch(`/api/hrms/peopleplus/files?scope=${scope}`);
    const json = await res.json();
    return json.ok ? json.data : { folders: [], files: [] };
  };

  const handleCreateFolder = async (name: string, scope: string) => {
    const res = await fetch("/api/hrms/peopleplus/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, scope, type: "folder" }),
    });
    return res.json();
  };

  const handleUploadFile = async (name: string, fileKey: string, mimeType: string, sizeBytes: number, scope: string) => {
    const res = await fetch("/api/hrms/peopleplus/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, fileKey, mimeType, sizeBytes, scope, type: "file" }),
    });
    return res.json();
  };

  const handleFetchServices = async () => {
    const res = await fetch("/api/hrms/peopleplus/settings/services");
    const json = await res.json();
    return json.ok ? json.data : [];
  };

  const handleUpdateServices = async (services: any[]) => {
    const res = await fetch("/api/hrms/peopleplus/settings/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ services }),
    });
    return res.json();
  };

  const handleFetchUsers = async () => {
    const res = await fetch("/api/hrms/peopleplus/employees");
    const json = await res.json();
    return json.ok ? json.data : [];
  };

  const handleBulkAccountStatus = async (userIds: string[], status: "LOGIN_ENABLED" | "LOGIN_DISABLED") => {
    const res = await fetch("/api/hrms/peopleplus/employees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds, status }),
    });
    return res.json();
  };

  const handleToggleWidget = async (key: string) => {
    if (!profile) return;
    const nextWidgets = profile.widgets.map((w: any) =>
      w.key === key ? { ...w, visible: false } : w
    );
    try {
      const res = await fetch("/api/hrms/peopleplus/dashboard/widgets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgets: nextWidgets }),
      });
      const json = await res.json();
      if (json.ok) {
        setProfile((prev: any) => ({ ...prev, widgets: nextWidgets }));
        toast.success("Dashboard customized.");
      }
    } catch (error) {
      toast.error("Failed to save dashboard settings");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {profile && (
        <ProfileSummary
          profile={profile}
          onPunchAction={handlePunchAction}
          loading={loading}
        />
      )}

      {/* Tab Select buttons */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-1.5 text-xs font-black tracking-wider">
        <button
          onClick={() => setActiveTab("myspace")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === "myspace"
              ? "bg-[#161f28]/80 text-[#00c4b6] border border-[#00c4b6]/25 dark:bg-[#161f28]/80 dark:text-[#00c4b6] dark:border-[#00c4b6]/25"
              : "text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          MY SPACE
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === "team"
              ? "bg-[#161f28]/80 text-[#00c4b6] border border-[#00c4b6]/25 dark:bg-[#161f28]/80 dark:text-[#00c4b6] dark:border-[#00c4b6]/25"
              : "text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          TEAM
        </button>
        <button
          onClick={() => setActiveTab("organization")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === "organization"
              ? "bg-[#161f28]/80 text-[#00c4b6] border border-[#00c4b6]/25 dark:bg-[#161f28]/80 dark:text-[#00c4b6] dark:border-[#00c4b6]/25"
              : "text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          ORGANIZATION
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "myspace" && <ActionList />}
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
  );
}

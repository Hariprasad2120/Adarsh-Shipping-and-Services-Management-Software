"use client";

import React, { useState, useEffect } from "react";
import { ModuleKey, UserProfile } from "@/modules/hrms/peopleplus/types";
import { PeoplePlusSidebar } from "@/components/hrms/peopleplus/sidebar";
import { PeoplePlusTopNav } from "@/components/hrms/peopleplus/top-nav";
import { ProfileSummary } from "@/components/hrms/peopleplus/profile-summary";
import { ActionList } from "@/components/hrms/peopleplus/action-list";
import { DashboardWidgets } from "@/components/hrms/peopleplus/dashboard-widgets";
import { AttendanceCalendar } from "@/components/hrms/peopleplus/attendance-calendar";
import { OrgServices } from "@/components/hrms/peopleplus/org-services";
import { FilesView } from "@/components/hrms/peopleplus/files-view";
import { SettingsServices } from "@/components/hrms/peopleplus/settings-services";
import { UsersTable } from "@/components/hrms/peopleplus/users-table";
import { ReporteesList } from "@/components/hrms/peopleplus/reportees-list";
import { LeaveTracker } from "@/components/hrms/peopleplus/leave-tracker";
import { WorkReportsView } from "@/components/hrms/peopleplus/work-reports";
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

  const handleFetchAttendanceCalendar = async (year: number, month: number) => {
    const res = await fetch(`/api/hrms/peopleplus/attendance/month?year=${year}&month=${month}`);
    const json = await res.json();
    return json.ok ? json.data : [];
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
    <div className="flex h-screen bg-[#f5f7fb] overflow-hidden">
      {/* Sidebar vertical rail */}
      <PeoplePlusSidebar
        activeModule={activeModule}
        onChangeModule={(mod) => {
          setActiveModule(mod);
          // Auto reset tabs when switching top module
          if (mod === "home") setActiveTab("myspace");
        }}
        permissions={permissions}
      />

      {/* Main workspace area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top-Nav bar */}
        <PeoplePlusTopNav
          activeModule={activeModule}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          userName={sessionUser.name}
          onSearchQuery={(q) => console.log("colleague query:", q)}
        />

        {/* Scrollable Main Content canvas */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeModule === "home" && (
            <>
              {profile && (
                <ProfileSummary
                  profile={profile}
                  onPunchAction={handlePunchAction}
                  loading={loading}
                />
              )}

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
            </>
          )}

          {activeModule === "leavetracker" && (
            <LeaveTracker />
          )}

          {activeModule === "attendance" && (
            <>
              {activeTab === "team" ? (
                <ReporteesList reportees={reportees} isAttendanceView={true} />
              ) : (
                <>
                  {profile && (
                    <ProfileSummary
                      profile={profile}
                      onPunchAction={handlePunchAction}
                      loading={loading}
                    />
                  )}
                  <AttendanceCalendar onFetchCalendar={handleFetchAttendanceCalendar} />
                </>
              )}
            </>
          )}

          {activeModule === "workreports" && (
            <WorkReportsView />
          )}

          {activeModule === "timetracker" && (
            <div className="text-sm font-semibold p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-500 text-center">
              Timesheet logs are integrated. Open the My Space ledger to add weekly sheets.
            </div>
          )}

          {activeModule === "performance" && (
            <div className="text-sm font-semibold p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-500 text-center">
              Dynamic appraisal cycles settings are active under the AMS tab in your sidebar.
            </div>
          )}

          {activeModule === "files" && (
            <FilesView
              onFetchFiles={handleFetchFiles}
              onCreateFolder={handleCreateFolder}
              onUploadFile={handleUploadFile}
            />
          )}

          {activeModule === "hrcase" && (
            <div className="text-sm font-semibold p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-500 text-center">
              HR Query cases can be raised from the Top-Nav ask button.
            </div>
          )}

          {activeModule === "generalservice" && (
            <UsersTable
              onFetchUsers={handleFetchUsers}
              onBulkAccountStatus={handleBulkAccountStatus}
            />
          )}

          {activeModule === "okr" && (
            <SettingsServices
              onFetchServices={handleFetchServices}
              onUpdateServices={handleUpdateServices}
            />
          )}
        </main>
      </div>
    </div>
  );
}

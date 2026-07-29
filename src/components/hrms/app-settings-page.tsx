"use client";

import { useCallback } from "react";
import { SettingsServices } from "@/components/hrms/settings-services";
import { EmployeeProfileFields } from "@/components/hrms/employee-profile-fields";
import { WorkReportSettings } from "@/components/hrms/work-report-settings";

export function HrmsAppSettingsPage() {
  const handleFetchServices = useCallback(async () => {
    const res = await fetch("/api/hrms/settings/services");
    const json = await res.json();
    return json.ok ? json.data : [];
  }, []);

  const handleUpdateServices = useCallback(
    async (services: Array<Record<string, unknown>>) => {
      const res = await fetch("/api/hrms/settings/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services }),
      });
      return res.json();
    },
    [],
  );

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
      <SettingsServices
        onFetchServices={handleFetchServices}
        onUpdateServices={handleUpdateServices}
      />
      <EmployeeProfileFields />
      <WorkReportSettings />
    </div>
  );
}

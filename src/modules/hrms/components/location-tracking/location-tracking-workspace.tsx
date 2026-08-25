"use client";

import { useState } from "react";
import { AlertTriangle, Compass, Eye, MapPinned, Route as RouteIcon, Settings2, Truck, Users2 } from "lucide-react";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { OverviewTab } from "./overview-tab";
import { EmployeeTrackerTab } from "./employee-tracker-tab";
import { LiveSalesTab } from "./live-sales-tab";
import { GeofencesTab } from "./geofences-tab";
import { VisitsTab } from "./visits-tab";
import { ExceptionsTab } from "./exceptions-tab";
import { ReportsTab } from "./reports-tab";
import { SettingsTab } from "./settings-tab";

const TABS: TabItem[] = [
  { value: "overview", label: "Overview", icon: <Eye className="size-4" aria-hidden="true" /> },
  { value: "tracker", label: "Employee Tracker", icon: <Users2 className="size-4" aria-hidden="true" /> },
  { value: "live-sales", label: "Live Sales", icon: <Truck className="size-4" aria-hidden="true" /> },
  { value: "routes", label: "Routes", icon: <RouteIcon className="size-4" aria-hidden="true" /> },
  { value: "visits", label: "Visits", icon: <MapPinned className="size-4" aria-hidden="true" /> },
  { value: "geofences", label: "Geofences", icon: <Compass className="size-4" aria-hidden="true" /> },
  { value: "exceptions", label: "Exceptions", icon: <AlertTriangle className="size-4" aria-hidden="true" /> },
  { value: "reports", label: "Reports", icon: <RouteIcon className="size-4" aria-hidden="true" /> },
  { value: "settings", label: "Settings", icon: <Settings2 className="size-4" aria-hidden="true" /> },
];

export function LocationTrackingWorkspace() {
  const [tab, setTab] = useState("overview");
  const [focusedEmployeeId, setFocusedEmployeeId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Location & Field Tracking</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Attendance location, workforce location, and live field location — kept as three distinct layers. Where were employees when they checked in, where were
          they during working hours, and where are they right now on an active field assignment.
        </p>
      </header>

      <Tabs
        items={TABS}
        value={tab}
        onChange={(v) => {
          setTab(v);
          if (v !== "tracker") setFocusedEmployeeId(null);
        }}
      />

      {tab === "overview" ? (
        <OverviewTab
          onSelectEmployee={(userId) => {
            setFocusedEmployeeId(userId);
            setTab("tracker");
          }}
        />
      ) : null}
      {tab === "tracker" ? <EmployeeTrackerTab initialUserId={focusedEmployeeId} /> : null}
      {tab === "live-sales" ? <LiveSalesTab /> : null}
      {tab === "routes" ? <EmployeeTrackerTab initialUserId={focusedEmployeeId} /> : null}
      {tab === "visits" ? <VisitsTab /> : null}
      {tab === "geofences" ? <GeofencesTab /> : null}
      {tab === "exceptions" ? <ExceptionsTab /> : null}
      {tab === "reports" ? <ReportsTab /> : null}
      {tab === "settings" ? <SettingsTab /> : null}
    </div>
  );
}

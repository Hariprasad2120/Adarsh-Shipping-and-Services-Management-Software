"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, LocateFixed, MapPin, RadioTower, Users } from "lucide-react";
import {
  PeopleErrorState,
  PeopleLoadingState,
  PeoplePerson,
  PeopleSection,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableEmpty,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import { WorkspaceAction, WorkspaceBadge, WorkspaceMetric, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { ageSecondsOf, fetchJson, freshnessBadgeVariant, freshnessLabel, mapsLink, type LatestLocationRow } from "./shared";

const EmployeeMap = dynamic(() => import("./employee-map").then((m) => m.EmployeeMap), { ssr: false });

type OverviewData = {
  kpis: {
    trackingNow: number;
    checkedIn: number;
    locationAvailable: number;
    gpsOffline: number;
    gpsStale: number;
    activeFieldEmployees: number;
    activeSalesExecutives: number;
    customerVisitsToday: number;
    activeVisitsNow: number;
    trackingExceptions: number;
    unresolvedAlerts: number;
  };
  employees: LatestLocationRow[];
};

export function OverviewTab({ onSelectEmployee }: { onSelectEmployee?: (userId: string) => void }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drill, setDrill] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchJson<OverviewData>("/api/hrms/location-tracking/overview");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load overview");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(load, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  // Live updates via SSE — falls back gracefully since load() already ran once.
  useEffect(() => {
    const es = new EventSource("/api/hrms/location-tracking/live");
    esRef.current = es;
    es.addEventListener("locations:update", (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data);
        setData((prev) => (prev ? { ...prev, employees: payload.employees } : prev));
      } catch {
        // ignore malformed frame
      }
    });
    es.onerror = () => {
      // EventSource auto-reconnects; nothing to do here besides letting the periodic load() below cover gaps.
    };
    return () => es.close();
  }, []);

  if (error && !data) return <PeopleErrorState description={error} onRetry={load} />;
  if (!data) return <PeopleLoadingState description="Loading the field-tracking command center." />;

  const { kpis } = data;
  const rows = drill
    ? data.employees.filter((e) => {
        if (drill === "offline") return e.freshness === "OFFLINE";
        if (drill === "stale") return e.freshness === "STALE";
        if (drill === "available") return e.freshness === "LIVE" || e.freshness === "RECENT";
        return true;
      })
    : data.employees;

  return (
    <div className="flex flex-col gap-6">
      <section className="mnx-workspace-metrics" aria-label="Location tracking KPIs">
        <WorkspaceMetric icon={<Users aria-hidden="true" />} label="Employees Tracking Now" value={kpis.trackingNow} detail={`${kpis.checkedIn} checked in today`} />
        <WorkspaceMetric icon={<LocateFixed aria-hidden="true" />} label="Location Available" value={kpis.locationAvailable} detail="Live or recent signal" href="#" onClick={(e) => { e.preventDefault(); setDrill("available"); }} />
        <WorkspaceMetric icon={<RadioTower aria-hidden="true" />} label="GPS Stale" value={kpis.gpsStale} detail="10–30 min since last fix" href="#" onClick={(e) => { e.preventDefault(); setDrill("stale"); }} />
        <WorkspaceMetric icon={<AlertTriangle aria-hidden="true" />} label="GPS Offline" value={kpis.gpsOffline} detail="No fix in 30+ min" href="#" onClick={(e) => { e.preventDefault(); setDrill("offline"); }} />
        <WorkspaceMetric icon={<MapPin aria-hidden="true" />} label="Active Field Employees" value={kpis.activeFieldEmployees} detail="On-duty right now" />
        <WorkspaceMetric icon={<MapPin aria-hidden="true" />} label="Customer Visits Today" value={kpis.customerVisitsToday} detail={`${kpis.activeVisitsNow} in progress now`} />
        <WorkspaceMetric icon={<AlertTriangle aria-hidden="true" />} label="Tracking Exceptions" value={kpis.trackingExceptions} detail={`${kpis.unresolvedAlerts} device/GPS alerts open`} />
      </section>

      <PeopleSection>
        <WorkspaceSectionHeading
          index="01"
          title="Live workforce map"
          description="Marker colour = freshness (green live, blue recent, amber stale, grey offline) — updates over the live SSE feed. Click a marker to open that employee's timeline."
          actions={
            <>
              {drill ? (
                <WorkspaceAction variant="outline" size="compact" onClick={() => setDrill(null)}>
                  Clear filter
                </WorkspaceAction>
              ) : null}
              <WorkspaceAction variant="outline" size="compact" onClick={load}>
                Refresh
              </WorkspaceAction>
            </>
          }
        />

        <div className="mb-4">
          <EmployeeMap employees={rows} onSelect={onSelectEmployee} />
        </div>

        <PeopleTable>
          <PeopleTableHeader>
            <PeopleTableRow>
              <PeopleTableHead>Employee</PeopleTableHead>
              <PeopleTableHead>Status</PeopleTableHead>
              <PeopleTableHead>Last updated</PeopleTableHead>
              <PeopleTableHead>Coordinates</PeopleTableHead>
              <PeopleTableHead>Speed</PeopleTableHead>
              <PeopleTableHead>Battery</PeopleTableHead>
              <PeopleTableHead>Actions</PeopleTableHead>
            </PeopleTableRow>
          </PeopleTableHeader>
          <PeopleTableBody>
            {rows.length === 0 ? (
              <PeopleTableEmpty colSpan={7} message={drill ? "No employees match this filter right now." : "No employees are currently tracking. Tracking starts when an employee checks in or begins an on-duty/field assignment."} />
            ) : (
              rows.map((row) => {
                const ageSeconds = ageSecondsOf(row.latestPoint?.timestamp);
                return (
                  <PeopleTableRow key={row.userId}>
                    <PeopleTableCell>
                      <PeoplePerson name={row.user?.name ?? "Unknown employee"} secondary={row.user?.designation ?? undefined} />
                    </PeopleTableCell>
                    <PeopleTableCell>
                      <WorkspaceBadge variant={freshnessBadgeVariant(row.freshness)}>{freshnessLabel(row.freshness, ageSeconds)}</WorkspaceBadge>
                    </PeopleTableCell>
                    <PeopleTableCell>{row.latestPoint ? new Date(row.latestPoint.timestamp).toLocaleTimeString() : "—"}</PeopleTableCell>
                    <PeopleTableCell>
                      {row.latestPoint ? (
                        <a href={mapsLink(row.latestPoint.latitude, row.latestPoint.longitude)} target="_blank" rel="noreferrer" className="underline">
                          {row.latestPoint.latitude.toFixed(4)}, {row.latestPoint.longitude.toFixed(4)}
                        </a>
                      ) : (
                        "No coordinate captured"
                      )}
                    </PeopleTableCell>
                    <PeopleTableCell>{row.latestPoint?.speed != null ? `${(row.latestPoint.speed * 3.6).toFixed(0)} km/h` : "—"}</PeopleTableCell>
                    <PeopleTableCell>{row.latestPoint?.batteryLevel != null ? `${Math.round(row.latestPoint.batteryLevel)}%` : "—"}</PeopleTableCell>
                    <PeopleTableCell>
                      <WorkspaceAction variant="outline" size="compact" onClick={() => onSelectEmployee?.(row.userId)}>
                        View timeline
                      </WorkspaceAction>
                    </PeopleTableCell>
                  </PeopleTableRow>
                );
              })
            )}
          </PeopleTableBody>
        </PeopleTable>
      </PeopleSection>
    </div>
  );
}

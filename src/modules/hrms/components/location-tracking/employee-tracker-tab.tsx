"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, MapPin, Route as RouteIcon } from "lucide-react";
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
import { WorkspaceBadge, WorkspaceField, WorkspaceInput, WorkspaceMetric, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { ageSecondsOf, fetchJson, freshnessBadgeVariant, freshnessLabel, mapsLink, type LatestLocationRow } from "./shared";

type RoutePoint = { latitude: number; longitude: number; timestamp: string; accuracy?: number | null; speed?: number | null };
type RouteData = {
  date: string;
  userId: string;
  points: RoutePoint[];
  rawPointCount: number;
  filteredPointCount: number;
  start: RoutePoint | null;
  end: RoutePoint | null;
  geofenceEvents: Array<{ id: string; eventType: string; occurredAt: string; geofence: { name: string; type: string } }>;
  visits: Array<{ id: string; status: string; arrivalAt: string | null; durationMinutes: number | null }>;
  gaps: Array<{ fromTimestamp: string; toTimestamp: string; minutes: number }>;
  summary: { distanceKm: number; totalTrackedMinutes: number; customerMinutes: number; stopCount: number; visitCount: number };
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type DirectoryUser = { id: string; name: string; designation?: string | null };

export function EmployeeTrackerTab({ initialUserId }: { initialUserId?: string | null }) {
  const [employees, setEmployees] = useState<LatestLocationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId ?? null);
  const [date, setDate] = useState(todayIso());
  const [route, setRoute] = useState<RouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [scrubIndex, setScrubIndex] = useState(0);

  // The employee list is the full active directory (searchable by name/designation/branch/department
  // server-side), not just employees currently mid-tracking-session — otherwise the picker is empty
  // whenever nobody happens to be checked in right now, which reads as "search is broken".
  const loadEmployees = useCallback(async (search: string) => {
    try {
      setError(null);
      const [directory, overview] = await Promise.all([
        fetchJson<DirectoryUser[]>(`/api/hrms/employees?active=true${search ? `&search=${encodeURIComponent(search)}` : ""}`),
        fetchJson<{ employees: LatestLocationRow[] }>("/api/hrms/location-tracking/overview"),
      ]);
      const liveByUserId = new Map(overview.employees.map((e) => [e.userId, e]));
      const merged: LatestLocationRow[] = directory.map((u) => {
        const live = liveByUserId.get(u.id);
        return (
          live ?? {
            userId: u.id,
            user: { id: u.id, name: u.name, designation: u.designation ?? null },
            trackingSessionId: "",
            onDutyRequestId: null,
            intervalMinutes: 0,
            latestPoint: null,
            freshness: "OFFLINE",
          }
        );
      });
      setEmployees(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees");
    }
  }, []);

  // Debounced: re-queries the directory as the user types, server-side (name/designation/branch/department).
  useEffect(() => {
    const timeout = window.setTimeout(() => loadEmployees(query), query ? 300 : 0);
    return () => window.clearTimeout(timeout);
  }, [loadEmployees, query]);

  const loadRoute = useCallback(async (userId: string, forDate: string) => {
    setRouteLoading(true);
    try {
      const data = await fetchJson<RouteData>(`/api/hrms/location-tracking/routes?userId=${userId}&date=${forDate}`);
      setRoute(data);
      setScrubIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load route");
    } finally {
      setRouteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    const timeout = window.setTimeout(() => loadRoute(selectedUserId, date), 0);
    return () => window.clearTimeout(timeout);
  }, [selectedUserId, date, loadRoute]);

  if (error && !employees) return <PeopleErrorState description={error} onRetry={() => loadEmployees(query)} />;
  if (!employees) return <PeopleLoadingState description="Loading the employee tracker." />;

  const scrubPoint = route?.points[scrubIndex] ?? null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
      <PeopleSection>
        <div className="mb-3">
          <h3 className="text-base font-semibold">Employees</h3>
          <p className="text-sm text-neutral-500">Search and select an employee to view their tracking timeline.</p>
        </div>
        <WorkspaceField label="Search" htmlFor="tracker-search">
          <WorkspaceInput id="tracker-search" placeholder="Search by name" value={query} onChange={(e) => setQuery(e.target.value)} />
        </WorkspaceField>
        <div className="mt-3 flex max-h-[520px] flex-col gap-1 overflow-y-auto">
          {employees.length === 0 ? (
            <p className="p-3 text-sm text-neutral-500">No employees match.</p>
          ) : (
            employees.map((row) => {
              const ageSeconds = ageSecondsOf(row.latestPoint?.timestamp);
              const active = row.userId === selectedUserId;
              return (
                <button
                  key={row.userId}
                  type="button"
                  onClick={() => setSelectedUserId(row.userId)}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    active ? "border-[var(--mnx-accent,#1a5fb4)] bg-[var(--mnx-accent,#1a5fb4)]/5" : "border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <PeoplePerson name={row.user?.name ?? "Unknown"} secondary={row.user?.designation ?? undefined} />
                  <WorkspaceBadge variant={freshnessBadgeVariant(row.freshness)}>{freshnessLabel(row.freshness, ageSeconds)}</WorkspaceBadge>
                </button>
              );
            })
          )}
        </div>
      </PeopleSection>

      <PeopleSection>
        {!selectedUserId ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-12 text-center text-neutral-500">
            <RouteIcon className="size-8" aria-hidden="true" />
            <p>Select an employee to view their location timeline and route.</p>
          </div>
        ) : (
          <>
            <WorkspaceSectionHeading
              index="02"
              title="Timeline & route"
              description="Chronological tracking events for the selected date. GPS noise (poor accuracy, impossible jumps) is filtered before distance is computed."
              actions={
                <WorkspaceField label="Date" htmlFor="tracker-date" className="m-0!">
                  <WorkspaceInput id="tracker-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayIso()} />
                </WorkspaceField>
              }
            />

            {routeLoading ? (
              <PeopleLoadingState description="Loading route history." />
            ) : !route || route.points.length === 0 ? (
              <div className="mnx-empty-state mnx-table-empty-state">
                <MapPin aria-hidden="true" />
                <p>No location points captured for this employee on {date}.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <section className="mnx-workspace-metrics" aria-label="Route summary">
                  <WorkspaceMetric icon={<RouteIcon aria-hidden="true" />} label="Distance travelled" value={`${route.summary.distanceKm} km`} detail={`${route.filteredPointCount} of ${route.rawPointCount} points used (noise filtered)`} />
                  <WorkspaceMetric icon={<CalendarDays aria-hidden="true" />} label="Tracked span" value={`${route.summary.totalTrackedMinutes} min`} detail={`${route.summary.stopCount} gap(s) over 20 min`} />
                  <WorkspaceMetric label="Customer time" value={`${route.summary.customerMinutes} min`} detail={`${route.summary.visitCount} visit(s)`} />
                </section>

                <div>
                  <p className="mb-2 text-sm font-medium">Play route</p>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(route.points.length - 1, 0)}
                    value={scrubIndex}
                    onChange={(e) => setScrubIndex(Number(e.target.value))}
                    className="w-full"
                    aria-label="Route timeline scrubber"
                  />
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>{route.start ? new Date(route.start.timestamp).toLocaleTimeString() : "—"}</span>
                    {scrubPoint ? (
                      <a href={mapsLink(scrubPoint.latitude, scrubPoint.longitude)} target="_blank" rel="noreferrer" className="underline">
                        {new Date(scrubPoint.timestamp).toLocaleTimeString()} · {scrubPoint.latitude.toFixed(4)}, {scrubPoint.longitude.toFixed(4)}
                      </a>
                    ) : null}
                    <span>{route.end ? new Date(route.end.timestamp).toLocaleTimeString() : "—"}</span>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Events</p>
                  <PeopleTable>
                    <PeopleTableHeader>
                      <PeopleTableRow>
                        <PeopleTableHead>Time</PeopleTableHead>
                        <PeopleTableHead>Event</PeopleTableHead>
                        <PeopleTableHead>Detail</PeopleTableHead>
                      </PeopleTableRow>
                    </PeopleTableHeader>
                    <PeopleTableBody>
                      {[
                        ...route.geofenceEvents.map((e) => ({ time: e.occurredAt, label: `${e.eventType === "ENTERED" ? "Entered" : "Exited"} ${e.geofence.name}`, detail: e.geofence.type })),
                        ...route.visits.map((v) => ({ time: v.arrivalAt ?? "", label: `Visit ${v.status.toLowerCase()}`, detail: v.durationMinutes != null ? `${v.durationMinutes} min` : "—" })),
                        ...route.gaps.map((g) => ({ time: g.fromTimestamp, label: "Tracking gap", detail: `${g.minutes} min without a fix` })),
                      ]
                        .filter((e) => e.time)
                        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
                        .map((e, idx) => (
                          <PeopleTableRow key={idx}>
                            <PeopleTableCell>{new Date(e.time).toLocaleTimeString()}</PeopleTableCell>
                            <PeopleTableCell>{e.label}</PeopleTableCell>
                            <PeopleTableCell>{e.detail}</PeopleTableCell>
                          </PeopleTableRow>
                        ))}
                      {route.geofenceEvents.length === 0 && route.visits.length === 0 && route.gaps.length === 0 ? (
                        <PeopleTableEmpty colSpan={3} message="No geofence, visit, or gap events for this day." />
                      ) : null}
                    </PeopleTableBody>
                  </PeopleTable>
                </div>
              </div>
            )}
          </>
        )}
      </PeopleSection>
    </div>
  );
}

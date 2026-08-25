"use client";

import { useCallback, useEffect, useState } from "react";
import { Navigation, PhoneCall, Truck } from "lucide-react";
import {
  PeopleErrorState,
  PeopleLoadingState,
  PeoplePerson,
  PeopleSection,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import { WorkspaceAlert, WorkspaceBadge, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { ageSecondsOf, fetchJson, freshnessBadgeVariant, freshnessLabel, mapsLink, type LatestLocationRow } from "./shared";

type Visit = { id: string; userId: string; status: string; crmAccountId: string; account: { name: string } | null; arrivalAt: string | null };

function journeyState(row: LatestLocationRow, activeVisit?: Visit) {
  if (row.freshness === "OFFLINE") return "Offline";
  if (row.freshness === "STALE") return "GPS Stale";
  if (activeVisit?.status === "IN_PROGRESS") return "Visit In Progress";
  if (activeVisit) return "At Customer";
  const speed = row.latestPoint?.speed ?? 0;
  return speed > 1 ? "Travelling" : "Available";
}

export function LiveSalesTab() {
  const [employees, setEmployees] = useState<LatestLocationRow[] | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [overview, visitData] = await Promise.all([
        fetchJson<{ employees: LatestLocationRow[] }>("/api/hrms/location-tracking/overview"),
        fetchJson<{ visits: Visit[] }>("/api/hrms/location-tracking/visits?status=IN_PROGRESS"),
      ]);
      setEmployees(overview.employees.filter((e) => e.onDutyRequestId));
      setVisits(visitData.visits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load live sales data");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(load, 0);
    const interval = window.setInterval(load, 30000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [load]);

  if (error && !employees) return <PeopleErrorState description={error} onRetry={load} />;
  if (!employees) return <PeopleLoadingState description="Loading live field & sales tracking." />;

  const visitByUser = new Map(visits.map((v) => [v.userId, v]));

  return (
    <PeopleSection>
      <WorkspaceSectionHeading
        index="01"
        title="Live Sales"
        description="High-frequency tracking for employees currently on an active field/on-duty assignment. Distinct from the standard Employee Tracker — this view only shows employees mid-journey."
      />
      {employees.length === 0 ? (
        <WorkspaceAlert variant="info">No active field or sales journeys right now. This view populates once an employee starts an on-duty trip.</WorkspaceAlert>
      ) : (
        <PeopleTable>
          <PeopleTableHeader>
            <PeopleTableRow>
              <PeopleTableHead>Employee</PeopleTableHead>
              <PeopleTableHead>Journey state</PeopleTableHead>
              <PeopleTableHead>Freshness</PeopleTableHead>
              <PeopleTableHead>Customer</PeopleTableHead>
              <PeopleTableHead>Coordinates</PeopleTableHead>
              <PeopleTableHead>Actions</PeopleTableHead>
            </PeopleTableRow>
          </PeopleTableHeader>
          <PeopleTableBody>
            {employees.map((row) => {
              const visit = visitByUser.get(row.userId);
              const ageSeconds = ageSecondsOf(row.latestPoint?.timestamp);
              return (
                <PeopleTableRow key={row.userId}>
                  <PeopleTableCell>
                    <PeoplePerson name={row.user?.name ?? "Unknown"} secondary={row.user?.designation ?? undefined} />
                  </PeopleTableCell>
                  <PeopleTableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <Truck className="size-4" aria-hidden="true" />
                      {journeyState(row, visit)}
                    </span>
                  </PeopleTableCell>
                  <PeopleTableCell>
                    <WorkspaceBadge variant={freshnessBadgeVariant(row.freshness)}>{freshnessLabel(row.freshness, ageSeconds)}</WorkspaceBadge>
                  </PeopleTableCell>
                  <PeopleTableCell>{visit?.account?.name ?? "—"}</PeopleTableCell>
                  <PeopleTableCell>
                    {row.latestPoint ? (
                      <a href={mapsLink(row.latestPoint.latitude, row.latestPoint.longitude)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                        <Navigation className="size-3.5" aria-hidden="true" />
                        Open in maps
                      </a>
                    ) : (
                      "—"
                    )}
                  </PeopleTableCell>
                  <PeopleTableCell>
                    <span className="inline-flex items-center gap-1 text-sm text-neutral-400" title="Employee contact number is not yet part of the tracking data model">
                      <PhoneCall className="size-3.5" aria-hidden="true" />
                      Not available
                    </span>
                  </PeopleTableCell>
                </PeopleTableRow>
              );
            })}
          </PeopleTableBody>
        </PeopleTable>
      )}
    </PeopleSection>
  );
}

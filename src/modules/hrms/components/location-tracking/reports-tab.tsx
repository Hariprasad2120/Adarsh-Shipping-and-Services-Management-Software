"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PeopleErrorState,
  PeopleLoadingState,
  PeopleSection,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableEmpty,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import { WorkspaceField, WorkspaceInput, WorkspaceSectionHeading, WorkspaceSelect } from "@/components/layout/workspace";
import { fetchJson } from "./shared";

const REPORTS = [
  { value: "daily-movement", label: "Daily Employee Movement" },
  { value: "customer-visits", label: "Customer Visits" },
  { value: "geofence-events", label: "Geofence Events" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ReportsTab() {
  const [report, setReport] = useState("daily-movement");
  const [date, setDate] = useState(todayIso());
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows(null);
      const data = await fetchJson<{ rows: Record<string, unknown>[] }>(`/api/hrms/location-tracking/reports?report=${report}&date=${date}`);
      setRows(data.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    }
  }, [report, date]);

  useEffect(() => {
    const timeout = window.setTimeout(load, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const columns = rows && rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <PeopleSection>
      <WorkspaceSectionHeading
        index="01"
        title="Reports"
        description="Daily Employee Movement, Customer Visits, and Geofence Events are implemented against real tracking data. Route Deviations, Territory Coverage, and Visit Completion-rate reports need territory/planned-route modeling not yet built (see Settings)."
        actions={
          <div className="flex gap-3">
            <WorkspaceField label="Report" htmlFor="report-type" className="m-0!">
              <WorkspaceSelect id="report-type" value={report} onChange={(e) => setReport(e.target.value)}>
                {REPORTS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </WorkspaceSelect>
            </WorkspaceField>
            <WorkspaceField label="Date" htmlFor="report-date" className="m-0!">
              <WorkspaceInput id="report-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayIso()} />
            </WorkspaceField>
          </div>
        }
      />

      {error ? (
        <PeopleErrorState description={error} onRetry={load} />
      ) : rows === null ? (
        <PeopleLoadingState description="Loading report." />
      ) : (
        <PeopleTable>
          <PeopleTableHeader>
            <PeopleTableRow>
              {columns.map((c) => (
                <PeopleTableHead key={c}>{c.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</PeopleTableHead>
              ))}
            </PeopleTableRow>
          </PeopleTableHeader>
          <PeopleTableBody>
            {rows.length === 0 ? (
              <PeopleTableEmpty colSpan={Math.max(columns.length, 1)} message="No data for this report and date." />
            ) : (
              rows.map((row, idx) => (
                <PeopleTableRow key={idx}>
                  {columns.map((c) => {
                    const v = row[c];
                    const display = v == null ? "—" : typeof v === "string" && /\d{4}-\d{2}-\d{2}T/.test(v) ? new Date(v).toLocaleString() : String(v);
                    return <PeopleTableCell key={c}>{display}</PeopleTableCell>;
                  })}
                </PeopleTableRow>
              ))
            )}
          </PeopleTableBody>
        </PeopleTable>
      )}
    </PeopleSection>
  );
}

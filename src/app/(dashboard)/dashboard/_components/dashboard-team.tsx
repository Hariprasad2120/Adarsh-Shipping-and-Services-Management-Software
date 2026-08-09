"use client";

import {
  Check,
  Copy,
  Search,
  TimerOff,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MonolithEmptyState } from "@/components/ui/foundation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WorkspaceSectionHeading } from "@/components/layout/workspace";
import type { ReporteeSummary } from "./dashboard-types";

interface DashboardTeamProps {
  reportees: ReporteeSummary[];
}

type TeamFilter = "ALL" | ReporteeSummary["punchStatus"];

const filters: { value: TeamFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "CHECKED_IN", label: "Working" },
  { value: "ON_BREAK", label: "On break" },
  { value: "CHECKED_OUT", label: "Checked out" },
  { value: "YET_TO_CHECK_IN", label: "Not started" },
];

const statusCopy: Record<
  ReporteeSummary["punchStatus"],
  { label: string; className: string }
> = {
  CHECKED_IN: { label: "Working", className: "mnx-badge-success" },
  ON_BREAK: { label: "On break", className: "mnx-badge-warning" },
  CHECKED_OUT: { label: "Checked out", className: "mnx-badge-neutral" },
  YET_TO_CHECK_IN: { label: "Not started", className: "mnx-badge-danger" },
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function DashboardTeam({ reportees }: DashboardTeamProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TeamFilter>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredReportees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return reportees.filter((reportee) => {
      const matchesFilter = filter === "ALL" || reportee.punchStatus === filter;
      const matchesQuery = normalizedQuery.length === 0
        || [reportee.name, reportee.email, reportee.designation, reportee.employeeNo]
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, reportees]);

  const workingCount = reportees.filter((item) => item.punchStatus === "CHECKED_IN").length;
  const breakCount = reportees.filter((item) => item.punchStatus === "ON_BREAK").length;

  async function copyEmail(reportee: ReporteeSummary) {
    try {
      await navigator.clipboard.writeText(reportee.email);
      setCopiedId(reportee.id);
      window.setTimeout(() => setCopiedId(null), 1200);
    } catch {
      toast.error("Email address could not be copied.");
    }
  }

  return (
    <section className="mnx-team-workspace">
      <div className="mnx-dashboard-metrics mnx-team-metrics" aria-label="Team attendance metrics">
        <article className="mnx-metric-card">
          <header><span>Direct reportees</span></header>
          <strong>{String(reportees.length).padStart(2, "0")}</strong>
          <p>People in your immediate team</p>
        </article>
        <article className="mnx-metric-card">
          <header><span>Working now</span></header>
          <strong>{String(workingCount).padStart(2, "0")}</strong>
          <p>Checked in and active</p>
        </article>
        <article className="mnx-metric-card">
          <header><span>On break</span></header>
          <strong>{String(breakCount).padStart(2, "0")}</strong>
          <p>Temporarily away</p>
        </article>
      </div>

      <WorkspaceSectionHeading
        index="05"
        title="Reportee directory"
        description="Live attendance context for the people who report to you."
      />

      <Card className="mnx-table-card">
        <header className="mnx-table-toolbar mnx-table-toolbar-search">
          <div className="mnx-filter-row" role="group" aria-label="Filter reportees by attendance">
            {filters.map((item) => (
              <button
                type="button"
                key={item.value}
                className={filter === item.value ? "is-active" : ""}
                onClick={() => setFilter(item.value)}
                aria-pressed={filter === item.value}
              >
                {item.label}
                <span>
                  {item.value === "ALL"
                    ? reportees.length
                    : reportees.filter((reportee) => reportee.punchStatus === item.value).length}
                </span>
              </button>
            ))}
          </div>

          <label className="mnx-search-field">
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search team…"
              aria-label="Search reportees"
            />
          </label>
        </header>

        <div className="mnx-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Designation</th>
                <th>Location</th>
                <th>Shift</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filteredReportees.map((reportee) => {
                const status = statusCopy[reportee.punchStatus];
                return (
                  <tr key={reportee.id}>
                    <td>
                      <div className="mnx-person-cell">
                        <span className="mnx-person-avatar">{initials(reportee.name)}</span>
                        <span>
                          <b>{reportee.name}</b>
                          <small>{reportee.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <b className="mnx-table-primary">{reportee.designation || "Team member"}</b>
                      <small>Employee {reportee.employeeNo || "—"}</small>
                    </td>
                    <td>{reportee.location || "Head office"}</td>
                    <td>
                      {reportee.shift ? (
                        <>
                          <b className="mnx-table-primary">{reportee.shift.name}</b>
                          <small>{reportee.shift.startTime} – {reportee.shift.endTime}</small>
                        </>
                      ) : (
                        <span className="mnx-muted-value"><TimerOff size={13} />Unassigned</span>
                      )}
                    </td>
                    <td><Badge className={status.className}><i />{status.label}</Badge></td>
                    <td>
                      <Button
                        mode="icon"
                        onClick={() => copyEmail(reportee)}
                        aria-label={`Copy ${reportee.name}'s email`}
                        title="Copy email"
                      >
                        {copiedId === reportee.id ? <Check size={15} /> : <Copy size={15} />}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredReportees.length === 0 ? (
          <MonolithEmptyState className="mnx-table-empty">
            <Search size={24} />
            <h3>No matching reportees</h3>
            <p>Change the search or attendance filter to see more people.</p>
          </MonolithEmptyState>
        ) : null}

        <footer className="mnx-table-footer">
          <span>Showing {filteredReportees.length} of {reportees.length} reportees</span>
          <span>Attendance syncs after every punch action</span>
        </footer>
      </Card>
    </section>
  );
}

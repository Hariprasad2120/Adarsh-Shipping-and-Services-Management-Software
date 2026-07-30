"use client";

import { PeopleControlButton as MnxAction } from "@/modules/people/components/people-controls";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  FileText,
  IndianRupee,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTablePrimaryLinkCell,
  DataTableRow,
} from "@/modules/people/components/people-data-table";
import { Input } from "@/components/ui/input";
import type {
  SalaryRevisionStats,
  SalaryRevisionSummary,
} from "@/modules/hrms/salary-revisions-shared";
import {
  formatINR,
  formatPercent,
} from "@/modules/hrms/salary-revisions-shared";

type StatusFilter = "ALL" | "APPROVED" | "PENDING" | "REJECTED";
type SortMode = "LATEST" | "EMPLOYEE";

function statusBadgeClass(status: StatusFilter | "UNKNOWN") {
  if (status === "APPROVED")
    return "border-[var(--mnx-success)] bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]";
  if (status === "PENDING")
    return "border-[var(--mnx-warning)] bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]";
  if (status === "REJECTED")
    return "border-[var(--mnx-danger)] bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]";
  return "border-mono-border bg-mono-soft text-mono-muted";
}

function StatsCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[24px] border border-mono-border/20 bg-mono-card p-5 shadow-ambient transition duration-300 hover:-translate-y-1 hover:shadow-ambient-hover dark:bg-mono-card dark:shadow-ambient dark:hover:shadow-ambient-hover">
      <div className="absolute inset-x-0 top-0 h-14 bg-[var(--mnx-surface-gradient)] bg-[var(--mnx-surface-gradient)]" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--mnx-accent)]/10 transition duration-300 group-hover:scale-105 group-hover:bg-[var(--mnx-accent)]/14">
            {icon}
          </div>
          <ArrowUpRight className="size-4 text-[var(--mnx-muted)] transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--mnx-accent)] dark:text-outline" />
        </div>

        <div className="mt-6">
          <p className="text-[2.35rem] font-extralight leading-none tracking-[-0.04em] text-[var(--mnx-text)] dark:text-mono-text">
            {value}
          </p>
          <p className="mt-1.5 text-[14px] font-normal text-mono-muted dark:text-mono-muted">
            {label}
          </p>
        </div>
      </div>
    </article>
  );
}

export function SalaryRevisionsClient({
  initialEmployeeId,
  stats,
  summaries,
}: {
  initialEmployeeId?: string;
  stats: SalaryRevisionStats;
  summaries: SalaryRevisionSummary[];
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("LATEST");
  const [search, setSearch] = useState("");
  const [expandedEmployeeId, setExpandedEmployeeId] = useState(
    initialEmployeeId ?? "",
  );
  const hasActiveCriteria =
    statusFilter !== "ALL" || sortMode !== "LATEST" || search.trim().length > 0;

  function clearCriteria() {
    setStatusFilter("ALL");
    setSortMode("LATEST");
    setSearch("");
    setExpandedEmployeeId("");
  }

  const filteredSummaries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const next = summaries.filter((summary) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        summary.latestRevision?.status === statusFilter;
      if (!matchesStatus) return false;

      if (!normalizedSearch) return true;
      return (
        summary.employeeName.toLowerCase().includes(normalizedSearch) ||
        summary.employeeNumber.toLowerCase().includes(normalizedSearch) ||
        (summary.departmentName ?? "").toLowerCase().includes(normalizedSearch)
      );
    });

    if (sortMode === "EMPLOYEE") {
      return [...next].sort((left, right) => {
        const leftNum = Number(left.employeeNumber);
        const rightNum = Number(right.employeeNumber);
        if (
          Number.isFinite(leftNum) &&
          Number.isFinite(rightNum) &&
          leftNum !== rightNum
        ) {
          return leftNum - rightNum;
        }
        return left.employeeName.localeCompare(right.employeeName);
      });
    }

    return [...next].sort(
      (left, right) =>
        (right.latestRevision?.effectiveSort ?? 0) -
        (left.latestRevision?.effectiveSort ?? 0),
    );
  }, [search, sortMode, statusFilter, summaries]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          icon={
            <IndianRupee
              className="size-5 text-[var(--mnx-accent)]"
              strokeWidth={1.9}
            />
          }
          label="Total revisions"
          value={String(stats.totalRevisions)}
        />
        <StatsCard
          icon={
            <Users
              className="size-5 text-[var(--mnx-accent)]"
              strokeWidth={1.9}
            />
          }
          label="Employees"
          value={String(stats.employees)}
        />
        <StatsCard
          icon={
            <FileText
              className="size-5 text-[var(--mnx-accent)]"
              strokeWidth={1.9}
            />
          }
          label="Approved"
          value={String(stats.approved)}
        />
        <StatsCard
          icon={
            <TrendingUp
              className="size-5 text-[var(--mnx-warning)]"
              strokeWidth={1.9}
            />
          }
          label="Pending"
          value={String(stats.pending)}
        />
      </div>

      <div className="mnx-panel mnx-accent-edge mnx-content-wide overflow-hidden border border-mono-border/40 bg-mono-card shadow-sm">
        <div className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", "APPROVED", "PENDING", "REJECTED"] as const).map(
              (status) => (
                <MnxAction
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    statusFilter === status
                      ? "border-[var(--mnx-accent)] bg-[var(--mnx-accent)] text-[var(--mnx-text)]"
                      : "border-mono-border/40 bg-mono-card text-mono-muted hover:border-[var(--mnx-accent)]/45 hover:text-mono-text"
                  }`}
                >
                  {status === "ALL"
                    ? "All"
                    : `${status.charAt(0)}${status.slice(1).toLowerCase()}`}
                </MnxAction>
              ),
            )}
            <MnxAction
              type="button"
              onClick={() =>
                setSortMode((current) =>
                  current === "LATEST" ? "EMPLOYEE" : "LATEST",
                )
              }
              className="rounded-full border border-mono-border/40 bg-mono-card px-4 py-2 text-sm text-mono-muted transition hover:border-[var(--mnx-accent)]/45 hover:text-mono-text"
            >
              {sortMode === "LATEST" ? "Latest first" : "By Emp #"}
            </MnxAction>
            <MnxAction
              type="button"
              onClick={clearCriteria}
              disabled={!hasActiveCriteria}
              className="rounded-full border border-mono-border/40 bg-mono-card px-4 py-2 text-sm text-mono-muted transition hover:border-[var(--mnx-accent)]/45 hover:text-mono-text disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear criteria
            </MnxAction>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee, emp #, or department"
            className="w-full lg:max-w-sm"
          />
        </div>

        <DataTable className="w-full overflow-visible rounded-none border-0 border-t border-mono-border/30 bg-transparent shadow-none">
          <DataTableHeader>
            <tr>
              <DataTableHead className="px-5 py-3 text-left">
                EMP ID
              </DataTableHead>
              <DataTableHead className="px-5 py-3 text-left">
                NAME
              </DataTableHead>
              <DataTableHead className="px-5 py-3 text-left">
                DEPARTMENT
              </DataTableHead>
              <DataTableHead className="px-5 py-3 text-left">
                EFFECTIVE
              </DataTableHead>
              <DataTableHead className="px-5 py-3 text-left">
                REVISED CTC
              </DataTableHead>
              <DataTableHead className="px-5 py-3 text-left">
                REV %
              </DataTableHead>
              <DataTableHead className="px-5 py-3 text-left">
                STATUS
              </DataTableHead>
              <DataTableHead className="px-5 py-3 text-right">
                ACTION
              </DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {filteredSummaries.length === 0 ? (
              <DataTableEmpty
                colSpan={8}
                message="No salary revisions match the current filters."
              />
            ) : (
              filteredSummaries.map((summary) => {
                const latest = summary.latestRevision;
                const hasHistory = summary.revisions.length > 1;
                const isExpanded = expandedEmployeeId === summary.userId;
                const pastRevisions = summary.revisions.slice(1);

                return (
                  <Fragment key={summary.userId}>
                    <DataTableRow key={summary.userId}>
                      <DataTableCell className="px-5 py-4 font-medium text-mono-text">
                        {summary.employeeNumber}
                      </DataTableCell>
                      {hasHistory ? (
                        <DataTableCell className="px-5 py-4">
                          <MnxAction
                            type="button"
                            onClick={() =>
                              setExpandedEmployeeId((current) =>
                                current === summary.userId
                                  ? ""
                                  : summary.userId,
                              )
                            }
                            className="block min-w-0 text-left"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <p className="font-medium text-mono-text">
                                {summary.employeeName}
                              </p>
                              <p className="text-xs text-mono-muted">
                                {summary.designation ?? "-"}
                              </p>
                            </div>
                          </MnxAction>
                        </DataTableCell>
                      ) : (
                        <DataTablePrimaryLinkCell
                          href={`/hrms/employees/${summary.userId}`}
                          className="px-0 py-0"
                          linkClassName="block min-w-0 py-4"
                        >
                          <div className="space-y-0.5">
                            <p className="font-medium text-mono-text">
                              {summary.employeeName}
                            </p>
                            <p className="text-xs text-mono-muted">
                              {summary.designation ?? "-"}
                            </p>
                          </div>
                        </DataTablePrimaryLinkCell>
                      )}
                      <DataTableCell className="px-5 py-4 text-mono-muted">
                        {summary.departmentName ?? "-"}
                      </DataTableCell>
                      <DataTableCell className="px-5 py-4 text-mono-muted">
                        {latest?.effectiveLabel ?? "-"}
                      </DataTableCell>
                      <DataTableCell className="mnx-numeric px-5 py-4 font-semibold text-mono-text">
                        {formatINR(latest?.revisedCtcAnnual ?? null)}
                      </DataTableCell>
                      <DataTableCell className="mnx-numeric px-5 py-4 font-medium text-[var(--mnx-success)]">
                        {formatPercent(latest?.revisionPercent ?? null)}
                      </DataTableCell>
                      <DataTableCell className="px-5 py-4">
                        <Badge
                          className={`border ${statusBadgeClass(latest?.status ?? "UNKNOWN")}`}
                        >
                          {latest?.statusLabel ?? "Unknown"}
                        </Badge>
                      </DataTableCell>
                      <DataTableCell className="px-5 py-4 text-right">
                        {hasHistory ? (
                          <MnxAction
                            type="button"
                            onClick={() =>
                              setExpandedEmployeeId((current) =>
                                current === summary.userId
                                  ? ""
                                  : summary.userId,
                              )
                            }
                            className="inline-flex text-outline-variant transition-colors hover:text-[var(--mnx-accent)]"
                            aria-label={
                              isExpanded
                                ? `Collapse revisions for ${summary.employeeName}`
                                : `Expand revisions for ${summary.employeeName}`
                            }
                          >
                            {isExpanded ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </MnxAction>
                        ) : (
                          <Link
                            href={`/hrms/employees/${summary.userId}`}
                            className="inline-flex text-outline-variant transition-colors hover:text-[var(--mnx-accent)]"
                            aria-label={`View ${summary.employeeName}`}
                          >
                            <ChevronRight className="size-4" />
                          </Link>
                        )}
                      </DataTableCell>
                    </DataTableRow>
                    {isExpanded && hasHistory ? (
                      <tr className="bg-mono-soft/40">
                        <td colSpan={8} className="px-5 py-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mono-muted">
                                Revision History
                              </p>
                              <Link
                                href={`/hrms/employees/${summary.userId}`}
                                className="inline-flex text-sm font-medium text-[var(--mnx-accent)] transition hover:text-[var(--mnx-accent-text)]"
                              >
                                View employee
                              </Link>
                            </div>
                            <div className="grid gap-3">
                              {pastRevisions.map((revision) => (
                                <div
                                  key={revision.id}
                                  className="grid gap-3 rounded-[22px] border border-mono-border/30 bg-mono-card px-4 py-4 md:grid-cols-4"
                                >
                                  <div>
                                    <p className="text-xs text-mono-muted">
                                      Effective
                                    </p>
                                    <p className="mt-1 font-medium text-mono-text">
                                      {revision.effectiveLabel}
                                    </p>
                                    <p className="text-xs text-mono-muted">
                                      Payout {revision.payoutLabel}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-mono-muted">
                                      Gross / Revised Gross
                                    </p>
                                    <p className="mnx-numeric mt-1 font-medium text-mono-text">
                                      {formatINR(revision.grossAnnual)} to{" "}
                                      {formatINR(revision.revisedGrossAnnual)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-mono-muted">
                                      CTC / Revised CTC
                                    </p>
                                    <p className="mnx-numeric mt-1 font-medium text-mono-text">
                                      {formatINR(revision.ctcAnnual)} to{" "}
                                      {formatINR(revision.revisedCtcAnnual)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-mono-muted">
                                      Revision / Status
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-[var(--mnx-success)]">
                                      {formatPercent(revision.revisionPercent)}
                                    </p>
                                    <Badge
                                      className={`mt-2 border ${statusBadgeClass(revision.status ?? "UNKNOWN")}`}
                                    >
                                      {revision.statusLabel ?? "Unknown"}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </DataTableBody>
        </DataTable>
      </div>
    </div>
  );
}

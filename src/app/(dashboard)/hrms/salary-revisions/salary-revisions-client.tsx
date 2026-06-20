"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronRight, FileText, IndianRupee, TrendingUp, Users } from "lucide-react";
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
} from "@/components/data-table";
import { Input } from "@/components/ui/input";
import type { SalaryRevisionStats, SalaryRevisionSummary } from "@/modules/hrms/salary-revisions-shared";
import { formatINR, formatPercent } from "@/modules/hrms/salary-revisions-shared";

type StatusFilter = "ALL" | "APPROVED" | "PENDING" | "REJECTED";
type SortMode = "LATEST" | "EMPLOYEE";

function statusBadgeClass(status: StatusFilter | "UNKNOWN") {
  if (status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-outline-variant bg-surface-container-high text-on-surface-variant";
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
    <article
      className="group relative overflow-hidden rounded-[24px] border border-outline-variant/20 bg-surface p-5 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.24)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(0,206,196,0.28)] dark:bg-surface dark:shadow-ambient dark:hover:shadow-ambient-hover"
    >
      <div className="absolute inset-x-0 top-0 h-14 bg-[linear-gradient(180deg,rgba(0,206,196,0.06),transparent)] dark:bg-[linear-gradient(180deg,rgba(0,206,196,0.08),transparent)]" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00cec4]/10 transition duration-300 group-hover:scale-105 group-hover:bg-[#00cec4]/14">
            {icon}
          </div>
          <ArrowUpRight className="size-4 text-slate-300 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#00cec4] dark:text-outline" />
        </div>

        <div className="mt-6">
          <p className="text-[2.35rem] font-extralight leading-none tracking-[-0.04em] text-slate-900 dark:text-on-surface">
            {value}
          </p>
          <p className="mt-1.5 text-[14px] font-normal text-on-surface-variant dark:text-on-surface-variant">{label}</p>
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
  const [expandedEmployeeId, setExpandedEmployeeId] = useState(initialEmployeeId ?? "");
  const hasActiveCriteria = statusFilter !== "ALL" || sortMode !== "LATEST" || search.trim().length > 0;

  function clearCriteria() {
    setStatusFilter("ALL");
    setSortMode("LATEST");
    setSearch("");
    setExpandedEmployeeId("");
  }

  const filteredSummaries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const next = summaries.filter((summary) => {
      const matchesStatus = statusFilter === "ALL" || summary.latestRevision?.status === statusFilter;
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
        if (Number.isFinite(leftNum) && Number.isFinite(rightNum) && leftNum !== rightNum) {
          return leftNum - rightNum;
        }
        return left.employeeName.localeCompare(right.employeeName);
      });
    }

    return [...next].sort((left, right) => (right.latestRevision?.effectiveSort ?? 0) - (left.latestRevision?.effectiveSort ?? 0));
  }, [search, sortMode, statusFilter, summaries]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          icon={<IndianRupee className="size-5 text-[#00cec4]" strokeWidth={1.9} />}
          label="Total revisions"
          value={String(stats.totalRevisions)}
        />
        <StatsCard
          icon={<Users className="size-5 text-[#00cec4]" strokeWidth={1.9} />}
          label="Employees"
          value={String(stats.employees)}
        />
        <StatsCard
          icon={<FileText className="size-5 text-[#00cec4]" strokeWidth={1.9} />}
          label="Approved"
          value={String(stats.approved)}
        />
        <StatsCard
          icon={<TrendingUp className="size-5 text-amber-600" strokeWidth={1.9} />}
          label="Pending"
          value={String(stats.pending)}
        />
      </div>

      <div className="card-top-accent ds-shell-lg overflow-hidden border border-outline-variant/40 bg-surface shadow-sm">
        <div className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", "APPROVED", "PENDING", "REJECTED"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  statusFilter === status
                    ? "border-[#00cec4] bg-[#00cec4] text-white"
                    : "border-outline-variant/40 bg-surface text-on-surface-variant hover:border-[#00cec4]/45 hover:text-on-surface"
                }`}
              >
                {status === "ALL" ? "All" : `${status.charAt(0)}${status.slice(1).toLowerCase()}`}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSortMode((current) => (current === "LATEST" ? "EMPLOYEE" : "LATEST"))}
              className="rounded-full border border-outline-variant/40 bg-surface px-4 py-2 text-sm text-on-surface-variant transition hover:border-[#00cec4]/45 hover:text-on-surface"
            >
              {sortMode === "LATEST" ? "Latest first" : "By Emp #"}
            </button>
            <button
              type="button"
              onClick={clearCriteria}
              disabled={!hasActiveCriteria}
              className="rounded-full border border-outline-variant/40 bg-surface px-4 py-2 text-sm text-on-surface-variant transition hover:border-[#00cec4]/45 hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear criteria
            </button>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee, emp #, or department"
            className="w-full lg:max-w-sm"
          />
        </div>

        <DataTable className="w-full overflow-visible rounded-none border-0 border-t border-outline-variant/30 bg-transparent shadow-none">
          <DataTableHeader>
            <tr>
              <DataTableHead className="px-5 py-3 text-left">EMP ID</DataTableHead>
              <DataTableHead className="px-5 py-3 text-left">NAME</DataTableHead>
              <DataTableHead className="px-5 py-3 text-left">DEPARTMENT</DataTableHead>
              <DataTableHead className="px-5 py-3 text-left">EFFECTIVE</DataTableHead>
              <DataTableHead className="px-5 py-3 text-left">REVISED CTC</DataTableHead>
              <DataTableHead className="px-5 py-3 text-left">REV %</DataTableHead>
              <DataTableHead className="px-5 py-3 text-left">STATUS</DataTableHead>
              <DataTableHead className="px-5 py-3 text-right">ACTION</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {filteredSummaries.length === 0 ? (
              <DataTableEmpty colSpan={8} message="No salary revisions match the current filters." />
            ) : (
              filteredSummaries.map((summary) => {
                const latest = summary.latestRevision;
                const hasHistory = summary.revisions.length > 1;
                const isExpanded = expandedEmployeeId === summary.userId;
                const pastRevisions = summary.revisions.slice(1);

                return (
                  <Fragment key={summary.userId}>
                    <DataTableRow key={summary.userId}>
                      <DataTableCell className="px-5 py-4 font-medium text-on-surface">{summary.employeeNumber}</DataTableCell>
                      {hasHistory ? (
                        <DataTableCell className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setExpandedEmployeeId((current) => (current === summary.userId ? "" : summary.userId))}
                            className="block min-w-0 text-left"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <p className="font-medium text-on-surface">{summary.employeeName}</p>
                              <p className="text-xs text-on-surface-variant">{summary.designation ?? "-"}</p>
                            </div>
                          </button>
                        </DataTableCell>
                      ) : (
                        <DataTablePrimaryLinkCell
                          href={`/hrms/employees/${summary.userId}`}
                          className="px-0 py-0"
                          linkClassName="block min-w-0 py-4"
                        >
                          <div className="space-y-0.5">
                            <p className="font-medium text-on-surface">{summary.employeeName}</p>
                            <p className="text-xs text-on-surface-variant">{summary.designation ?? "-"}</p>
                          </div>
                        </DataTablePrimaryLinkCell>
                      )}
                      <DataTableCell className="px-5 py-4 text-on-surface-variant">{summary.departmentName ?? "-"}</DataTableCell>
                      <DataTableCell className="px-5 py-4 text-on-surface-variant">{latest?.effectiveLabel ?? "-"}</DataTableCell>
                      <DataTableCell className="ds-numeric px-5 py-4 font-semibold text-on-surface">{formatINR(latest?.revisedCtcAnnual ?? null)}</DataTableCell>
                      <DataTableCell className="ds-numeric px-5 py-4 font-medium text-emerald-600">{formatPercent(latest?.revisionPercent ?? null)}</DataTableCell>
                      <DataTableCell className="px-5 py-4">
                        <Badge className={`border ${statusBadgeClass(latest?.status ?? "UNKNOWN")}`}>
                          {latest?.statusLabel ?? "Unknown"}
                        </Badge>
                      </DataTableCell>
                      <DataTableCell className="px-5 py-4 text-right">
                        {hasHistory ? (
                          <button
                            type="button"
                            onClick={() => setExpandedEmployeeId((current) => (current === summary.userId ? "" : summary.userId))}
                            className="inline-flex text-outline-variant transition-colors hover:text-[#00b5ad]"
                            aria-label={isExpanded ? `Collapse revisions for ${summary.employeeName}` : `Expand revisions for ${summary.employeeName}`}
                          >
                            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </button>
                        ) : (
                          <Link
                            href={`/hrms/employees/${summary.userId}`}
                            className="inline-flex text-outline-variant transition-colors hover:text-[#00b5ad]"
                            aria-label={`View ${summary.employeeName}`}
                          >
                            <ChevronRight className="size-4" />
                          </Link>
                        )}
                      </DataTableCell>
                    </DataTableRow>
                    {isExpanded && hasHistory ? (
                      <tr className="bg-surface-container-low/40">
                        <td colSpan={8} className="px-5 py-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                                Revision History
                              </p>
                              <Link href={`/hrms/employees/${summary.userId}`} className="inline-flex text-sm font-medium text-[#00a9a0] transition hover:text-[#008c85]">
                                View employee
                              </Link>
                            </div>
                            <div className="grid gap-3">
                              {pastRevisions.map((revision) => (
                                <div
                                  key={revision.id}
                                  className="grid gap-3 rounded-[22px] border border-outline-variant/30 bg-surface px-4 py-4 md:grid-cols-4"
                                >
                                  <div>
                                    <p className="text-xs text-on-surface-variant">Effective</p>
                                    <p className="mt-1 font-medium text-on-surface">{revision.effectiveLabel}</p>
                                    <p className="text-xs text-on-surface-variant">Payout {revision.payoutLabel}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-on-surface-variant">Gross / Revised Gross</p>
                                    <p className="ds-numeric mt-1 font-medium text-on-surface">
                                      {formatINR(revision.grossAnnual)} to {formatINR(revision.revisedGrossAnnual)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-on-surface-variant">CTC / Revised CTC</p>
                                    <p className="ds-numeric mt-1 font-medium text-on-surface">
                                      {formatINR(revision.ctcAnnual)} to {formatINR(revision.revisedCtcAnnual)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-on-surface-variant">Revision / Status</p>
                                    <p className="mt-1 text-sm font-medium text-emerald-600">
                                      {formatPercent(revision.revisionPercent)}
                                    </p>
                                    <Badge className={`mt-2 border ${statusBadgeClass(revision.status ?? "UNKNOWN")}`}>
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

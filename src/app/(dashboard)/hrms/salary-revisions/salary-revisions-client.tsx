"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText, IndianRupee, TrendingUp, Users } from "lucide-react";
import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-table";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import type { SalaryRevisionStats, SalaryRevisionSummary } from "@/modules/hrms/salary-revisions-shared";
import { formatINR, formatPercent } from "@/modules/hrms/salary-revisions-shared";

type StatusFilter = "ALL" | "APPROVED" | "PENDING" | "REJECTED";
type SortMode = "LATEST" | "EMPLOYEE";

function statusBadgeClass(status: StatusFilter | "UNKNOWN") {
  if (status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function StatsCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`rounded-[24px] border bg-surface p-5 shadow-sm ${tone}`}>
      <div className="mb-4 inline-flex rounded-2xl bg-surface-container-low p-3 text-on-surface">{icon}</div>
      <p className="ds-numeric text-4xl font-semibold text-on-surface">{value}</p>
      <p className="mt-1 text-sm text-on-surface-variant">{label}</p>
    </div>
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
  const [selectedHistory, setSelectedHistory] = useState<Record<string, string>>({});

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
        <StatsCard icon={<IndianRupee className="size-5" />} label="Total revisions" value={String(stats.totalRevisions)} tone="border-[#00cec4]/35" />
        <StatsCard icon={<Users className="size-5" />} label="Employees" value={String(stats.employees)} tone="border-cyan-200" />
        <StatsCard icon={<FileText className="size-5" />} label="Approved" value={String(stats.approved)} tone="border-emerald-200" />
        <StatsCard icon={<TrendingUp className="size-5" />} label="Pending" value={String(stats.pending)} tone="border-amber-200" />
      </div>

      <div className="flex flex-col gap-4 rounded-[28px] border border-outline-variant/40 bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee, emp #, or department"
            className="w-full lg:max-w-sm"
          />
        </div>

        <DataTable className="border-outline-variant/30">
          <DataTableHeader>
            <tr>
              <DataTableHead>Emp #</DataTableHead>
              <DataTableHead>Name</DataTableHead>
              <DataTableHead>Department</DataTableHead>
              <DataTableHead>Effective</DataTableHead>
              <DataTableHead>Revised CTC</DataTableHead>
              <DataTableHead>Rev %</DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead className="text-right">History</DataTableHead>
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
                const selectedHistoryId = selectedHistory[summary.userId] ?? summary.revisions[1]?.id ?? "";
                const historyOptions = summary.revisions.slice(1).map((revision) => ({
                  value: revision.id,
                  label: `${revision.effectiveLabel} • ${formatINR(revision.revisedCtcAnnual)}`,
                }));
                const selectedRevision = summary.revisions.find((revision) => revision.id === selectedHistoryId) ?? summary.revisions[1] ?? null;

                return (
                  <Fragment key={summary.userId}>
                    <DataTableRow key={summary.userId}>
                      <DataTableCell className="font-medium text-on-surface">{summary.employeeNumber}</DataTableCell>
                      <DataTableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium text-on-surface">{summary.employeeName}</p>
                          <p className="text-xs text-on-surface-variant">{summary.designation ?? "-"}</p>
                        </div>
                      </DataTableCell>
                      <DataTableCell className="text-on-surface-variant">{summary.departmentName ?? "-"}</DataTableCell>
                      <DataTableCell className="text-on-surface-variant">{latest?.effectiveLabel ?? "-"}</DataTableCell>
                      <DataTableCell className="ds-numeric font-semibold text-on-surface">{formatINR(latest?.revisedCtcAnnual ?? null)}</DataTableCell>
                      <DataTableCell className="ds-numeric font-medium text-emerald-600">{formatPercent(latest?.revisionPercent ?? null)}</DataTableCell>
                      <DataTableCell>
                        <Badge className={`border ${statusBadgeClass(latest?.status ?? "UNKNOWN")}`}>
                          {latest?.statusLabel ?? "Unknown"}
                        </Badge>
                      </DataTableCell>
                      <DataTableCell className="text-right">
                        {hasHistory ? (
                          <button
                            type="button"
                            onClick={() => setExpandedEmployeeId((current) => (current === summary.userId ? "" : summary.userId))}
                            className="inline-flex items-center gap-2 text-sm font-medium text-[#00a9a0] transition hover:text-[#008c85]"
                          >
                            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            {isExpanded ? "Hide history" : `History (${summary.revisions.length - 1})`}
                          </button>
                        ) : (
                          <Link href={`/hrms/employees/${summary.userId}`} className="text-sm font-medium text-[#00a9a0] transition hover:text-[#008c85]">
                            View employee
                          </Link>
                        )}
                      </DataTableCell>
                    </DataTableRow>
                    {isExpanded && hasHistory ? (
                      <tr className="bg-surface-container-low/50">
                        <td colSpan={8} className="px-5 py-4">
                          <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Past History</p>
                              <DropdownSelect
                                ariaLabel="Select past revision"
                                onValueChange={(value) =>
                                  setSelectedHistory((current) => ({ ...current, [summary.userId]: value }))
                                }
                                options={historyOptions}
                                value={selectedHistoryId}
                              />
                              <Link href={`/hrms/employees/${summary.userId}`} className="inline-flex text-sm font-medium text-[#00a9a0] transition hover:text-[#008c85]">
                                View employee →
                              </Link>
                            </div>
                            {selectedRevision ? (
                              <div className="grid gap-3 md:grid-cols-3">
                                <div className="rounded-2xl border border-outline-variant/30 bg-surface px-4 py-3">
                                  <p className="text-xs text-on-surface-variant">Effective</p>
                                  <p className="mt-1 font-medium text-on-surface">{selectedRevision.effectiveLabel}</p>
                                  <p className="text-xs text-on-surface-variant">Payout {selectedRevision.payoutLabel}</p>
                                </div>
                                <div className="rounded-2xl border border-outline-variant/30 bg-surface px-4 py-3">
                                  <p className="text-xs text-on-surface-variant">Gross / Revised Gross</p>
                                  <p className="ds-numeric mt-1 font-medium text-on-surface">
                                    {formatINR(selectedRevision.grossAnnual)} → {formatINR(selectedRevision.revisedGrossAnnual)}
                                  </p>
                                </div>
                                <div className="rounded-2xl border border-outline-variant/30 bg-surface px-4 py-3">
                                  <p className="text-xs text-on-surface-variant">CTC / Revised CTC</p>
                                  <p className="ds-numeric mt-1 font-medium text-on-surface">
                                    {formatINR(selectedRevision.ctcAnnual)} → {formatINR(selectedRevision.revisedCtcAnnual)}
                                  </p>
                                  <p className="mt-1 text-xs font-medium text-emerald-600">{formatPercent(selectedRevision.revisionPercent)}</p>
                                </div>
                              </div>
                            ) : null}
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

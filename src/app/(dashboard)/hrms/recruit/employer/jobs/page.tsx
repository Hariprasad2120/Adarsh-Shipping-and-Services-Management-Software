"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Add, Search } from "@carbon/icons-react";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  DataTableEmpty,
} from "@/components/data-table";

type JobOpening = {
  id: string;
  requisitionNumber: string;
  title: string;
  department: string | null;
  location: string | null;
  status: string;
  applicationCount: number;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-surface-container text-on-surface-variant border-outline-variant",
  OPEN: "bg-[#00cec4]/10 text-[#00cec4] border-[#00cec4]/20",
  PAUSED: "bg-[#fb923c]/10 text-[#fb923c] border-[#fb923c]/20",
  CLOSED: "bg-surface-container text-on-surface-variant border-outline-variant",
  CANCELLED: "bg-surface-container text-on-surface-variant border-outline-variant",
  FILLED: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20",
};

export default function EmployerJobsPage() {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const res = await fetch(`/api/recruit/jobs?${params}`);
    if (res.ok) {
      const data = await res.json();
      setJobs(data.data?.items ?? data.items ?? []);
    }
    setLoading(false);
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ds-h1 text-on-surface">Job Openings</h1>
          <p className="text-sm text-on-surface-variant">Active requisitions and hiring pipeline</p>
        </div>
        <Link
          href="/hrms/recruit/employer/jobs/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[#00cec4] px-4 py-2 text-sm font-medium text-white uppercase tracking-wide transition hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)]"
        >
          <Add size={16} />
          Post Job
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="search"
            placeholder="Search job titles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="DRAFT">Draft</option>
          <option value="PAUSED">Paused</option>
          <option value="FILLED">Filled</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
        <DataTable>
          <DataTableHeader>
            <tr>
              <DataTableHead>Job / Req #</DataTableHead>
              <DataTableHead>Department</DataTableHead>
              <DataTableHead>Location</DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead>Applications</DataTableHead>
              <DataTableHead>Posted</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {loading ? (
              <DataTableEmpty colSpan={6} message="Loading..." />
            ) : jobs.length === 0 ? (
              <DataTableEmpty colSpan={6} message="No job openings found. Post your first role." />
            ) : (
              jobs.map((job) => (
                <DataTableRow key={job.id}>
                  <DataTableCell>
                    <Link
                      href={`/hrms/recruit/employer/jobs/${job.id}`}
                      className="font-medium text-on-surface hover:text-[#00cec4]"
                    >
                      {job.title}
                    </Link>
                    <p className="ds-label mt-0.5">{job.requisitionNumber}</p>
                  </DataTableCell>
                  <DataTableCell className="text-on-surface-variant">{job.department ?? "—"}</DataTableCell>
                  <DataTableCell className="text-on-surface-variant">{job.location ?? "—"}</DataTableCell>
                  <DataTableCell>
                    <span
                      className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[job.status] ?? ""}`}
                    >
                      {job.status}
                    </span>
                  </DataTableCell>
                  <DataTableCell className="ds-numeric text-on-surface-variant">
                    {job.applicationCount ?? 0}
                  </DataTableCell>
                  <DataTableCell className="text-on-surface-variant">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </div>
    </div>
  );
}

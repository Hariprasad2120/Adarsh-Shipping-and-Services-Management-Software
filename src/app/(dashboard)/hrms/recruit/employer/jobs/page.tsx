"use client";

import { PeopleControlInput as MnxInput } from "@/modules/people/components/people-controls";

import { NativeSelect } from "@/components/ui/native-select";
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
} from "@/modules/people/components/people-data-table";

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
  DRAFT: "bg-mono-soft text-mono-muted border-mono-border",
  OPEN: "bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)] border-[var(--mnx-accent)]/20",
  PAUSED:
    "bg-[var(--mnx-warning)]/10 text-[var(--mnx-warning)] border-[var(--mnx-warning)]/20",
  CLOSED: "bg-mono-soft text-mono-muted border-mono-border",
  CANCELLED: "bg-mono-soft text-mono-muted border-mono-border",
  FILLED:
    "bg-[var(--mnx-success)]/10 text-[var(--mnx-success)] border-[var(--mnx-success)]/20",
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
          <h1 className="mnx-title-1 text-mono-text">Job Openings</h1>
          <p className="text-sm text-mono-muted">
            Active requisitions and hiring pipeline
          </p>
        </div>
        <Link
          href="/hrms/recruit/employer/jobs/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--mnx-accent)] px-4 py-2 text-sm font-medium text-[var(--mnx-text)] uppercase tracking-wide transition hover:bg-[var(--mnx-accent-soft)] hover:shadow-ambient-hover"
        >
          <Add size={16} />
          Post Job
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-mono-muted"
          />
          <MnxInput
            type="search"
            placeholder="Search job titles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <NativeSelect
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
        </NativeSelect>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-mono-border bg-mono-card shadow-sm">
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
              <DataTableEmpty
                colSpan={6}
                message="No job openings found. Post your first role."
              />
            ) : (
              jobs.map((job) => (
                <DataTableRow key={job.id}>
                  <DataTableCell>
                    <Link
                      href={`/hrms/recruit/employer/jobs/${job.id}`}
                      className="font-medium text-mono-text hover:text-[var(--mnx-accent)]"
                    >
                      {job.title}
                    </Link>
                    <p className="mnx-dashboard-spec-label mt-0.5">
                      {job.requisitionNumber}
                    </p>
                  </DataTableCell>
                  <DataTableCell className="text-mono-muted">
                    {job.department ?? "—"}
                  </DataTableCell>
                  <DataTableCell className="text-mono-muted">
                    {job.location ?? "—"}
                  </DataTableCell>
                  <DataTableCell>
                    <span
                      className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[job.status] ?? ""}`}
                    >
                      {job.status}
                    </span>
                  </DataTableCell>
                  <DataTableCell className="mnx-numeric text-mono-muted">
                    {job.applicationCount ?? 0}
                  </DataTableCell>
                  <DataTableCell className="text-mono-muted">
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

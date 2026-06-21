"use client";

import { useState, useEffect, useCallback } from "react";
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

type JsApp = {
  id: string;
  jobTitle: string;
  company: string;
  privateStatus: string;
  source: string | null;
  appliedAt: string;
  lastActivityAt: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  APPLIED: "bg-[#818cf8]/10 text-[#818cf8] border-[#818cf8]/20",
  UNDER_REVIEW: "bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/20",
  SHORTLISTED: "bg-[#00cec4]/10 text-[#00cec4] border-[#00cec4]/20",
  INTERVIEWING: "bg-[#c084fc]/10 text-[#c084fc] border-[#c084fc]/20",
  OFFER: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20",
  REJECTED: "bg-surface-container text-on-surface-variant border-outline-variant",
  WITHDRAWN: "bg-surface-container text-on-surface-variant border-outline-variant",
  ACCEPTED: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20",
  GHOSTED: "bg-surface-container text-on-surface-variant border-outline-variant",
};

export default function CareerApplicationsPage() {
  const [apps, setApps] = useState<JsApp[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ jobTitle: "", company: "", source: "", applicationUrl: "" });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const res = await fetch(`/api/recruit/jobseeker/applications?${params}`);
    if (res.ok) {
      const data = await res.json();
      setApps(data.data?.items ?? data.items ?? []);
    }
    setLoading(false);
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    const res = await fetch("/api/recruit/jobseeker/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (res.ok) {
      setShowAdd(false);
      setAddForm({ jobTitle: "", company: "", source: "", applicationUrl: "" });
      load();
    }
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ds-h1 text-on-surface">My Applications</h1>
          <p className="text-sm text-on-surface-variant">Track every job you have applied for — private to you</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#00cec4] px-4 py-2 text-sm font-medium text-white uppercase tracking-wide transition hover:bg-[#00b8af]"
        >
          <Add size={16} />
          Log Application
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-outline-variant bg-surface p-5 space-y-3"
        >
          <h3 className="ds-h3 text-on-surface">Log New Application</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ds-label mb-1 block">Job Title *</label>
              <input
                required
                value={addForm.jobTitle}
                onChange={(e) => setAddForm((f) => ({ ...f, jobTitle: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm"
                placeholder="e.g. Marketing Manager"
              />
            </div>
            <div>
              <label className="ds-label mb-1 block">Company *</label>
              <input
                required
                value={addForm.company}
                onChange={(e) => setAddForm((f) => ({ ...f, company: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm"
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div>
              <label className="ds-label mb-1 block">Source</label>
              <input
                value={addForm.source}
                onChange={(e) => setAddForm((f) => ({ ...f, source: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm"
                placeholder="LinkedIn, referral, etc."
              />
            </div>
            <div>
              <label className="ds-label mb-1 block">Application URL</label>
              <input
                type="url"
                value={addForm.applicationUrl}
                onChange={(e) => setAddForm((f) => ({ ...f, applicationUrl: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={adding}
              className="rounded-xl bg-[#00cec4] px-4 py-2 text-sm font-medium text-white hover:bg-[#00b8af] disabled:opacity-50"
            >
              {adding ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-xl border border-outline-variant px-4 py-2 text-sm text-on-surface-variant"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="search"
            placeholder="Search by job or company..."
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
          {Object.keys(STATUS_COLORS).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
        <DataTable>
          <DataTableHeader>
            <tr>
              <DataTableHead>Job</DataTableHead>
              <DataTableHead>Company</DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead>Source</DataTableHead>
              <DataTableHead>Applied</DataTableHead>
              <DataTableHead>Last Activity</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {loading ? (
              <DataTableEmpty colSpan={6} message="Loading..." />
            ) : apps.length === 0 ? (
              <DataTableEmpty colSpan={6} message="No applications logged yet." />
            ) : (
              apps.map((app) => (
                <DataTableRow key={app.id}>
                  <DataTableCell>
                    <span className="font-medium text-on-surface">{app.jobTitle}</span>
                  </DataTableCell>
                  <DataTableCell className="text-on-surface-variant">{app.company}</DataTableCell>
                  <DataTableCell>
                    <span
                      className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[app.privateStatus] ?? ""}`}
                    >
                      {app.privateStatus}
                    </span>
                  </DataTableCell>
                  <DataTableCell className="ds-label">{app.source ?? "—"}</DataTableCell>
                  <DataTableCell className="text-on-surface-variant">
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </DataTableCell>
                  <DataTableCell className="text-on-surface-variant">
                    {app.lastActivityAt ? new Date(app.lastActivityAt).toLocaleDateString() : "—"}
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

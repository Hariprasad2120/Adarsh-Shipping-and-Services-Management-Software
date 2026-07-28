"use client";

import { NativeSelect } from "@/components/monolith/native-select";
import { useState, useEffect, useCallback } from "react";
import { Add, Search } from "@carbon/icons-react";
import {DataTable,DataTableBody,DataTableCell,DataTableHead,DataTableHeader,DataTableRow,DataTableEmpty,} from "@/components/data-table";

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
  SHORTLISTED: "bg-[#F9D972]/10 text-[#F9D972] border-[#F9D972]/20",
  INTERVIEWING: "bg-[#c084fc]/10 text-[#c084fc] border-[#c084fc]/20",
  OFFER: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20",
  REJECTED: "bg-mono-soft text-mono-muted border-mono-border",
  WITHDRAWN: "bg-mono-soft text-mono-muted border-mono-border",
  ACCEPTED: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20",
  GHOSTED: "bg-mono-soft text-mono-muted border-mono-border",
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
          <h1 className="monolith-h1 text-mono-text">My Applications</h1>
          <p className="text-sm text-mono-muted">Track every job you have applied for — private to you</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F9D972] px-4 py-2 text-sm font-medium text-white uppercase tracking-wide transition hover:bg-[#E8C85D]"
        >
          <Add size={16} />
          Log Application
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-mono-border bg-mono-card p-5 space-y-3"
        >
          <h3 className="monolith-h3 text-mono-text">Log New Application</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="monolith-label mb-1 block">Job Title *</label>
              <input
                required
                value={addForm.jobTitle}
                onChange={(e) => setAddForm((f) => ({ ...f, jobTitle: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm"
                placeholder="e.g. Marketing Manager"
              />
            </div>
            <div>
              <label className="monolith-label mb-1 block">Company *</label>
              <input
                required
                value={addForm.company}
                onChange={(e) => setAddForm((f) => ({ ...f, company: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm"
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div>
              <label className="monolith-label mb-1 block">Source</label>
              <input
                value={addForm.source}
                onChange={(e) => setAddForm((f) => ({ ...f, source: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm"
                placeholder="LinkedIn, referral, etc."
              />
            </div>
            <div>
              <label className="monolith-label mb-1 block">Application URL</label>
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
              className="rounded-xl bg-[#F9D972] px-4 py-2 text-sm font-medium text-white hover:bg-[#E8C85D] disabled:opacity-50"
            >
              {adding ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-xl border border-mono-border px-4 py-2 text-sm text-mono-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mono-muted" />
          <input
            type="search"
            placeholder="Search by job or company..."
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
          {Object.keys(STATUS_COLORS).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </NativeSelect>
      </div>

      <div className="overflow-hidden rounded-xl border border-mono-border bg-mono-card shadow-sm">
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
                    <span className="font-medium text-mono-text">{app.jobTitle}</span>
                  </DataTableCell>
                  <DataTableCell className="text-mono-muted">{app.company}</DataTableCell>
                  <DataTableCell>
                    <span
                      className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[app.privateStatus] ?? ""}`}
                    >
                      {app.privateStatus}
                    </span>
                  </DataTableCell>
                  <DataTableCell className="monolith-label">{app.source ?? "—"}</DataTableCell>
                  <DataTableCell className="text-mono-muted">
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </DataTableCell>
                  <DataTableCell className="text-mono-muted">
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

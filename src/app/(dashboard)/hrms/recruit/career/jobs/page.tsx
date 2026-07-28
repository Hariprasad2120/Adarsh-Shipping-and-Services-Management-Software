"use client";

import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
} from "@/components/monolith/people-controls";

import { useState, useEffect, useCallback } from "react";
import { Search, Bookmark, Close } from "@carbon/icons-react";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  DataTableEmpty,
} from "@/components/monolith/people-data-table";

type Listing = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  workplaceType: string | null;
  employmentType: string | null;
  source: string;
  canonicalUrl: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  savedAt: string | null;
  postedAt: string | null;
};

export default function JobSearchPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (search) params.set("search", search);
    const res = await fetch(`/api/recruit/jobseeker/listings?${params}`);
    if (res.ok) {
      const data = await res.json();
      setListings(data.data?.items ?? data.items ?? []);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const dismiss = async (id: string) => {
    setActionPending(id);
    await fetch(`/api/recruit/jobseeker/listings?action=dismiss`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: id }),
    });
    setListings((l) => l.filter((x) => x.id !== id));
    setActionPending(null);
  };

  const save = async (id: string) => {
    setActionPending(id);
    await fetch(`/api/recruit/jobseeker/listings?action=save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: id }),
    });
    setListings((l) =>
      l.map((x) =>
        x.id === id ? { ...x, savedAt: new Date().toISOString() } : x,
      ),
    );
    setActionPending(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mnx-title-1 text-mono-text">Job Search</h1>
          <p className="text-sm text-mono-muted">
            Matched and discovered job listings — private to you
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-mono-muted"
        />
        <MnxInput
          type="search"
          placeholder="Search job titles, companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl py-2 pl-9 pr-3 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-mono-border bg-mono-card shadow-sm">
        <DataTable>
          <DataTableHeader>
            <tr>
              <DataTableHead>Job</DataTableHead>
              <DataTableHead>Company</DataTableHead>
              <DataTableHead>Location</DataTableHead>
              <DataTableHead>Type</DataTableHead>
              <DataTableHead>Source</DataTableHead>
              <DataTableHead>Actions</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {loading ? (
              <DataTableEmpty colSpan={6} message="Loading..." />
            ) : listings.length === 0 ? (
              <DataTableEmpty
                colSpan={6}
                message="No jobs found. Update your career profile to get matched."
              />
            ) : (
              listings.map((l) => (
                <DataTableRow key={l.id}>
                  <DataTableCell>
                    {l.canonicalUrl ? (
                      <a
                        href={l.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-mono-text hover:text-[var(--mnx-info)]"
                      >
                        {l.title}
                      </a>
                    ) : (
                      <span className="font-medium text-mono-text">
                        {l.title}
                      </span>
                    )}
                    {l.salaryMin && (
                      <p className="mnx-numeric mnx-dashboard-spec-label mt-0.5">
                        {l.salaryMin.toLocaleString()} –{" "}
                        {l.salaryMax?.toLocaleString() ?? "?"}
                      </p>
                    )}
                  </DataTableCell>
                  <DataTableCell className="text-mono-muted">
                    {l.company}
                  </DataTableCell>
                  <DataTableCell className="text-mono-muted">
                    {l.location ?? "—"}
                  </DataTableCell>
                  <DataTableCell className="text-mono-muted">
                    {l.workplaceType ?? l.employmentType ?? "—"}
                  </DataTableCell>
                  <DataTableCell className="mnx-dashboard-spec-label">
                    {l.source}
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex items-center gap-2">
                      <MnxAction
                        onClick={() => save(l.id)}
                        disabled={!!actionPending || !!l.savedAt}
                        title={l.savedAt ? "Saved" : "Save job"}
                        className={`rounded-lg p-1.5 transition ${l.savedAt ? "text-[var(--mnx-info)]" : "text-mono-muted hover:text-[var(--mnx-info)]"}`}
                      >
                        <Bookmark size={16} />
                      </MnxAction>
                      <MnxAction
                        onClick={() => dismiss(l.id)}
                        disabled={!!actionPending}
                        title="Dismiss"
                        className="rounded-lg p-1.5 text-mono-muted transition hover:text-[var(--mnx-warning)]"
                      >
                        <Close size={16} />
                      </MnxAction>
                    </div>
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

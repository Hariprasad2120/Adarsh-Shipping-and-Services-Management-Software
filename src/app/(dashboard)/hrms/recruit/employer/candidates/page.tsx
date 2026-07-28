"use client";

import { PeopleControlInput as MnxInput } from "@/components/monolith/people-controls";

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
} from "@/components/monolith/people-data-table";

type Candidate = {
  id: string;
  candidateNumber: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  createdAt: string;
};

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (search) params.set("search", search);
    const res = await fetch(`/api/recruit/candidates?${params}`);
    if (res.ok) {
      const data = await res.json();
      setCandidates(data.data?.items ?? data.items ?? []);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mnx-title-1 text-mono-text">Candidates</h1>
          <p className="text-sm text-mono-muted">
            Talent pool and candidate profiles
          </p>
        </div>
        <Link
          href="/hrms/recruit/employer/candidates/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--mnx-accent)] px-4 py-2 text-sm font-medium text-[var(--mnx-text)] uppercase tracking-wide transition hover:bg-[var(--mnx-accent-soft)] hover:shadow-ambient-hover"
        >
          <Add size={16} />
          Add Candidate
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-mono-muted"
        />
        <MnxInput
          type="search"
          placeholder="Search by name, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl py-2 pl-9 pr-3 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-mono-border bg-mono-card shadow-sm">
        <DataTable>
          <DataTableHeader>
            <tr>
              <DataTableHead>Candidate</DataTableHead>
              <DataTableHead>Ref #</DataTableHead>
              <DataTableHead>Current Role</DataTableHead>
              <DataTableHead>Phone</DataTableHead>
              <DataTableHead>Added</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {loading ? (
              <DataTableEmpty colSpan={5} message="Loading..." />
            ) : candidates.length === 0 ? (
              <DataTableEmpty
                colSpan={5}
                message="No candidates yet. Add your first candidate."
              />
            ) : (
              candidates.map((c) => (
                <DataTableRow key={c.id}>
                  <DataTableCell>
                    <Link
                      href={`/hrms/recruit/employer/candidates/${c.id}`}
                      className="font-medium text-mono-text hover:text-[var(--mnx-accent)]"
                    >
                      {c.fullName}
                    </Link>
                    {c.email && (
                      <p className="mnx-dashboard-spec-label mt-0.5">
                        {c.email}
                      </p>
                    )}
                  </DataTableCell>
                  <DataTableCell className="mnx-dashboard-spec-label">
                    {c.candidateNumber}
                  </DataTableCell>
                  <DataTableCell className="text-mono-muted">
                    {c.currentTitle ?? "—"}
                    {c.currentCompany && (
                      <span className="text-outline">
                        {" "}
                        · {c.currentCompany}
                      </span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="text-mono-muted">
                    {c.phone ?? "—"}
                  </DataTableCell>
                  <DataTableCell className="text-mono-muted">
                    {new Date(c.createdAt).toLocaleDateString()}
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

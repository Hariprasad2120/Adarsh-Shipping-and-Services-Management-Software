"use client";

import { PeopleControlInput as MnxInput } from "@/modules/people/components/people-controls";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Add, Search } from "@carbon/icons-react";
import {
  OperationalDataTable,
  OperationalDataTableWrap,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";

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

      <OperationalDataTable>
        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                <OperationalTableHead>Candidate</OperationalTableHead>
                <OperationalTableHead>Ref #</OperationalTableHead>
                <OperationalTableHead>Current Role</OperationalTableHead>
                <OperationalTableHead>Phone</OperationalTableHead>
                <OperationalTableHead>Added</OperationalTableHead>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <OperationalTableEmpty colSpan={5}>Loading...</OperationalTableEmpty>
              ) : candidates.length === 0 ? (
                <OperationalTableEmpty colSpan={5}>
                  No candidates yet. Add your first candidate.
                </OperationalTableEmpty>
              ) : (
                candidates.map((c) => (
                  <tr key={c.id}>
                    <OperationalTableCell>
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
                    </OperationalTableCell>
                    <OperationalTableCell className="mnx-dashboard-spec-label">
                      {c.candidateNumber}
                    </OperationalTableCell>
                    <OperationalTableCell className="text-mono-muted">
                      {c.currentTitle ?? "—"}
                      {c.currentCompany && (
                        <span className="text-outline">
                          {" "}
                          · {c.currentCompany}
                        </span>
                      )}
                    </OperationalTableCell>
                    <OperationalTableCell className="text-mono-muted">
                      {c.phone ?? "—"}
                    </OperationalTableCell>
                    <OperationalTableCell className="text-mono-muted">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </OperationalTableCell>
                  </tr>
                ))
              )}
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      </OperationalDataTable>
    </div>
  );
}

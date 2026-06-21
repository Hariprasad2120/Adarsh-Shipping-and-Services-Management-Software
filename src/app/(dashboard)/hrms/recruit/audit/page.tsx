"use client";

import { useState, useEffect, useCallback } from "react";
import { Search } from "@carbon/icons-react";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  DataTableEmpty,
} from "@/components/data-table";

type AuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorId: string | null;
  source: string | null;
  ipAddress: string | null;
  createdAt: string;
  actor?: { name: string; email: string | null } | null;
};

export default function RecruitAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), pageSize: "50" });
    if (action) params.set("action", action);
    const res = await fetch(`/api/recruit/audit?${params}`);
    if (res.ok) {
      const data = await res.json();
      const items = data.data?.items ?? data.items ?? [];
      setEvents(p === 1 ? items : (prev) => [...prev, ...items]);
      setHasMore(data.data?.hasMore ?? false);
      setPage(p);
    }
    setLoading(false);
  }, [action]);

  useEffect(() => {
    load(1);
  }, [load]);

  const filtered = search
    ? events.filter(
        (e) =>
          e.action.toLowerCase().includes(search.toLowerCase()) ||
          e.entityType.toLowerCase().includes(search.toLowerCase()) ||
          e.actor?.name.toLowerCase().includes(search.toLowerCase())
      )
    : events;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="ds-h1 text-on-surface">Recruit Audit Log</h1>
        <p className="text-sm text-on-surface-variant">Immutable log of all Recruit module mutations</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="search"
            placeholder="Filter by action, type, or actor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm"
        >
          <option value="">All Actions</option>
          <option value="recruit.job">Job events</option>
          <option value="recruit.candidate">Candidate events</option>
          <option value="recruit.application">Application events</option>
          <option value="recruit.offer">Offer events</option>
          <option value="recruit.screening">Screening events</option>
          <option value="recruit.interview">Interview events</option>
          <option value="recruit.settings">Settings changes</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
        <DataTable>
          <DataTableHeader>
            <tr>
              <DataTableHead>Action</DataTableHead>
              <DataTableHead>Entity</DataTableHead>
              <DataTableHead>Actor</DataTableHead>
              <DataTableHead>Source</DataTableHead>
              <DataTableHead>IP</DataTableHead>
              <DataTableHead>Timestamp</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {loading && events.length === 0 ? (
              <DataTableEmpty colSpan={6} message="Loading audit log..." />
            ) : filtered.length === 0 ? (
              <DataTableEmpty colSpan={6} message="No audit events found." />
            ) : (
              filtered.map((e) => (
                <DataTableRow key={e.id}>
                  <DataTableCell>
                    <span className="rounded-lg bg-surface-container px-2 py-0.5 text-xs font-mono text-on-surface-variant">
                      {e.action}
                    </span>
                  </DataTableCell>
                  <DataTableCell className="text-on-surface-variant">
                    <span className="ds-label">{e.entityType}</span>
                    {e.entityId && (
                      <p className="text-xs text-outline mt-0.5 font-mono">{e.entityId.slice(0, 8)}…</p>
                    )}
                  </DataTableCell>
                  <DataTableCell className="text-on-surface-variant">
                    {e.actor ? (
                      <>
                        <span className="font-medium text-on-surface">{e.actor.name}</span>
                        {e.actor.email && <p className="ds-label mt-0.5">{e.actor.email}</p>}
                      </>
                    ) : (
                      e.actorId ? <span className="font-mono text-xs">{e.actorId.slice(0, 8)}…</span> : "—"
                    )}
                  </DataTableCell>
                  <DataTableCell className="ds-label">{e.source ?? "—"}</DataTableCell>
                  <DataTableCell className="ds-label font-mono">{e.ipAddress ?? "—"}</DataTableCell>
                  <DataTableCell className="text-on-surface-variant">
                    {new Date(e.createdAt).toLocaleString()}
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </div>

      {hasMore && (
        <div className="text-center">
          <button
            onClick={() => load(page + 1)}
            disabled={loading}
            className="rounded-xl border border-outline-variant px-5 py-2 text-sm text-on-surface-variant hover:text-on-surface disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

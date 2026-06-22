"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
import { RECRUIT_APP_STAGES } from "@/modules/recruit/types";

type Application = {
  id: string;
  applicationNumber: string;
  stage: string;
  candidate: { fullName: string; email: string | null } | null;
  jobOpening: { title: string; requisitionNumber: string } | null;
  createdAt: string;
  updatedAt: string;
};

const STAGE_COLORS: Record<string, string> = {
  NEW: "bg-surface-container text-on-surface-variant border-outline-variant",
  SCREENING: "bg-[#818cf8]/10 text-[#818cf8] border-[#818cf8]/20",
  PHONE_SCREEN: "bg-[#818cf8]/10 text-[#818cf8] border-[#818cf8]/20",
  SHORTLISTED: "bg-[#00cec4]/10 text-[#00cec4] border-[#00cec4]/20",
  ASSESSMENT: "bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/20",
  INTERVIEW_1: "bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/20",
  INTERVIEW_2: "bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/20",
  INTERVIEW_3: "bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/20",
  FINAL_INTERVIEW: "bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/20",
  OFFER_APPROVAL: "bg-[#c084fc]/10 text-[#c084fc] border-[#c084fc]/20",
  OFFER_EXTENDED: "bg-[#c084fc]/10 text-[#c084fc] border-[#c084fc]/20",
  OFFER_ACCEPTED: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20",
  OFFER_DECLINED: "bg-[#fb923c]/10 text-[#fb923c] border-[#fb923c]/20",
  HIRED: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20",
  REJECTED: "bg-surface-container text-on-surface-variant border-outline-variant",
  WITHDRAWN: "bg-surface-container text-on-surface-variant border-outline-variant",
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (search) params.set("search", search);
    if (stage) params.set("stage", stage);
    const res = await fetch(`/api/recruit/applications?${params}`);
    if (res.ok) {
      const data = await res.json();
      setApplications(data.data?.items ?? data.items ?? []);
    }
    setLoading(false);
  }, [search, stage]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="ds-h1 text-on-surface">Applications</h1>
        <p className="text-sm text-on-surface-variant">All applications across open roles</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="search"
            placeholder="Search candidates or roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm"
        >
          <option value="">All Stages</option>
          {RECRUIT_APP_STAGES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
        <DataTable>
          <DataTableHeader>
            <tr>
              <DataTableHead>Candidate</DataTableHead>
              <DataTableHead>Role</DataTableHead>
              <DataTableHead>Ref #</DataTableHead>
              <DataTableHead>Stage</DataTableHead>
              <DataTableHead>Applied</DataTableHead>
              <DataTableHead>Updated</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {loading ? (
              <DataTableEmpty colSpan={6} message="Loading..." />
            ) : applications.length === 0 ? (
              <DataTableEmpty colSpan={6} message="No applications yet." />
            ) : (
              applications.map((app) => (
                <DataTableRow key={app.id}>
                  <DataTableCell>
                    <Link
                      href={`/hrms/recruit/employer/applications/${app.id}`}
                      className="font-medium text-on-surface hover:text-[#00cec4]"
                    >
                      {app.candidate?.fullName ?? "—"}
                    </Link>
                    {app.candidate?.email && (
                      <p className="ds-label mt-0.5">{app.candidate.email}</p>
                    )}
                  </DataTableCell>
                  <DataTableCell className="text-on-surface-variant">
                    {app.jobOpening?.title ?? "—"}
                    {app.jobOpening?.requisitionNumber && (
                      <p className="ds-label mt-0.5">{app.jobOpening.requisitionNumber}</p>
                    )}
                  </DataTableCell>
                  <DataTableCell className="ds-label">{app.applicationNumber}</DataTableCell>
                  <DataTableCell>
                    <span
                      className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[app.stage] ?? ""}`}
                    >
                      {app.stage.replace(/_/g, " ")}
                    </span>
                  </DataTableCell>
                  <DataTableCell className="text-on-surface-variant">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </DataTableCell>
                  <DataTableCell className="text-on-surface-variant">
                    {new Date(app.updatedAt).toLocaleDateString()}
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

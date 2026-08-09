"use client";

import { PeopleControlInput as MnxInput } from "@/modules/people/components/people-controls";

import { NativeSelect } from "@/components/ui/native-select";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search } from "@carbon/icons-react";
import {
  OperationalDataTable,
  OperationalDataTableWrap,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
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
  NEW: "bg-mono-soft text-mono-muted border-mono-border",
  SCREENING:
    "bg-[var(--mnx-info)]/10 text-[var(--mnx-info)] border-[var(--mnx-info)]/20",
  PHONE_SCREEN:
    "bg-[var(--mnx-info)]/10 text-[var(--mnx-info)] border-[var(--mnx-info)]/20",
  SHORTLISTED:
    "bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)] border-[var(--mnx-accent)]/20",
  ASSESSMENT:
    "bg-[var(--mnx-warning)]/10 text-[var(--mnx-warning)] border-[var(--mnx-warning)]/20",
  INTERVIEW_1:
    "bg-[var(--mnx-warning)]/10 text-[var(--mnx-warning)] border-[var(--mnx-warning)]/20",
  INTERVIEW_2:
    "bg-[var(--mnx-warning)]/10 text-[var(--mnx-warning)] border-[var(--mnx-warning)]/20",
  INTERVIEW_3:
    "bg-[var(--mnx-warning)]/10 text-[var(--mnx-warning)] border-[var(--mnx-warning)]/20",
  FINAL_INTERVIEW:
    "bg-[var(--mnx-warning)]/10 text-[var(--mnx-warning)] border-[var(--mnx-warning)]/20",
  OFFER_APPROVAL:
    "bg-[var(--mnx-accent-soft)]/10 text-[var(--mnx-accent-soft)] border-[var(--mnx-accent-soft)]/20",
  OFFER_EXTENDED:
    "bg-[var(--mnx-accent-soft)]/10 text-[var(--mnx-accent-soft)] border-[var(--mnx-accent-soft)]/20",
  OFFER_ACCEPTED:
    "bg-[var(--mnx-success)]/10 text-[var(--mnx-success)] border-[var(--mnx-success)]/20",
  OFFER_DECLINED:
    "bg-[var(--mnx-warning)]/10 text-[var(--mnx-warning)] border-[var(--mnx-warning)]/20",
  HIRED:
    "bg-[var(--mnx-success)]/10 text-[var(--mnx-success)] border-[var(--mnx-success)]/20",
  REJECTED: "bg-mono-soft text-mono-muted border-mono-border",
  WITHDRAWN: "bg-mono-soft text-mono-muted border-mono-border",
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
        <h1 className="mnx-title-1 text-mono-text">Applications</h1>
        <p className="text-sm text-mono-muted">
          All applications across open roles
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-mono-muted"
          />
          <MnxInput
            type="search"
            placeholder="Search candidates or roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <NativeSelect
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm"
        >
          <option value="">All Stages</option>
          {RECRUIT_APP_STAGES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </NativeSelect>
      </div>

      <OperationalDataTable>
        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                <OperationalTableHead>Candidate</OperationalTableHead>
                <OperationalTableHead>Role</OperationalTableHead>
                <OperationalTableHead>Ref #</OperationalTableHead>
                <OperationalTableHead>Stage</OperationalTableHead>
                <OperationalTableHead>Applied</OperationalTableHead>
                <OperationalTableHead>Updated</OperationalTableHead>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <OperationalTableEmpty colSpan={6}>Loading...</OperationalTableEmpty>
              ) : applications.length === 0 ? (
                <OperationalTableEmpty colSpan={6}>
                  No applications yet.
                </OperationalTableEmpty>
              ) : (
                applications.map((app) => (
                  <tr key={app.id}>
                    <OperationalTableCell>
                      <Link
                        href={`/hrms/recruit/employer/applications/${app.id}`}
                        className="font-medium text-mono-text hover:text-[var(--mnx-accent)]"
                      >
                        {app.candidate?.fullName ?? "—"}
                      </Link>
                      {app.candidate?.email && (
                        <p className="mnx-dashboard-spec-label mt-0.5">
                          {app.candidate.email}
                        </p>
                      )}
                    </OperationalTableCell>
                    <OperationalTableCell className="text-mono-muted">
                      {app.jobOpening?.title ?? "—"}
                      {app.jobOpening?.requisitionNumber && (
                        <p className="mnx-dashboard-spec-label mt-0.5">
                          {app.jobOpening.requisitionNumber}
                        </p>
                      )}
                    </OperationalTableCell>
                    <OperationalTableCell className="mnx-dashboard-spec-label">
                      {app.applicationNumber}
                    </OperationalTableCell>
                    <OperationalTableCell>
                      <span
                        className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[app.stage] ?? ""}`}
                      >
                        {app.stage.replace(/_/g, " ")}
                      </span>
                    </OperationalTableCell>
                    <OperationalTableCell className="text-mono-muted">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </OperationalTableCell>
                    <OperationalTableCell className="text-mono-muted">
                      {new Date(app.updatedAt).toLocaleDateString()}
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

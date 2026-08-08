"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Loader2,
  RefreshCw,
  Timer,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
  PeopleNotice,
} from "@/modules/people/components";

interface ApprovalsViewProps {
  isAdmin: boolean;
}

type ApprovalEmployee = {
  name: string;
  employeeNumber: number | null;
  photo: string | null;
};

type LeaveApproval = {
  id: string;
  fromDate: string;
  toDate: string;
  notes: string | null;
  user: ApprovalEmployee;
  leaveType: { name: string };
};

type RegularizationApproval = {
  id: string;
  date: string;
  reason: string;
  remarks?: string | null;
  user: ApprovalEmployee;
};

type OtApproval = {
  id: string;
  date: string;
  dayType: string;
  hoursWorked: number;
  otHours: number;
  calculationRemarks: string | null;
  rejectionRemarks: string | null;
  user: ApprovalEmployee;
};

type TravelApproval = {
  id: string;
  destination: string;
  purpose: string;
  fromDate?: string | null;
  toDate?: string | null;
  user: ApprovalEmployee;
};

type TimesheetApproval = {
  id: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  user: ApprovalEmployee;
};

type WorkReportApproval = {
  id: string;
  level: number;
  report: {
    id: string;
    date: string;
    workedOn: string;
    description: string;
    items: unknown;
    user: ApprovalEmployee;
  };
};

type ApprovalInbox = {
  leaves: LeaveApproval[];
  regularizations: RegularizationApproval[];
  ots: OtApproval[];
  travels: TravelApproval[];
  timesheets: TimesheetApproval[];
  workreports: WorkReportApproval[];
};

type ApprovalType =
  | "LEAVE"
  | "REGULARIZATION"
  | "OT"
  | "TRAVEL"
  | "TIMESHEET"
  | "WORKREPORT";

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN");
}

function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
) {
  const from = formatDate(start);
  const to = formatDate(end);
  return from === "—" && to === "—" ? "—" : `${from} - ${to}`;
}

function displayEmployeeNumber(value: number | null) {
  return value ? `Employee #${value}` : "Employee #—";
}

function renderAvatar(user: ApprovalEmployee) {
  return (
    <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[var(--frappe-radius-md)] border border-[var(--mnx-border)] bg-[var(--mnx-bg-subtle)] text-xs font-semibold text-[var(--mnx-text-muted)]">
      {user.photo ? (
        <Image
          alt=""
          className="object-cover"
          fill
          sizes="40px"
          src={user.photo}
          unoptimized
        />
      ) : (
        initialsFor(user.name)
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-4 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--mnx-text-muted)]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[var(--mnx-text)]">
        {value}
      </div>
    </div>
  );
}

function ApprovalSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--mnx-text-muted)]">
        {title} ({count})
      </div>
      <div className="border border-[var(--mnx-border)] bg-[var(--mnx-surface)]">
        {children}
      </div>
    </section>
  );
}

function ApprovalRow({
  user,
  title,
  description,
  meta,
  requestId,
  type,
  remarks,
  actingId,
  onRemarkChange,
  onDecision,
}: {
  user: ApprovalEmployee;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta: React.ReactNode;
  requestId: string;
  type: ApprovalType;
  remarks: string;
  actingId: string | null;
  onRemarkChange: (id: string, text: string) => void;
  onDecision: (
    requestId: string,
    type: ApprovalType,
    decision: "APPROVED" | "REJECTED",
  ) => Promise<void>;
}) {
  const isBusy = actingId === requestId;

  return (
    <div className="border-b border-[var(--mnx-border)] px-4 py-4 last:border-b-0 hover:bg-[var(--mnx-bg-subtle)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {renderAvatar(user)}
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <div className="text-sm font-medium text-[var(--mnx-text)]">
                {title}
              </div>
              <div className="mt-1 text-xs text-[var(--mnx-text-muted)]">
                {displayEmployeeNumber(user.employeeNumber)}
              </div>
            </div>
            <div className="text-sm text-[var(--mnx-text-muted)]">{meta}</div>
            {description ? (
              <div className="text-sm leading-normal text-[var(--mnx-text-muted)]">
                {description}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex w-full max-w-md flex-col gap-3 lg:w-[22rem]">
          <MnxInput
            type="text"
            placeholder="Add review comments..."
            value={remarks}
            onChange={(event) =>
              onRemarkChange(requestId, event.target.value)
            }
          />
          <div className="flex flex-wrap justify-end gap-2">
            <MnxAction
              type="button"
              variant="destructive"
              disabled={isBusy}
              onClick={() => void onDecision(requestId, type, "REJECTED")}
            >
              <XCircle className="size-4" />
              Reject
            </MnxAction>
            <MnxAction
              type="button"
              variant="primary"
              disabled={isBusy}
              onClick={() => void onDecision(requestId, type, "APPROVED")}
            >
              <CheckCircle2 className="size-4" />
              {isBusy ? "Saving..." : "Approve"}
            </MnxAction>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ApprovalsView({ isAdmin }: ApprovalsViewProps) {
  const [data, setData] = useState<ApprovalInbox | null>(null);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/approvals");
      const json = await res.json();
      if (json.ok) {
        setData(json.data as ApprovalInbox);
      } else {
        toast.error("Failed to load pending approvals");
      }
    } catch {
      toast.error("Failed to load pending approvals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchApprovals();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchApprovals]);

  const handleDecision = useCallback(
    async (
      requestId: string,
      type: ApprovalType,
      decision: "APPROVED" | "REJECTED",
    ) => {
      setActingId(requestId);
      try {
        const res = await fetch("/api/hrms/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId,
            type,
            decision,
            remarks: remarks[requestId] || "",
          }),
        });
        const json = await res.json();
        if (!json.ok) {
          throw new Error("Approval action failed");
        }

        toast.success(
          decision === "APPROVED"
            ? "Approval recorded."
            : "Request rejected.",
        );
        setRemarks((current) => ({ ...current, [requestId]: "" }));
        await fetchApprovals();
      } catch {
        toast.error("Error submitting approval decision");
      } finally {
        setActingId(null);
      }
    },
    [fetchApprovals, remarks],
  );

  const handleRemarkChange = useCallback((id: string, text: string) => {
    setRemarks((prev) => ({ ...prev, [id]: text }));
  }, []);

  const totals = useMemo(() => {
    return {
      leaves: data?.leaves.length ?? 0,
      regularizations: data?.regularizations.length ?? 0,
      ots: data?.ots.length ?? 0,
      travels: data?.travels.length ?? 0,
      timesheets: data?.timesheets.length ?? 0,
      workreports: data?.workreports.length ?? 0,
    };
  }, [data]);

  const totalPending =
    totals.leaves +
    totals.regularizations +
    totals.ots +
    totals.travels +
    totals.timesheets +
    totals.workreports;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-[var(--mnx-text-muted)]">
        <Loader2 className="size-8 animate-spin text-[var(--mnx-accent)]" />
        <p className="text-xs font-semibold tracking-wider">
          Syncing pending approvals inbox...
        </p>
      </div>
    );
  }

  if (!data || totalPending === 0) {
    return (
      <PeopleNotice
        eyebrow="Approvals inbox"
        title="No pending approvals"
        description={
          isAdmin
            ? "There are no employee, attendance, travel, or work-report requests waiting for approval right now."
            : "Your team approval queue is clear. New requests will appear here when they are routed to you."
        }
        icon={<CheckCircle2 className="size-5" aria-hidden="true" />}
        action={
          <MnxAction type="button" variant="secondary" onClick={() => void fetchApprovals()}>
            <RefreshCw className="size-4" />
            Refresh inbox
          </MnxAction>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--mnx-border)] pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-[var(--frappe-radius-md)] border border-[var(--mnx-border)] bg-[var(--mnx-bg-subtle)] text-[var(--mnx-accent)]">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[var(--mnx-text)]">
                Approvals Central Inbox
              </h1>
              <p className="mt-1 text-sm text-[var(--mnx-text-muted)]">
                {isAdmin
                  ? "Review organisation-wide employee, attendance, travel, and reporting requests."
                  : "Review and action your team’s pending employee, attendance, travel, and reporting requests."}
              </p>
            </div>
          </div>
          <MnxAction
            type="button"
            variant="secondary"
            onClick={() => void fetchApprovals()}
          >
            <RefreshCw className="size-4" />
            Refresh inbox
          </MnxAction>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <SummaryTile label="Total pending" value={totalPending} />
        <SummaryTile label="Leaves" value={totals.leaves} />
        <SummaryTile label="Regularizations" value={totals.regularizations} />
        <SummaryTile label="Overtime" value={totals.ots} />
        <SummaryTile label="Travel" value={totals.travels} />
        <SummaryTile label="Work reports" value={totals.workreports + totals.timesheets} />
      </div>

      <div className="space-y-6">
        {data.leaves.length > 0 ? (
          <ApprovalSection title="Pending Leaves" count={data.leaves.length}>
            {data.leaves.map((request) => (
              <ApprovalRow
                key={request.id}
                user={request.user}
                requestId={request.id}
                type="LEAVE"
                remarks={remarks[request.id] || ""}
                actingId={actingId}
                onRemarkChange={handleRemarkChange}
                onDecision={handleDecision}
                title={
                  <>
                    {request.user.name}
                    <span className="ml-2 text-xs font-medium uppercase text-[var(--mnx-text-soft)]">
                      {request.leaveType.name}
                    </span>
                  </>
                }
                meta={
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5 text-[var(--mnx-text-soft)]" />
                      {formatDateRange(request.fromDate, request.toDate)}
                    </span>
                  </div>
                }
                description={request.notes ? <>Reason: {request.notes}</> : undefined}
              />
            ))}
          </ApprovalSection>
        ) : null}

        {data.regularizations.length > 0 ? (
          <ApprovalSection
            title="Pending Regularizations"
            count={data.regularizations.length}
          >
            {data.regularizations.map((request) => (
              <ApprovalRow
                key={request.id}
                user={request.user}
                requestId={request.id}
                type="REGULARIZATION"
                remarks={remarks[request.id] || ""}
                actingId={actingId}
                onRemarkChange={handleRemarkChange}
                onDecision={handleDecision}
                title={request.user.name}
                meta={
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5 text-[var(--mnx-text-soft)]" />
                      Adjust date: {formatDate(request.date)}
                    </span>
                  </div>
                }
                description={<>Reason: {request.reason}</>}
              />
            ))}
          </ApprovalSection>
        ) : null}

        {data.ots.length > 0 ? (
          <ApprovalSection title="Pending Overtime" count={data.ots.length}>
            {data.ots.map((request) => (
              <ApprovalRow
                key={request.id}
                user={request.user}
                requestId={request.id}
                type="OT"
                remarks={remarks[request.id] || ""}
                actingId={actingId}
                onRemarkChange={handleRemarkChange}
                onDecision={handleDecision}
                title={request.user.name}
                meta={
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Timer className="size-3.5 text-[var(--mnx-text-soft)]" />
                      {request.otHours.toFixed(2)} OT hrs
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="size-3.5 text-[var(--mnx-text-soft)]" />
                      {request.hoursWorked.toFixed(2)} worked hrs
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5 text-[var(--mnx-text-soft)]" />
                      {formatDate(request.date)}
                    </span>
                  </div>
                }
                description={
                  request.calculationRemarks ? (
                    <>Calculation note: {request.calculationRemarks}</>
                  ) : (
                    <>Day type: {request.dayType.replace(/_/g, " ")}</>
                  )
                }
              />
            ))}
          </ApprovalSection>
        ) : null}

        {data.travels.length > 0 ? (
          <ApprovalSection title="Pending Trips" count={data.travels.length}>
            {data.travels.map((request) => (
              <ApprovalRow
                key={request.id}
                user={request.user}
                requestId={request.id}
                type="TRAVEL"
                remarks={remarks[request.id] || ""}
                actingId={actingId}
                onRemarkChange={handleRemarkChange}
                onDecision={handleDecision}
                title={request.user.name}
                meta={
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1">
                      <BriefcaseBusiness className="size-3.5 text-[var(--mnx-text-soft)]" />
                      Destination: {request.destination}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5 text-[var(--mnx-text-soft)]" />
                      {formatDateRange(request.fromDate, request.toDate)}
                    </span>
                  </div>
                }
                description={<>Purpose: {request.purpose}</>}
              />
            ))}
          </ApprovalSection>
        ) : null}

        {data.timesheets.length > 0 ? (
          <ApprovalSection title="Pending Timesheets" count={data.timesheets.length}>
            {data.timesheets.map((request) => (
              <ApprovalRow
                key={request.id}
                user={request.user}
                requestId={request.id}
                type="TIMESHEET"
                remarks={remarks[request.id] || ""}
                actingId={actingId}
                onRemarkChange={handleRemarkChange}
                onDecision={handleDecision}
                title={request.user.name}
                meta={
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5 text-[var(--mnx-text-soft)]" />
                      Week: {formatDateRange(request.startDate, request.endDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <ClipboardList className="size-3.5 text-[var(--mnx-text-soft)]" />
                      Submitted: {formatDate(request.createdAt)}
                    </span>
                  </div>
                }
              />
            ))}
          </ApprovalSection>
        ) : null}

        {data.workreports.length > 0 ? (
          <ApprovalSection
            title="Pending Work Reports"
            count={data.workreports.length}
          >
            {data.workreports.map((approval) => {
              const report = approval.report;
              const itemCount = Array.isArray(report.items)
                ? report.items.length
                : 1;
              const requestId = report.id;

              return (
                <ApprovalRow
                  key={approval.id}
                  user={report.user}
                  requestId={requestId}
                  type="WORKREPORT"
                  remarks={remarks[requestId] || ""}
                  actingId={actingId}
                  onRemarkChange={handleRemarkChange}
                  onDecision={handleDecision}
                  title={
                    <>
                      {report.user.name}
                      <span className="ml-2 text-xs font-medium uppercase text-[var(--mnx-text-soft)]">
                        Level {approval.level}
                      </span>
                    </>
                  }
                  meta={
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5 text-[var(--mnx-text-soft)]" />
                        {formatDate(report.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClipboardList className="size-3.5 text-[var(--mnx-text-soft)]" />
                        {itemCount} work line{itemCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  }
                  description={
                    <>
                      Worked on: {report.workedOn}
                      {report.description ? ` — ${report.description}` : ""}
                    </>
                  }
                />
              );
            })}
          </ApprovalSection>
        ) : null}
      </div>
    </div>
  );
}

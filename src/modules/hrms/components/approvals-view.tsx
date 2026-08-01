"use client";

import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
} from "@/modules/people/components";

import React, { useCallback, useEffect, useState } from "react";
import { Calendar, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

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
  user: ApprovalEmployee;
};

type TravelApproval = {
  id: string;
  destination: string;
  purpose: string;
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
  ots: unknown[];
  travels: TravelApproval[];
  timesheets: unknown[];
  workreports: WorkReportApproval[];
};

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

  const handleDecision = async (
    requestId: string,
    type: string,
    decision: "APPROVED" | "REJECTED",
  ) => {
    setActingId(requestId);
    const comment = remarks[requestId] || "";
    try {
      const res = await fetch("/api/hrms/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          type,
          decision,
          remarks: comment,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Request ${decision.toLowerCase()} successfully!`);
        fetchApprovals();
      } else {
        toast.error("Approval action failed");
      }
    } catch {
      toast.error("Error submitting approval decision");
    } finally {
      setActingId(null);
    }
  };

  const handleRemarkChange = (id: string, text: string) => {
    setRemarks((prev) => ({ ...prev, [id]: text }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--mnx-muted)]">
        <Loader2 className="size-8 animate-spin text-[var(--mnx-accent)]" />
        <p className="text-xs font-semibold tracking-wider">
          Syncing pending approvals inbox...
        </p>
      </div>
    );
  }

  const hasRequests =
    data &&
    (data.leaves.length > 0 ||
      data.regularizations.length > 0 ||
      data.ots.length > 0 ||
      data.travels.length > 0 ||
      data.timesheets.length > 0 ||
      data.workreports.length > 0);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative rounded-3xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)]/85 p-6 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--mnx-accent)]/5 rounded-full blur-3xl" />
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-[var(--mnx-accent)]/10 border border-[var(--mnx-accent)]/35 flex items-center justify-center text-[var(--mnx-accent)] shadow-sm">
            <CheckCircle2 className="size-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black text-[var(--mnx-muted)] uppercase tracking-widest">
              APPROVALS CENTRAL INBOX
            </h1>
            <p className="text-xs text-[var(--mnx-muted)] font-bold mt-0.5 uppercase tracking-wider">
              {isAdmin
                ? "Global Administrator Approvals Control Desk"
                : "Team Manager Review and Approval inbox"}
            </p>
          </div>
        </div>
      </div>

      {!hasRequests ? (
        <div className="text-center py-20 text-xs text-[var(--mnx-text)] font-bold border border-dashed border-[var(--mnx-border)] rounded-3xl">
          Inbox empty. No pending requests requiring approval.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Leaves approvals list */}
          {data.leaves.length > 0 && (
            <div className="space-y-3">
              <div className="text-[10px] font-black text-[var(--mnx-muted)] uppercase tracking-widest px-1">
                Pending Leaves ({data.leaves.length})
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.leaves.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-3xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)]/40 p-5 space-y-4 transition hover:border-[var(--mnx-border)] flex flex-col justify-between backdrop-blur-sm"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-[var(--mnx-accent)]/10 flex items-center justify-center font-bold text-xs text-[var(--mnx-accent)]">
                          {req.user.name[0]}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-[var(--mnx-muted)]">
                            {req.user.name}
                          </h4>
                          <p className="text-[8.5px] font-bold text-[var(--mnx-muted)] uppercase mt-0.5 font-mono">
                            Employee #{req.user.employeeNumber || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-[var(--mnx-muted)]">
                        <p className="font-bold text-[var(--mnx-muted)]">
                          Leave type:{" "}
                          <span className="text-[var(--mnx-muted)] uppercase">
                            {req.leaveType.name}
                          </span>
                        </p>
                        <p className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--mnx-muted)] font-mono mt-1">
                          <Calendar className="size-3.5" />
                          <span>
                            {new Date(req.fromDate).toLocaleDateString()} -{" "}
                            {new Date(req.toDate).toLocaleDateString()}
                          </span>
                        </p>
                      </div>
                      {req.notes && (
                        <p className="text-[10.5px] font-bold text-[var(--mnx-muted)] leading-normal italic">
                          “{req.notes}”
                        </p>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-[var(--mnx-border)] space-y-3">
                      <MnxInput
                        type="text"
                        placeholder="Add review comments..."
                        value={remarks[req.id] || ""}
                        onChange={(e) =>
                          handleRemarkChange(req.id, e.target.value)
                        }
                        className="w-full px-3 py-1.5 text-[10.5px] bg-[var(--mnx-soft)]/60 border border-[var(--mnx-border)] rounded-xl text-[var(--mnx-muted)] outline-none focus:border-[var(--mnx-accent)]"
                      />
                      <div className="flex justify-end gap-2.5">
                        <MnxAction
                          type="button"
                          disabled={actingId === req.id}
                          onClick={() =>
                            handleDecision(req.id, "LEAVE", "REJECTED")
                          }
                          className="inline-flex items-center justify-center gap-1.5 bg-[var(--mnx-danger-bg)]/10 hover:bg-[var(--mnx-danger-bg)]/20 border border-[var(--mnx-danger)]/30 rounded-xl px-3 py-1.5 text-[10px] font-black text-[var(--mnx-danger)] cursor-pointer transition-all"
                        >
                          <XCircle className="size-3.5" /> Reject
                        </MnxAction>
                        <MnxAction
                          type="button"
                          disabled={actingId === req.id}
                          onClick={() =>
                            handleDecision(req.id, "LEAVE", "APPROVED")
                          }
                          className="inline-flex items-center justify-center gap-1.5 bg-[var(--mnx-success-bg)]/10 hover:bg-[var(--mnx-success-bg)]/20 border border-[var(--mnx-success)]/30 rounded-xl px-3 py-1.5 text-[10px] font-black text-[var(--mnx-success)] cursor-pointer transition-all"
                        >
                          <CheckCircle2 className="size-3.5" /> Approve
                        </MnxAction>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regularizations approvals list */}
          {data.regularizations.length > 0 && (
            <div className="space-y-3">
              <div className="text-[10px] font-black text-[var(--mnx-muted)] uppercase tracking-widest px-1">
                Pending Regularizations ({data.regularizations.length})
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.regularizations.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-3xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)]/40 p-5 space-y-4 transition hover:border-[var(--mnx-border)] flex flex-col justify-between backdrop-blur-sm"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-[var(--mnx-accent)]/10 flex items-center justify-center font-bold text-xs text-[var(--mnx-accent)]">
                          {req.user.name[0]}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-[var(--mnx-muted)]">
                            {req.user.name}
                          </h4>
                          <p className="text-[8.5px] font-bold text-[var(--mnx-muted)] uppercase mt-0.5 font-mono">
                            Employee #{req.user.employeeNumber || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-[var(--mnx-muted)]">
                        <p className="font-bold text-[var(--mnx-muted)]">
                          Adjust Date:{" "}
                          <span className="text-[var(--mnx-muted)] font-mono">
                            {new Date(req.date).toLocaleDateString()}
                          </span>
                        </p>
                        <p className="text-[10.5px] font-bold text-[var(--mnx-muted)] mt-1 leading-normal italic">
                          Reason: “{req.reason}”
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[var(--mnx-border)] space-y-3">
                      <MnxInput
                        type="text"
                        placeholder="Add review comments..."
                        value={remarks[req.id] || ""}
                        onChange={(e) =>
                          handleRemarkChange(req.id, e.target.value)
                        }
                        className="w-full px-3 py-1.5 text-[10.5px] bg-[var(--mnx-soft)]/60 border border-[var(--mnx-border)] rounded-xl text-[var(--mnx-muted)] outline-none focus:border-[var(--mnx-accent)]"
                      />
                      <div className="flex justify-end gap-2.5">
                        <MnxAction
                          type="button"
                          disabled={actingId === req.id}
                          onClick={() =>
                            handleDecision(req.id, "REGULARIZATION", "REJECTED")
                          }
                          className="inline-flex items-center justify-center gap-1.5 bg-[var(--mnx-danger-bg)]/10 hover:bg-[var(--mnx-danger-bg)]/20 border border-[var(--mnx-danger)]/30 rounded-xl px-3 py-1.5 text-[10px] font-black text-[var(--mnx-danger)] cursor-pointer transition-all"
                        >
                          <XCircle className="size-3.5" /> Reject
                        </MnxAction>
                        <MnxAction
                          type="button"
                          disabled={actingId === req.id}
                          onClick={() =>
                            handleDecision(req.id, "REGULARIZATION", "APPROVED")
                          }
                          className="inline-flex items-center justify-center gap-1.5 bg-[var(--mnx-success-bg)]/10 hover:bg-[var(--mnx-success-bg)]/20 border border-[var(--mnx-success)]/30 rounded-xl px-3 py-1.5 text-[10px] font-black text-[var(--mnx-success)] cursor-pointer transition-all"
                        >
                          <CheckCircle2 className="size-3.5" /> Approve
                        </MnxAction>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Travel approvals list */}
          {data.travels.length > 0 && (
            <div className="space-y-3">
              <div className="text-[10px] font-black text-[var(--mnx-muted)] uppercase tracking-widest px-1">
                Pending Trips ({data.travels.length})
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.travels.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-3xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)]/40 p-5 space-y-4 transition hover:border-[var(--mnx-border)] flex flex-col justify-between backdrop-blur-sm"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-[var(--mnx-accent)]/10 flex items-center justify-center font-bold text-xs text-[var(--mnx-accent)]">
                          {req.user.name[0]}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-[var(--mnx-muted)]">
                            {req.user.name}
                          </h4>
                          <p className="text-[8.5px] font-bold text-[var(--mnx-muted)] uppercase mt-0.5 font-mono">
                            Employee #{req.user.employeeNumber || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-[var(--mnx-muted)]">
                        <p className="font-bold text-[var(--mnx-muted)]">
                          To Destination:{" "}
                          <span className="text-[var(--mnx-accent)] uppercase font-bold">
                            {req.destination}
                          </span>
                        </p>
                        <p className="text-[10.5px] font-bold text-[var(--mnx-muted)] mt-1 leading-normal italic">
                          Trip details: “{req.purpose}”
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[var(--mnx-border)] flex justify-end gap-2.5">
                      <MnxAction
                        type="button"
                        disabled={actingId === req.id}
                        onClick={() =>
                          handleDecision(req.id, "TRAVEL", "REJECTED")
                        }
                        className="inline-flex items-center justify-center gap-1.5 bg-[var(--mnx-danger-bg)]/10 hover:bg-[var(--mnx-danger-bg)]/20 border border-[var(--mnx-danger)]/30 rounded-xl px-3 py-1.5 text-[10px] font-black text-[var(--mnx-danger)] cursor-pointer transition-all"
                      >
                        <XCircle className="size-3.5" /> Reject
                      </MnxAction>
                      <MnxAction
                        type="button"
                        disabled={actingId === req.id}
                        onClick={() =>
                          handleDecision(req.id, "TRAVEL", "APPROVED")
                        }
                        className="inline-flex items-center justify-center gap-1.5 bg-[var(--mnx-success-bg)]/10 hover:bg-[var(--mnx-success-bg)]/20 border border-[var(--mnx-success)]/30 rounded-xl px-3 py-1.5 text-[10px] font-black text-[var(--mnx-success)] cursor-pointer transition-all"
                      >
                        <CheckCircle2 className="size-3.5" /> Approve
                      </MnxAction>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.workreports.length > 0 && (
            <div className="space-y-3">
              <div className="px-1 text-[10px] font-black uppercase tracking-widest text-[var(--mnx-muted)]">
                Pending work reports ({data.workreports.length})
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.workreports.map((approval) => {
                  const report = approval.report;
                  const itemCount = Array.isArray(report.items)
                    ? report.items.length
                    : 1;
                  return (
                    <div
                      key={approval.id}
                      className="flex flex-col justify-between space-y-4 rounded-3xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)]/40 p-5 backdrop-blur-sm transition hover:border-[var(--mnx-border)]"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-full bg-[var(--mnx-accent)]/10 text-xs font-bold text-[var(--mnx-accent)]">
                            {report.user.name[0]}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-[var(--mnx-muted)]">
                              {report.user.name}
                            </h4>
                            <p className="mt-0.5 font-mono text-[8.5px] font-bold uppercase text-[var(--mnx-muted)]">
                              Employee #{report.user.employeeNumber || "—"} ·
                              Level {approval.level}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs text-[var(--mnx-muted)]">
                          <p className="font-bold">
                            Report date:{" "}
                            <span className="font-mono text-[var(--mnx-text)]">
                              {new Date(report.date).toLocaleDateString(
                                "en-IN",
                              )}
                            </span>
                          </p>
                          <p className="text-[10.5px] font-bold leading-normal">
                            {itemCount} work line
                            {itemCount === 1 ? "" : "s"} · {report.workedOn}
                          </p>
                          <p className="line-clamp-2 text-[10.5px] leading-normal text-[var(--mnx-muted)]">
                            {report.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3 border-t border-[var(--mnx-border)] pt-4">
                        <MnxInput
                          type="text"
                          placeholder="Add review comments..."
                          value={remarks[report.id] || ""}
                          onChange={(event) =>
                            handleRemarkChange(report.id, event.target.value)
                          }
                          className="w-full rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-soft)]/60 px-3 py-1.5 text-[10.5px] text-[var(--mnx-muted)] outline-none focus:border-[var(--mnx-accent)]"
                        />
                        <div className="flex justify-end gap-2.5">
                          <MnxAction
                            type="button"
                            disabled={actingId === report.id}
                            onClick={() =>
                              handleDecision(
                                report.id,
                                "WORKREPORT",
                                "REJECTED",
                              )
                            }
                            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--mnx-danger)]/30 bg-[var(--mnx-danger-bg)]/10 px-3 py-1.5 text-[10px] font-black text-[var(--mnx-danger)] transition-all hover:bg-[var(--mnx-danger-bg)]/20"
                          >
                            <XCircle className="size-3.5" /> Reject
                          </MnxAction>
                          <MnxAction
                            type="button"
                            disabled={actingId === report.id}
                            onClick={() =>
                              handleDecision(
                                report.id,
                                "WORKREPORT",
                                "APPROVED",
                              )
                            }
                            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--mnx-success)]/30 bg-[var(--mnx-success-bg)]/10 px-3 py-1.5 text-[10px] font-black text-[var(--mnx-success)] transition-all hover:bg-[var(--mnx-success-bg)]/20"
                          >
                            <CheckCircle2 className="size-3.5" /> Approve
                          </MnxAction>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

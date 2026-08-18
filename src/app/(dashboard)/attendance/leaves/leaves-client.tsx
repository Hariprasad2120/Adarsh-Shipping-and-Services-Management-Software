"use client";

import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
} from "@/modules/people/components/people-controls";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";
import { DemoFillButton } from "@/components/forms/development/demo-fill-button";
import {
  OperationalDataTable,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalStatus,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import { getLeaveDemoValues } from "@/lib/demo-fill";

type CalculationPreview = {
  requestedUnits: number;
  weekendUnits: number;
  holidayUnits: number;
  sandwichUnits: number;
  paidUnits: number;
  partialPaidUnits: number;
  lopUnits: number;
  balanceBefore: number;
  balanceAfter: number;
  warnings: { code: string; message: string }[];
  violations: { code: string; message: string }[];
  explanation: string[];
};

type LeaveType = { id: string; name: string; paid: boolean; classification?: string | null; unit?: string | null };
type Balance = { leaveType: LeaveType; balance: number };
type LeaveRequest = {
  id: string;
  status: string;
  fromDate: string;
  toDate: string;
  halfDay: boolean;
  notes: string | null;
  leaveType: LeaveType;
  user: { id: string; name: string };
  approver: { name: string } | null;
};

const STATUS_TONE: Record<
  string,
  "success" | "warning" | "danger" | "neutral"
> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
};

export function LeavesClient({
  myRequests,
  leaveTypes,
  balances,
  pendingApprovals,
  canApprove,
}: {
  myRequests: LeaveRequest[];
  leaveTypes: LeaveType[];
  balances: Balance[];
  pendingApprovals: LeaveRequest[];
  canApprove: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dayPart, setDayPart] = useState<"FULL" | "HALF" | "QUARTER">("FULL");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<CalculationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [extendToDate, setExtendToDate] = useState("");
  const [extending, setExtending] = useState(false);
  const [onDutyLocation, setOnDutyLocation] = useState("");
  const [onDutyReference, setOnDutyReference] = useState("");

  const selectedLeaveType = leaveTypes.find((lt) => lt.id === leaveTypeId);
  const isOnDuty = selectedLeaveType?.classification === "ON_DUTY";
  const isHourUnit = selectedLeaveType?.unit === "HOUR";

  // Server-side calculation preview (spec §18) — recomputed whenever the
  // key inputs change. Submission always recalculates again server-side;
  // this is display-only.
  const hasCompleteInputs = isHourUnit
    ? Boolean(leaveTypeId && fromDate && fromTime && toTime)
    : Boolean(leaveTypeId && fromDate && toDate);

  useEffect(() => {
    if (!hasCompleteInputs) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard loading-flag-before-fetch pattern
    setPreviewLoading(true);
    fetch("/api/leave/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isHourUnit
          ? { leaveTypeId, fromDate, toDate: fromDate, fromTime, toTime }
          : { leaveTypeId, fromDate, toDate, dayPart },
      ),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasCompleteInputs, leaveTypeId, fromDate, toDate, dayPart, fromTime, toTime, isHourUnit]);

  // Derived, not stateful: when inputs are incomplete there is nothing to
  // preview, regardless of what the last fetch returned.
  const visiblePreview = hasCompleteInputs ? preview : null;

  async function submitLeave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isOnDuty && !onDutyLocation.trim()) {
      toast.error("On-duty leave requires a location.");
      return;
    }
    if (isHourUnit && (!fromTime || !toTime)) {
      toast.error("This leave type requires a start and end time.");
      return;
    }
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/attendance/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveTypeId: fd.get("leaveTypeId"),
          fromDate: fd.get("fromDate"),
          toDate: isHourUnit ? fd.get("fromDate") : fd.get("toDate"),
          dayPart: isHourUnit ? undefined : dayPart,
          fromTime: isHourUnit ? fromTime : undefined,
          toTime: isHourUnit ? toTime : undefined,
          notes: fd.get("notes") || undefined,
          onDutyLocation: isOnDuty ? onDutyLocation.trim() : undefined,
          onDutyReference: isOnDuty && onDutyReference.trim() ? onDutyReference.trim() : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message ?? body.error ?? "Failed to submit leave request");
      }
      toast.success("Leave request submitted");
      setShowForm(false);
      setLeaveTypeId("");
      setFromDate("");
      setToDate("");
      setDayPart("FULL");
      setFromTime("");
      setToTime("");
      setNotes("");
      setOnDutyLocation("");
      setOnDutyReference("");
      setPreview(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit leave request");
    } finally {
      setLoading(false);
    }
  }

  async function decide(id: string, decision: "approved" | "rejected") {
    try {
      const res = await fetch(`/api/attendance/leaves/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) throw new Error("Failed to record decision");
      toast.success(decision === "approved" ? "Leave approved" : "Leave rejected");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record decision");
    }
  }

  async function cancelRequest(id: string) {
    const reason = window.prompt("Reason for cancellation:");
    if (!reason) return;
    try {
      const res = await fetch(`/api/leave/requests/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to cancel leave request");
      }
      toast.success("Leave request cancelled");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel leave request");
    }
  }

  async function extendRequest(id: string) {
    if (!extendToDate) return;
    setExtending(true);
    try {
      const res = await fetch(`/api/leave/requests/${id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newToDate: extendToDate }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message ?? body.error ?? "Failed to extend leave request");
      }
      toast.success("Leave request extended");
      setExtendingId(null);
      setExtendToDate("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to extend leave request");
    } finally {
      setExtending(false);
    }
  }

  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-IN");

  function fillDemoData() {
    const demo = getLeaveDemoValues(leaveTypes[0]?.id);
    setShowForm(true);
    setLeaveTypeId(demo.leaveTypeId);
    setFromDate(demo.fromDate);
    setToDate(demo.toDate);
    setDayPart(demo.halfDay ? "HALF" : "FULL");
    setNotes(demo.notes);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {balances.map((b) => (
          <div
            key={b.leaveType.id}
            className="rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-card)] p-4 text-center"
          >
            <p className="text-xs text-[var(--mnx-muted)]">
              {b.leaveType.name}
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--mnx-text)]">
              {b.balance}
            </p>
            <p className="text-xs text-[var(--mnx-muted)]">
              {b.leaveType.paid ? "Paid" : "Unpaid"}
            </p>
          </div>
        ))}
      </div>

      <OperationalDataTable>
        <OperationalDataTableHeader
          eyebrow="Leave requests"
          title="My Requests"
          actions={
            <div className="flex gap-2">
              <DemoFillButton
                disabled={loading || leaveTypes.length === 0}
                onClick={fillDemoData}
              />
              <MnxAction
                onClick={() => setShowForm(!showForm)}
                className="rounded-lg bg-[var(--mnx-info-bg)] px-3 py-1.5 text-sm text-[var(--mnx-text)] hover:bg-[var(--mnx-info-bg)]"
              >
                + Request Leave
              </MnxAction>
            </div>
          }
        />

        {showForm && (
          <form
            onSubmit={submitLeave}
            className="space-y-3 border-b border-[var(--mnx-border)] bg-[var(--mnx-card)] px-5 py-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label htmlFor="leave-request-type" className="text-xs font-medium text-[var(--mnx-text)]">
                  Leave Type
                </label>
                <DropdownSelect
                  id="leave-request-type"
                  name="leaveTypeId"
                  onValueChange={setLeaveTypeId}
                  options={leaveTypes.map((leaveType) => ({
                    value: leaveType.id,
                    label: leaveType.name,
                  }))}
                  required
                  value={leaveTypeId}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="leave-request-from" className="text-xs font-medium text-[var(--mnx-text)]">
                  From
                </label>
                <Input
                  id="leave-request-from"
                  type="date"
                  name="fromDate"
                  onChange={(e) => setFromDate(e.target.value)}
                  required
                  value={fromDate}
                  className="w-full"
                />
              </div>
              {!isHourUnit && (
                <div className="space-y-1">
                  <label htmlFor="leave-request-to" className="text-xs font-medium text-[var(--mnx-text)]">
                    To
                  </label>
                  <Input
                    id="leave-request-to"
                    type="date"
                    name="toDate"
                    onChange={(e) => setToDate(e.target.value)}
                    required
                    value={toDate}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {isHourUnit ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="leave-request-from-time" className="text-xs font-medium text-[var(--mnx-text)]">
                    From time
                  </label>
                  <Input
                    id="leave-request-from-time"
                    type="time"
                    value={fromTime}
                    onChange={(e) => setFromTime(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="leave-request-to-time" className="text-xs font-medium text-[var(--mnx-text)]">
                    To time
                  </label>
                  <Input
                    id="leave-request-to-time"
                    type="time"
                    value={toTime}
                    onChange={(e) => setToTime(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1 sm:w-64">
                <label htmlFor="leave-request-daypart" className="text-xs font-medium text-[var(--mnx-text)]">
                  Duration
                </label>
                <DropdownSelect
                  id="leave-request-daypart"
                  value={dayPart}
                  onValueChange={(v) => setDayPart(v as "FULL" | "HALF" | "QUARTER")}
                  options={[
                    { value: "FULL", label: "Full day(s)" },
                    { value: "HALF", label: "Half day" },
                    { value: "QUARTER", label: "Quarter day" },
                  ]}
                />
              </div>
            )}

            <div className="flex items-center gap-4">
              <label htmlFor="leave-request-notes" className="sr-only">
                Notes (optional)
              </label>
              <Input
                id="leave-request-notes"
                type="text"
                name="notes"
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                value={notes}
                className="flex-1"
              />
            </div>

            {isOnDuty && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="leave-request-onduty-location" className="text-xs font-medium text-[var(--mnx-text)]">
                    Location (required for on-duty)
                  </label>
                  <Input
                    id="leave-request-onduty-location"
                    type="text"
                    value={onDutyLocation}
                    onChange={(e) => setOnDutyLocation(e.target.value)}
                    placeholder="Client site, field visit, etc."
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="leave-request-onduty-reference" className="text-xs font-medium text-[var(--mnx-text)]">
                    Reference (optional)
                  </label>
                  <Input
                    id="leave-request-onduty-reference"
                    type="text"
                    value={onDutyReference}
                    onChange={(e) => setOnDutyReference(e.target.value)}
                    placeholder="Client/job/ticket reference"
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {previewLoading && (
              <p className="text-xs text-[var(--mnx-muted)]" role="status">Calculating…</p>
            )}
            {visiblePreview && !previewLoading && (
              <div className="rounded-lg border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-3 text-xs text-[var(--mnx-text)]" aria-live="polite">
                <p className="mb-1 font-medium">Calculation Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
                  <span>Requested: {visiblePreview.requestedUnits}</span>
                  <span>Weekends: {visiblePreview.weekendUnits}</span>
                  <span>Holidays: {visiblePreview.holidayUnits}</span>
                  {visiblePreview.sandwichUnits > 0 && <span>Sandwiched: {visiblePreview.sandwichUnits}</span>}
                  <span>Paid: {visiblePreview.paidUnits}</span>
                  {visiblePreview.partialPaidUnits > 0 && <span>Partial pay: {visiblePreview.partialPaidUnits}</span>}
                  {visiblePreview.lopUnits > 0 && (
                    <span className="text-[var(--mnx-danger-text,inherit))]">LOP: {visiblePreview.lopUnits}</span>
                  )}
                  <span>Balance after: {visiblePreview.balanceAfter}</span>
                </div>
                {visiblePreview.warnings.map((w) => (
                  <p key={w.code} role="alert" className="mt-1 text-[var(--mnx-warning-text,inherit)]">⚠ {w.message}</p>
                ))}
                {visiblePreview.violations.map((v) => (
                  <p key={v.code} role="alert" className="mt-1 text-[var(--mnx-danger-text,inherit)]">✕ {v.message}</p>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <MnxAction
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[var(--mnx-info-bg)] px-4 py-1.5 text-sm text-[var(--mnx-text)] disabled:opacity-50"
              >
                Submit
              </MnxAction>
              <MnxAction
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border px-4 py-1.5 text-sm"
              >
                Cancel
              </MnxAction>
            </div>
          </form>
        )}

        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                {["Type", "From", "To", "Half Day", "Status", "Note", ""].map((h) => (
                  <OperationalTableHead key={h}>{h}</OperationalTableHead>
                ))}
              </tr>
            </thead>
            <tbody>
              {myRequests.length === 0 ? (
                <OperationalTableEmpty colSpan={7}>
                  No requests.
                </OperationalTableEmpty>
              ) : (
                myRequests.map((r) => {
                  const normalizedStatus = r.status.toLowerCase();
                  const cancellable =
                    normalizedStatus === "pending" || normalizedStatus === "approved";
                  const extendable = normalizedStatus === "approved";
                  const isExtending = extendingId === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr>
                        <OperationalTableCell>{r.leaveType.name}</OperationalTableCell>
                        <OperationalTableCell>{fmtDate(r.fromDate)}</OperationalTableCell>
                        <OperationalTableCell>{fmtDate(r.toDate)}</OperationalTableCell>
                        <OperationalTableCell>{r.halfDay ? "Yes" : "No"}</OperationalTableCell>
                        <OperationalTableCell>
                          <OperationalStatus tone={STATUS_TONE[normalizedStatus] ?? "neutral"}>
                            {r.status}
                          </OperationalStatus>
                        </OperationalTableCell>
                        <OperationalTableCell className="text-[var(--mnx-muted)]">
                          {r.notes ?? "-"}
                        </OperationalTableCell>
                        <OperationalTableCell>
                          <div className="flex gap-2">
                            {extendable && (
                              <MnxAction
                                onClick={() => {
                                  setExtendingId(isExtending ? null : r.id);
                                  setExtendToDate("");
                                }}
                                className="rounded border px-2 py-1 text-xs text-[var(--mnx-text)]"
                              >
                                {isExtending ? "Close" : "Extend"}
                              </MnxAction>
                            )}
                            {cancellable && (
                              <MnxAction
                                onClick={() => cancelRequest(r.id)}
                                className="rounded border px-2 py-1 text-xs text-[var(--mnx-text)]"
                              >
                                Cancel
                              </MnxAction>
                            )}
                          </div>
                        </OperationalTableCell>
                      </tr>
                      {isExtending && (
                        <tr>
                          <OperationalTableCell colSpan={7}>
                            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-3">
                              <div className="space-y-1">
                                <label htmlFor={`extend-to-${r.id}`} className="text-xs font-medium text-[var(--mnx-text)]">
                                  New end date (current: {fmtDate(r.toDate)})
                                </label>
                                <Input
                                  id={`extend-to-${r.id}`}
                                  type="date"
                                  min={new Date(new Date(r.toDate).getTime() + 86400000).toISOString().slice(0, 10)}
                                  value={extendToDate}
                                  onChange={(e) => setExtendToDate(e.target.value)}
                                  className="w-full"
                                />
                              </div>
                              <MnxAction
                                onClick={() => extendRequest(r.id)}
                                disabled={extending || !extendToDate}
                                className="rounded-lg bg-[var(--mnx-info-bg)] px-4 py-1.5 text-sm text-[var(--mnx-text)] disabled:opacity-50"
                              >
                                Confirm extension
                              </MnxAction>
                            </div>
                          </OperationalTableCell>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      </OperationalDataTable>

      {canApprove && pendingApprovals.length > 0 && (
        <OperationalDataTable>
          <OperationalDataTableHeader
            eyebrow="Manager review"
            title="Pending Approvals"
          />
          <OperationalDataTableWrap>
            <OperationalTable>
              <thead>
                <tr>
                  {["Employee", "Type", "From", "To", "Days", ""].map((h) => (
                    <OperationalTableHead key={h}>{h}</OperationalTableHead>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.map((r) => {
                  const days =
                    Math.ceil(
                      (new Date(r.toDate).getTime() -
                        new Date(r.fromDate).getTime()) /
                        86400000,
                    ) + 1;

                  return (
                    <tr key={r.id}>
                      <OperationalTableCell className="font-medium text-[var(--mnx-text)]">
                        {r.user.name}
                      </OperationalTableCell>
                      <OperationalTableCell>{r.leaveType.name}</OperationalTableCell>
                      <OperationalTableCell>{fmtDate(r.fromDate)}</OperationalTableCell>
                      <OperationalTableCell>{fmtDate(r.toDate)}</OperationalTableCell>
                      <OperationalTableCell>{r.halfDay ? "0.5" : days}</OperationalTableCell>
                      <OperationalTableCell>
                        <div className="flex gap-2">
                          <MnxAction
                            onClick={() => decide(r.id, "approved")}
                            className="rounded bg-[var(--mnx-success-bg)] px-2 py-1 text-xs text-[var(--mnx-text)] hover:bg-[var(--mnx-success-bg)]"
                          >
                            Approve
                          </MnxAction>
                          <MnxAction
                            onClick={() => decide(r.id, "rejected")}
                            className="rounded bg-[var(--mnx-danger-bg)] px-2 py-1 text-xs text-[var(--mnx-text)] hover:bg-[var(--mnx-danger-bg)]"
                          >
                            Reject
                          </MnxAction>
                        </div>
                      </OperationalTableCell>
                    </tr>
                  );
                })}
              </tbody>
            </OperationalTable>
          </OperationalDataTableWrap>
        </OperationalDataTable>
      )}
    </div>
  );
}

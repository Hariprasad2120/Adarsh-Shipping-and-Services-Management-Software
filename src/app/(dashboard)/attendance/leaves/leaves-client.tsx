"use client";

import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
} from "@/modules/people/components/people-controls";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

type LeaveType = { id: string; name: string; paid: boolean };
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
  const [halfDay, setHalfDay] = useState(false);
  const [notes, setNotes] = useState("");

  async function submitLeave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await fetch("/api/attendance/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leaveTypeId: fd.get("leaveTypeId"),
        fromDate: fd.get("fromDate"),
        toDate: fd.get("toDate"),
        halfDay: fd.get("halfDay") === "on",
        notes: fd.get("notes") || undefined,
      }),
    });
    setLoading(false);
    setShowForm(false);
    setLeaveTypeId("");
    setFromDate("");
    setToDate("");
    setHalfDay(false);
    setNotes("");
    router.refresh();
  }

  async function decide(id: string, decision: "approved" | "rejected") {
    await fetch(`/api/attendance/leaves/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    router.refresh();
  }

  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-IN");

  function fillDemoData() {
    const demo = getLeaveDemoValues(leaveTypes[0]?.id);
    setShowForm(true);
    setLeaveTypeId(demo.leaveTypeId);
    setFromDate(demo.fromDate);
    setToDate(demo.toDate);
    setHalfDay(demo.halfDay);
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
                <label className="text-xs font-medium text-[var(--mnx-text)]">
                  Leave Type
                </label>
                <DropdownSelect
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
                <label className="text-xs font-medium text-[var(--mnx-text)]">
                  From
                </label>
                <Input
                  type="date"
                  name="fromDate"
                  onChange={(e) => setFromDate(e.target.value)}
                  required
                  value={fromDate}
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--mnx-text)]">
                  To
                </label>
                <Input
                  type="date"
                  name="toDate"
                  onChange={(e) => setToDate(e.target.value)}
                  required
                  value={toDate}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-[var(--mnx-text)]">
                <MnxInput
                  checked={halfDay}
                  name="halfDay"
                  onChange={(e) => setHalfDay(e.target.checked)}
                  type="checkbox"
                  className="rounded"
                />{" "}
                Half day
              </label>
              <Input
                type="text"
                name="notes"
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                value={notes}
                className="flex-1"
              />
            </div>
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
                {["Type", "From", "To", "Half Day", "Status", "Note"].map((h) => (
                  <OperationalTableHead key={h}>{h}</OperationalTableHead>
                ))}
              </tr>
            </thead>
            <tbody>
              {myRequests.length === 0 ? (
                <OperationalTableEmpty colSpan={6}>
                  No requests.
                </OperationalTableEmpty>
              ) : (
                myRequests.map((r) => (
                  <tr key={r.id}>
                    <OperationalTableCell>{r.leaveType.name}</OperationalTableCell>
                    <OperationalTableCell>{fmtDate(r.fromDate)}</OperationalTableCell>
                    <OperationalTableCell>{fmtDate(r.toDate)}</OperationalTableCell>
                    <OperationalTableCell>{r.halfDay ? "Yes" : "No"}</OperationalTableCell>
                    <OperationalTableCell>
                      <OperationalStatus tone={STATUS_TONE[r.status] ?? "neutral"}>
                        {r.status}
                      </OperationalStatus>
                    </OperationalTableCell>
                    <OperationalTableCell className="text-[var(--mnx-muted)]">
                      {r.notes ?? "-"}
                    </OperationalTableCell>
                  </tr>
                ))
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

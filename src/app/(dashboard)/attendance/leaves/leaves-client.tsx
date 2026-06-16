"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DemoFillButton } from "@/components/demo-fill-button";
import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  DataTableToolbar,
} from "@/components/data-table";
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

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
  cancelled: "bg-surface-container-high text-on-surface-variant",
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
          <div key={b.leaveType.id} className="rounded-2xl border border-outline-variant/40 bg-surface p-4 text-center shadow-sm">
            <p className="text-xs text-on-surface-variant">{b.leaveType.name}</p>
            <p className="mt-1 text-2xl font-semibold text-on-surface">{b.balance}</p>
            <p className="text-xs text-on-surface-variant">{b.leaveType.paid ? "Paid" : "Unpaid"}</p>
          </div>
        ))}
      </div>

      <div className="space-y-0 rounded-2xl border border-outline-variant/40 bg-surface shadow-sm">
        <DataTableToolbar>
          <h2 className="ds-h2 text-on-surface">My Requests</h2>
          <div className="flex gap-2">
            <DemoFillButton disabled={loading || leaveTypes.length === 0} onClick={fillDemoData} />
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
            >
              + Request Leave
            </button>
          </div>
        </DataTableToolbar>

        {showForm && (
          <form onSubmit={submitLeave} className="space-y-3 border-b border-outline-variant/30 bg-surface-container-low px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-on-surface-variant">Leave Type</label>
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
                <label className="text-xs font-medium text-on-surface-variant">From</label>
                <Input type="date" name="fromDate" onChange={(e) => setFromDate(e.target.value)} required value={fromDate} className="w-full" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-on-surface-variant">To</label>
                <Input type="date" name="toDate" onChange={(e) => setToDate(e.target.value)} required value={toDate} className="w-full" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-on-surface">
                <input checked={halfDay} name="halfDay" onChange={(e) => setHalfDay(e.target.checked)} type="checkbox" className="rounded" /> Half day
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
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm text-white disabled:opacity-50"
              >
                Submit
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-outline-variant/50 px-4 py-1.5 text-sm text-on-surface">
                Cancel
              </button>
            </div>
          </form>
        )}

        <DataTable className="rounded-none border-0">
          <DataTableHeader>
            <tr>
              {["Type", "From", "To", "Half Day", "Status", "Note"].map((h) => (
                <DataTableHead key={h}>{h}</DataTableHead>
              ))}
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {myRequests.length === 0 ? (
              <DataTableEmpty colSpan={6} message="No requests." className="py-6" />
            ) : (
              myRequests.map((r) => (
                <DataTableRow key={r.id}>
                  <DataTableCell>{r.leaveType.name}</DataTableCell>
                  <DataTableCell>{fmtDate(r.fromDate)}</DataTableCell>
                  <DataTableCell>{fmtDate(r.toDate)}</DataTableCell>
                  <DataTableCell>{r.halfDay ? "Yes" : "No"}</DataTableCell>
                  <DataTableCell>
                    <Badge className={STATUS_COLOR[r.status]}>{r.status}</Badge>
                  </DataTableCell>
                  <DataTableCell className="text-on-surface-variant">{r.notes ?? "-"}</DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </div>

      {canApprove && pendingApprovals.length > 0 && (
        <div className="space-y-0 rounded-2xl border border-outline-variant/40 bg-surface shadow-sm">
          <DataTableToolbar className="justify-start">
            <h2 className="ds-h2 text-on-surface">Pending Approvals</h2>
          </DataTableToolbar>
          <DataTable className="rounded-none border-0">
            <DataTableHeader>
              <tr>
                {["Employee", "Type", "From", "To", "Days", ""].map((h) => (
                  <DataTableHead key={h}>{h}</DataTableHead>
                ))}
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {pendingApprovals.map((r) => {
                const days =
                  Math.ceil((new Date(r.toDate).getTime() - new Date(r.fromDate).getTime()) / 86400000) + 1;

                return (
                  <DataTableRow key={r.id}>
                    <DataTableCell className="font-medium text-on-surface">{r.user.name}</DataTableCell>
                    <DataTableCell>{r.leaveType.name}</DataTableCell>
                    <DataTableCell>{fmtDate(r.fromDate)}</DataTableCell>
                    <DataTableCell>{fmtDate(r.toDate)}</DataTableCell>
                    <DataTableCell>{r.halfDay ? "0.5" : days}</DataTableCell>
                    <DataTableCell>
                      <div className="flex gap-2">
                        <button
                          onClick={() => decide(r.id, "approved")}
                          className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => decide(r.id, "rejected")}
                          className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  OperationalDataTable,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
import { PeopleControlButton as MnxAction } from "@/modules/people/components/people-controls";
import { Input } from "@/components/ui/input";
import { DropdownSelect } from "@/components/ui/dropdown-select";

type Employee = { id: string; name: string; employeeNumber: number | null };
type LeaveTypeOption = { id: string; name: string };
type PendingCompOff = { id: string; userName: string; earnedDate: string; sourceType: string; units: number };
type PendingGrant = { id: string; userName: string; leaveTypeName: string; amount: number; reason: string };

const TABS = ["Balance Adjustment", "Grants", "Comp-Off Approvals"] as const;
type Tab = (typeof TABS)[number];

export function HrConsoleClient({
  employees,
  leaveTypes,
  pendingCompOff,
  pendingGrants,
}: {
  employees: Employee[];
  leaveTypes: LeaveTypeOption[];
  pendingCompOff: PendingCompOff[];
  pendingGrants: PendingGrant[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Balance Adjustment");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-[var(--mnx-border)]">
        {TABS.map((t) => (
          // eslint-disable-next-line no-restricted-syntax -- intentional custom tab-strip widget, not a form action button
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium ${
              tab === t
                ? "border-b-2 border-[var(--mnx-info-bg)] text-[var(--mnx-text)]"
                : "text-[var(--mnx-muted)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Balance Adjustment" && (
        <BalanceAdjustmentPanel employees={employees} leaveTypes={leaveTypes} onDone={() => router.refresh()} />
      )}
      {tab === "Grants" && (
        <GrantsPanel
          employees={employees}
          leaveTypes={leaveTypes}
          pendingGrants={pendingGrants}
          onDone={() => router.refresh()}
        />
      )}
      {tab === "Comp-Off Approvals" && (
        <CompOffPanel pendingCompOff={pendingCompOff} onDone={() => router.refresh()} />
      )}
    </div>
  );
}

function BalanceAdjustmentPanel({
  employees,
  leaveTypes,
  onDone,
}: {
  employees: Employee[];
  leaveTypes: LeaveTypeOption[];
  onDone: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/leave/ledger/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          leaveTypeId,
          quantity: Number(quantity),
          year: new Date().getFullYear(),
          reason,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to adjust balance");
      }
      toast.success("Balance adjusted");
      setQuantity("");
      setReason("");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to adjust balance");
    } finally {
      setLoading(false);
    }
  }

  return (
    <OperationalDataTable>
      <OperationalDataTableHeader
        eyebrow="Manual adjustment"
        title="Adjust Employee Balance"
        actions={undefined}
      />
      <form onSubmit={submit} className="space-y-3 px-5 py-4">
        <p className="text-xs text-[var(--mnx-muted)]">
          Every adjustment requires a reason and creates a MANUAL_CREDIT/MANUAL_DEBIT ledger entry — the balance
          is never mutated directly.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--mnx-text)]">Employee</label>
            <DropdownSelect
              value={userId}
              onValueChange={setUserId}
              options={employees.map((e) => ({
                value: e.id,
                label: e.employeeNumber ? `${e.name} (#${e.employeeNumber})` : e.name,
              }))}
              searchable
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--mnx-text)]">Leave Type</label>
            <DropdownSelect
              value={leaveTypeId}
              onValueChange={setLeaveTypeId}
              options={leaveTypes.map((lt) => ({ value: lt.id, label: lt.name }))}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--mnx-text)]">
              Quantity (+credit / -debit)
            </label>
            <Input type="number" step="0.5" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--mnx-text)]">Reason</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} required />
          </div>
        </div>
        <MnxAction
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--mnx-info-bg)] px-4 py-1.5 text-sm text-[var(--mnx-text)] disabled:opacity-50"
        >
          Post Adjustment
        </MnxAction>
      </form>
    </OperationalDataTable>
  );
}

function GrantsPanel({
  employees,
  leaveTypes,
  pendingGrants,
  onDone,
}: {
  employees: Employee[];
  leaveTypes: LeaveTypeOption[];
  pendingGrants: PendingGrant[];
  onDone: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/leave/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          leaveTypeId,
          amount: Number(amount),
          effectiveDate: new Date().toISOString(),
          reason,
          requiresApproval: false,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create grant");
      }
      toast.success("Leave granted");
      setAmount("");
      setReason("");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create grant");
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: string) {
    try {
      const res = await fetch(`/api/leave/grants/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to approve grant");
      toast.success("Grant approved");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve grant");
    }
  }

  return (
    <div className="space-y-4">
      <OperationalDataTable>
        <OperationalDataTableHeader eyebrow="Special leave" title="Grant Leave" />
        <form onSubmit={submit} className="space-y-3 px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--mnx-text)]">Employee</label>
              <DropdownSelect
                value={userId}
                onValueChange={setUserId}
                options={employees.map((e) => ({ value: e.id, label: e.name }))}
                searchable
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--mnx-text)]">Leave Type</label>
              <DropdownSelect
                value={leaveTypeId}
                onValueChange={setLeaveTypeId}
                options={leaveTypes.map((lt) => ({ value: lt.id, label: lt.name }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--mnx-text)]">Amount</label>
              <Input type="number" step="0.5" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--mnx-text)]">Reason</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Maternity, bereavement..." required />
            </div>
          </div>
          <MnxAction
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--mnx-info-bg)] px-4 py-1.5 text-sm text-[var(--mnx-text)] disabled:opacity-50"
          >
            Grant Leave
          </MnxAction>
        </form>
      </OperationalDataTable>

      <OperationalDataTable>
        <OperationalDataTableHeader eyebrow="Awaiting approval" title="Pending Grants" />
        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                {["Employee", "Type", "Amount", "Reason", ""].map((h) => (
                  <OperationalTableHead key={h}>{h}</OperationalTableHead>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingGrants.length === 0 ? (
                <OperationalTableEmpty colSpan={5}>No pending grants.</OperationalTableEmpty>
              ) : (
                pendingGrants.map((g) => (
                  <tr key={g.id}>
                    <OperationalTableCell>{g.userName}</OperationalTableCell>
                    <OperationalTableCell>{g.leaveTypeName}</OperationalTableCell>
                    <OperationalTableCell>{g.amount}</OperationalTableCell>
                    <OperationalTableCell className="text-[var(--mnx-muted)]">{g.reason}</OperationalTableCell>
                    <OperationalTableCell>
                      <MnxAction
                        onClick={() => approve(g.id)}
                        className="rounded bg-[var(--mnx-success-bg)] px-2 py-1 text-xs text-[var(--mnx-text)]"
                      >
                        Approve
                      </MnxAction>
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

function CompOffPanel({
  pendingCompOff,
  onDone,
}: {
  pendingCompOff: PendingCompOff[];
  onDone: () => void;
}) {
  async function decide(id: string, action: "approve" | "reject") {
    try {
      const res = await fetch(`/api/leave/compoff/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "reject" ? JSON.stringify({}) : undefined,
      });
      if (!res.ok) throw new Error(`Failed to ${action} comp-off credit`);
      toast.success(action === "approve" ? "Comp-off approved" : "Comp-off rejected");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action} comp-off credit`);
    }
  }

  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-IN");

  return (
    <OperationalDataTable>
      <OperationalDataTableHeader eyebrow="Compensatory off" title="Pending Comp-Off Credits" />
      <OperationalDataTableWrap>
        <OperationalTable>
          <thead>
            <tr>
              {["Employee", "Earned Date", "Source", "Units", ""].map((h) => (
                <OperationalTableHead key={h}>{h}</OperationalTableHead>
              ))}
            </tr>
          </thead>
          <tbody>
            {pendingCompOff.length === 0 ? (
              <OperationalTableEmpty colSpan={5}>No pending comp-off credits.</OperationalTableEmpty>
            ) : (
              pendingCompOff.map((c) => (
                <tr key={c.id}>
                  <OperationalTableCell>{c.userName}</OperationalTableCell>
                  <OperationalTableCell>{fmtDate(c.earnedDate)}</OperationalTableCell>
                  <OperationalTableCell>{c.sourceType}</OperationalTableCell>
                  <OperationalTableCell>{c.units}</OperationalTableCell>
                  <OperationalTableCell>
                    <div className="flex gap-2">
                      <MnxAction
                        onClick={() => decide(c.id, "approve")}
                        className="rounded bg-[var(--mnx-success-bg)] px-2 py-1 text-xs text-[var(--mnx-text)]"
                      >
                        Approve
                      </MnxAction>
                      <MnxAction
                        onClick={() => decide(c.id, "reject")}
                        className="rounded bg-[var(--mnx-danger-bg)] px-2 py-1 text-xs text-[var(--mnx-text)]"
                      >
                        Reject
                      </MnxAction>
                    </div>
                  </OperationalTableCell>
                </tr>
              ))
            )}
          </tbody>
        </OperationalTable>
      </OperationalDataTableWrap>
    </OperationalDataTable>
  );
}

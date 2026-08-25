"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Modal } from "@/components/ui/modal";
import { PeopleControlInput } from "@/modules/people/components";
import { createOffCyclePayrollRunAction } from "@/modules/hrms/off-cycle-actions";

type EmployeeOption = { id: string; name: string; employeeNumber: string };

function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const COMPONENT_LABELS = ["Bonus", "Arrear", "Salary Correction", "Special Payment", "Reimbursement"];

// Phase 20 UI cleanup: this used to render its own always-visible panel with
// a batch list stacked on the Pay Runs page — the source of the reported
// clutter. Now a create-only modal, triggered from the "+New" dropdown on
// the unified pay-runs card list; the batch list itself is now one of those
// cards, sourced from the same listOffCyclePayrollBatches query.
export function OffCycleCreateModal({
  open,
  onClose,
  employees,
}: {
  open: boolean;
  onClose: () => void;
  employees: EmployeeOption[];
}) {
  const router = useRouter();
  const [payDate, setPayDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = React.useState("Bonus");
  const [rows, setRows] = React.useState<{ employeeId: string; componentLabel: string; amount: string }[]>([
    { employeeId: employees[0]?.id ?? "", componentLabel: "Bonus", amount: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const total = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const response = await createOffCyclePayrollRunAction({
        payDate,
        reason,
        entries: rows
          .filter((r) => r.employeeId && Number(r.amount) > 0)
          .map((r) => ({ employeeId: r.employeeId, componentLabel: r.componentLabel, amount: Number(r.amount) })),
      });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Off-cycle payroll run created and posted");
      onClose();
      setRows([{ employeeId: employees[0]?.id ?? "", componentLabel: "Bonus", amount: "" }]);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} title="New Off-Cycle Payment" onClose={onClose}>
      <div className="space-y-4">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">Pay date</span>
          <PeopleControlInput type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">Reason</span>
          <NativeSelect value={reason} onChange={(e) => setReason(e.target.value)}>
            {COMPONENT_LABELS.map((label) => (
              <option key={label} value={label}>{label}</option>
            ))}
          </NativeSelect>
        </label>
        <div className="space-y-2">
          <span className="text-sm font-medium text-[var(--mnx-text)]">Employees</span>
          {rows.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <NativeSelect
                value={row.employeeId}
                onChange={(e) => {
                  const next = [...rows];
                  next[index]!.employeeId = e.target.value;
                  setRows(next);
                }}
                className="flex-1"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name} · #{emp.employeeNumber}</option>
                ))}
              </NativeSelect>
              <PeopleControlInput
                type="number"
                value={row.amount}
                onChange={(e) => {
                  const next = [...rows];
                  next[index]!.amount = e.target.value;
                  setRows(next);
                }}
                placeholder="Amount"
                className="w-32"
              />
              <Button
                type="button"
                variant="inverse"
                size="sm"
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
                disabled={rows.length === 1}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="inverse"
            size="sm"
            onClick={() => setRows([...rows, { employeeId: employees[0]?.id ?? "", componentLabel: reason, amount: "" }])}
          >
            Add employee
          </Button>
        </div>
        <div className="flex justify-between border-t border-[var(--mnx-border)] pt-3 text-sm font-semibold text-[var(--mnx-text)]">
          <span>Total</span>
          <span>{formatMoney(total)}</span>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="inverse" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleCreate()} disabled={isSubmitting || total <= 0}>
            {isSubmitting ? "Processing…" : "Process & Post"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

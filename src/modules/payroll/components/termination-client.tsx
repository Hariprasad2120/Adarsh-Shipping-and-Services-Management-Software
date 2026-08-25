"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PeopleControlInput } from "@/modules/people/components";
import { createTerminationPayrollRunAction } from "@/modules/hrms/termination-actions";

type ExitingEmployee = { id: string; name: string; employeeNumber: string; lastWorkingDay: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

// v1 simplification: additional earnings/deductions/notice-pay inputs apply
// uniformly to every selected employee (bulk termination = same settlement
// terms applied to several exiting employees at once). Per-employee
// distinct terms would need a much larger form — flagged as a known gap.
//
// Phase 21 UI cleanup: create-only modal now (was a permanently-visible
// panel + batch list, the source of the reported Pay Runs clutter) —
// triggered from the "+New" dropdown on the unified card list.
export function TerminationCreateModal({
  open,
  onClose,
  exitingEmployees,
}: {
  open: boolean;
  onClose: () => void;
  exitingEmployees: ExitingEmployee[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [earnings, setEarnings] = React.useState({ bonus: "", stipend: "", overtime: "", leaveEncashment: "", incentives: "", gratuity: "" });
  const [deductionLabel, setDeductionLabel] = React.useState("");
  const [deductionAmount, setDeductionAmount] = React.useState("");
  const [noticePayMode, setNoticePayMode] = React.useState<"NONE" | "PAY" | "RECOVER">("NONE");
  const [noticePayAmount, setNoticePayAmount] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one exiting employee");
      return;
    }
    setIsSubmitting(true);
    try {
      const deductions = deductionAmount && Number(deductionAmount) > 0
        ? [{ label: deductionLabel || "Deduction", amount: Number(deductionAmount) }]
        : [];
      const noticePay =
        noticePayMode !== "NONE" && Number(noticePayAmount) > 0
          ? { mode: noticePayMode, amount: Number(noticePayAmount) }
          : undefined;

      const response = await createTerminationPayrollRunAction(
        selectedIds.map((employeeId) => ({
          employeeId,
          bonus: Number(earnings.bonus) || 0,
          stipend: Number(earnings.stipend) || 0,
          overtime: Number(earnings.overtime) || 0,
          leaveEncashment: Number(earnings.leaveEncashment) || 0,
          incentives: Number(earnings.incentives) || 0,
          gratuity: Number(earnings.gratuity) || 0,
          deductions,
          noticePay,
        })),
      );
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success(`Settlement processed for ${selectedIds.length} employee(s)`);
      onClose();
      setSelectedIds([]);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} title="New Final Settlement" onClose={onClose} size="wide">
      <div className="space-y-4">
        {exitingEmployees.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">
            No employees have an exit date set in HRMS. Set a last working day on the employee&apos;s HRMS record to process a settlement.
          </p>
        ) : (
          <div className="space-y-2">
            <span className="text-sm font-medium text-[var(--mnx-text)]">Exiting employees</span>
            <div className="max-h-40 space-y-1 overflow-auto rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] p-2">
              {exitingEmployees.map((emp) => (
                <label key={emp.id} className="flex items-center gap-2 text-sm">
                  {/* eslint-disable-next-line no-restricted-syntax -- multi-select checkbox list, not a text field */}
                  <input type="checkbox" checked={selectedIds.includes(emp.id)} onChange={() => toggleEmployee(emp.id)} />
                  {emp.name} · #{emp.employeeNumber} · LWD {formatDate(emp.lastWorkingDay)}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {(["bonus", "stipend", "overtime", "leaveEncashment", "incentives", "gratuity"] as const).map((field) => (
            <label key={field} className="block space-y-1 text-sm">
              <span className="font-medium capitalize text-[var(--mnx-text)]">{field.replace(/([A-Z])/g, " $1")}</span>
              <PeopleControlInput
                type="number"
                value={earnings[field]}
                onChange={(e) => setEarnings((prev) => ({ ...prev, [field]: e.target.value }))}
              />
            </label>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Deduction label</span>
            <PeopleControlInput value={deductionLabel} onChange={(e) => setDeductionLabel(e.target.value)} placeholder="e.g. Advance recovery" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Deduction amount</span>
            <PeopleControlInput type="number" value={deductionAmount} onChange={(e) => setDeductionAmount(e.target.value)} />
          </label>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-[var(--mnx-text)]">Notice Pay</legend>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {(["NONE", "PAY", "RECOVER"] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-2">
                {/* eslint-disable-next-line no-restricted-syntax -- native radio group, not a text field */}
                <input type="radio" checked={noticePayMode === mode} onChange={() => setNoticePayMode(mode)} />
                {mode === "NONE" ? "None" : mode === "PAY" ? "Pay in lieu" : "Recover from employee"}
              </label>
            ))}
            {noticePayMode !== "NONE" ? (
              <PeopleControlInput
                type="number"
                value={noticePayAmount}
                onChange={(e) => setNoticePayAmount(e.target.value)}
                placeholder="Amount"
                className="w-32"
              />
            ) : null}
          </div>
        </fieldset>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="inverse" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting || selectedIds.length === 0}>
            {isSubmitting ? "Processing…" : `Process settlement (${selectedIds.length})`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

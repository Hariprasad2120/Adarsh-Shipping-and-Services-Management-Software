"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { createTerminationDraftAction } from "@/modules/hrms/termination-actions";

type ExitingEmployee = { id: string; name: string; employeeNumber: string; lastWorkingDay: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

// Phase 34 (Zoho pay-run parity, page 00068): this modal now only selects
// the exiting employee(s) — "Continue" opens a TerminationPayrollDraft and
// routes to the full pre-finalize Edit screen
// (src/app/(dashboard)/payroll/pay-runs/[batchId]/edit/page.tsx) for Pay
// Date/Base Days/Payable Days/LOP/Additional Earnings/Deductions/Notice
// Pay/Notes, instead of submitting everything in one shot from a modal.
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
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleContinue = async () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one exiting employee");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await createTerminationDraftAction(selectedIds);
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      onClose();
      setSelectedIds([]);
      router.push(`/payroll/pay-runs/${response.data.draftId}/edit`);
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
            <div className="max-h-64 space-y-1 overflow-auto rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] p-2">
              {exitingEmployees.map((emp) => (
                <label key={emp.id} className="flex items-center gap-2 text-sm">
                  {/* eslint-disable-next-line no-restricted-syntax -- multi-select checkbox list, not a text field */}
                  <input type="checkbox" checked={selectedIds.includes(emp.id)} onChange={() => toggleEmployee(emp.id)} />
                  {emp.name} · #{emp.employeeNumber} · LWD {formatDate(emp.lastWorkingDay)}
                </label>
              ))}
            </div>
            <p className="text-xs text-[var(--mnx-muted)]">
              Selecting more than one employee processes them together as a bulk termination run
              (schema type BULK_TERMINATION), same as a single-employee final settlement otherwise.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="inverse" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleContinue()} disabled={isSubmitting || selectedIds.length === 0}>
            {isSubmitting ? "Preparing…" : `Continue (${selectedIds.length})`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

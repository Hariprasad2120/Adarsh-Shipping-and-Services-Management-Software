"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PeopleControlInput } from "@/modules/people/components";
import { createSalaryRevisionAction } from "@/modules/hrms/salary-revision-actions";

export function ProposeRevisionControl({ employeeId, currentCtc }: { employeeId: string; currentCtc: number }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [proposedCtc, setProposedCtc] = React.useState(String(currentCtc || ""));
  const [effectiveFrom, setEffectiveFrom] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await createSalaryRevisionAction({
        employeeId,
        proposedCtcAnnual: Number(proposedCtc),
        effectiveFrom,
        reason,
      });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Salary revision submitted for approval");
      setOpen(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button type="button" variant="inverse" onClick={() => setOpen(true)}>
        Revise
      </Button>
      <Modal open={open} title="Propose Salary Revision" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Current CTC (annual)</span>
            <PeopleControlInput value={currentCtc.toString()} disabled />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Proposed CTC (annual)</span>
            <PeopleControlInput type="number" value={proposedCtc} onChange={(e) => setProposedCtc(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Effective from</span>
            <PeopleControlInput type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Reason</span>
            <PeopleControlInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Annual increment" />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="inverse" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting || !(Number(proposedCtc) > 0)}>
              {isSubmitting ? "Submitting…" : "Submit for approval"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

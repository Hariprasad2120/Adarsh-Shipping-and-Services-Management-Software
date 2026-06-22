"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { submitJobDeletionAction } from "@/modules/cha/actions";

type JobDeleteInlineButtonProps = {
  jobId: string;
  jobNumber: string;
  disabled?: boolean;
  disabledLabel?: string;
  compact?: boolean;
};

export function JobDeleteInlineButton({
  jobId,
  jobNumber,
  disabled = false,
  disabledLabel,
  compact = false,
}: JobDeleteInlineButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationJobNumber, setConfirmationJobNumber] = useState("");
  const [confirmationPhrase, setConfirmationPhrase] = useState("");

  const isConfirmed = useMemo(
    () =>
      confirmationJobNumber.trim() === jobNumber &&
      confirmationPhrase.trim().toLowerCase() === "delete job",
    [confirmationJobNumber, confirmationPhrase, jobNumber],
  );

  const resetState = () => {
    setOpen(false);
    setSubmitting(false);
    setConfirmationJobNumber("");
    setConfirmationPhrase("");
  };

  const handleDelete = async () => {
    if (!isConfirmed) {
      toast.error("Enter the exact job number and confirmation phrase to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await submitJobDeletionAction(
        jobId,
        confirmationJobNumber,
        confirmationPhrase,
      );

      if (!response.ok) {
        toast.error(response.error || "Failed to process the CHA job deletion.");
        setSubmitting(false);
        return;
      }

      toast.success(
        response.data.mode === "deleted"
          ? `Job ${jobNumber} was deleted.`
          : `Deletion request for ${jobNumber} is now pending manager approval.`,
      );
      resetState();
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size={compact ? "sm" : "md"}
        disabled={disabled}
        title={disabled ? disabledLabel : undefined}
        className={compact ? "h-8 px-3 text-xs" : undefined}
        onClick={() => setOpen(true)}
      >
        <Trash2 className={compact ? "size-3.5" : "mr-2 size-4"} />
        {compact ? null : "Delete"}
      </Button>

      <Modal
        open={open}
        title="Delete CHA Job"
        description={`Confirm deletion for ${jobNumber}. This may affect related CHA workflow records and cannot be undone from the UI.`}
        onClose={resetState}
        className="max-w-2xl"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-red-200/70 bg-red-50/70 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            Deleting this job will either delete it immediately if you are the assigned approval manager, or create a deletion approval request for the assigned manager.
          </div>

          <div className="space-y-2">
            <label className="ds-label block">Enter the exact job number</label>
            <input
              value={confirmationJobNumber}
              onChange={(event) => setConfirmationJobNumber(event.target.value)}
              placeholder={jobNumber}
            />
          </div>

          <div className="space-y-2">
            <label className="ds-label block">Type `delete job` to confirm</label>
            <input
              value={confirmationPhrase}
              onChange={(event) => setConfirmationPhrase(event.target.value)}
              placeholder="delete job"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={resetState} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!isConfirmed || submitting}
              onClick={handleDelete}
            >
              {submitting ? "Processing..." : "Confirm Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

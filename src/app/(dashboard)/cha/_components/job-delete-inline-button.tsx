"use client";

import { Input } from "@/components/monolith/input";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/monolith/button";
import { Modal } from "@/components/monolith/modal";
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast.error(message);
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
        className={compact ? "h-8 px-3 text-xs uppercase tracking-[0.12em]" : "text-xs uppercase tracking-[0.12em]"}
        onClick={() => setOpen(true)}
      >
        <Trash2 className={compact ? "size-3.5" : "mr-2 size-4"} />
        {compact ? null : "Delete"}
      </Button>

      <Modal
        open={open}
        title="Delete CHA Job"
        titleClassName="font-[family:var(--font-geist-sans)] tracking-[0.12em]"
        description={`Confirm deletion for ${jobNumber}. This may affect related CHA workflow records and cannot be undone from the UI.`}
        onClose={resetState}
        className="max-w-2xl"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border mnx-border-danger mnx-bg-danger p-4 text-sm mnx-text-danger mnx-border-danger mnx-bg-danger mnx-text-danger">
            <p>Type these exact values to continue:</p>
            <p className="mt-1">
              Job number: <span className="mnx-text-primary">{jobNumber}</span>
            </p>
            <p>
              Confirmation phrase: <span className="mnx-text-primary">delete job</span>
            </p>
            <p className="mt-2">
              Deleting this job will either delete it immediately if you are the assigned approval manager, or create a deletion approval request for the assigned manager.
            </p>
          </div>

          <div className="space-y-2">
            <label className="mnx-label block">Enter the exact job number</label>
            <Input
              value={confirmationJobNumber}
              onChange={(event) => setConfirmationJobNumber(event.target.value)}
              placeholder={jobNumber}
            />
          </div>

          <div className="space-y-2">
            <label className="mnx-label block">Type `delete job` to confirm</label>
            <Input
              value={confirmationPhrase}
              onChange={(event) => setConfirmationPhrase(event.target.value)}
              placeholder="delete job"
            />
            <p className="text-xs mnx-text-muted">
              Enter exactly: <span className="mnx-text-primary">delete job</span>
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={resetState}
              disabled={submitting}
              className="text-xs uppercase tracking-[0.12em]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!isConfirmed || submitting}
              onClick={handleDelete}
              className="text-xs uppercase tracking-[0.12em]"
            >
              {submitting ? "Processing..." : "Confirm Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

"use client";

import { CrmButton } from "@/modules/crm/components/workspace/crm-workspace";

import React, { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteRecordButtonProps {
  recordId: string;
  confirmMessage?: string;
  deleteAction: (id: string) => Promise<{ ok: boolean; error?: string } | any>;
  className?: string;
}

export function DeleteRecordButton({
  recordId,
  confirmMessage = "Are you sure you want to delete this record?",
  deleteAction,
  className = "p-1.5 text-mono-muted hover:text-[var(--mnx-danger)] rounded hover:bg-[var(--mnx-danger-bg)] cursor-pointer transition-colors",
}: DeleteRecordButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm(confirmMessage)) return;

    startTransition(async () => {
      try {
        const res = await deleteAction(recordId);
        if (res.ok) {
          toast.success("Record deleted successfully");
        } else {
          toast.error(res.error || "Failed to delete record");
        }
      } catch (err: any) {
        toast.error(err.message || "An error occurred");
      }
    });
  };

  return (
    <CrmButton
      onClick={handleDelete}
      disabled={isPending}
      className={className}
      title="Delete"
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin text-[var(--mnx-danger)]" />
      ) : (
        <Trash2 className="size-4" />
      )}
    </CrmButton>
  );
}

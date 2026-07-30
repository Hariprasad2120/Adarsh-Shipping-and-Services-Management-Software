"use client";

import { CrmButton, CrmDialog, CrmTextarea } from "@/modules/crm/components/workspace/crm-workspace";

import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { updateLeadStatusAction } from "@/modules/crm/actions";

interface RemarksModalProps {
  leadId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RemarksModal({ leadId, onClose, onSuccess }: RemarksModalProps) {
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [remarks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) {
      toast.error("Please enter a reason for marking the lead as not interested.");
      return;
    }

    setIsSubmitting(true);
    const res = await updateLeadStatusAction(leadId, "NOT_INTERESTED", { reason: remarks });
    setIsSubmitting(false);

    if (res.ok) {
      toast.success("Lead marked as Not Interested");
      onSuccess();
    } else {
      toast.error(res.error || "Failed to update lead status");
    }
  };

  return (
    <CrmDialog
      open
      onClose={onClose}
      title="Lead remarks"
      description="Record why this lead is not interested."
      size="compact"
      footer={
        <div className="flex justify-end gap-3">
          <CrmButton type="button" onClick={onClose} variant="secondary">
            Cancel
          </CrmButton>
          <CrmButton
            type="submit"
            form="lead-remarks-form"
            disabled={isSubmitting}
            variant="destructive"
          >
            {isSubmitting ? "Saving..." : "Submit remarks"}
          </CrmButton>
        </div>
      }
    >
        <form id="lead-remarks-form" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-bold text-mono-muted uppercase tracking-wider mb-2">
                Reason / Remarks *
              </label>
              <CrmTextarea
                ref={textareaRef}
                required
                rows={2}
                style={{ resize: "none", overflow: "hidden" }}
                placeholder="State the reason why the client is not interested (e.g. Price too high, chose competitor, no requirement at present)..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full p-3.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)] placeholder:text-mono-muted min-h-[80px]"
              />
            </div>
        </form>
    </CrmDialog>
  );
}

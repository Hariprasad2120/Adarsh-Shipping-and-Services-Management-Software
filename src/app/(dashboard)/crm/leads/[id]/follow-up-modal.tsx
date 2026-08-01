"use client";

import { CrmButton, CrmDialog, CrmTextarea } from "@/modules/crm/components/workspace/crm-workspace";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { updateLeadStatusAction } from "@/modules/crm/actions";
import { Clock } from "lucide-react";

interface FollowUpModalProps {
  leadId: string;
  status: "NOT_PICKED" | "NOT_REACHABLE";
  onClose: () => void;
  onSuccess: () => void;
}

export function FollowUpModal({ leadId, status, onClose, onSuccess }: FollowUpModalProps) {
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const statusLabel = status === "NOT_PICKED" ? "Not Picked" : "Not Reachable";

  // Calculate reminder time client-side for immediate visual review
  useEffect(() => {
    const calculateReminderTime = () => {
      const now = new Date();
      const alertTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      
      const alertHour = alertTime.getHours();
      const alertMin = alertTime.getMinutes();
      const alertMinutesFromMidnight = alertHour * 60 + alertMin;
      
      const startVal = 9 * 60 + 30; // 9:30 AM = 570 mins
      const endVal = 17 * 60 + 30;  // 5:30 PM = 1050 mins
      
      if (alertMinutesFromMidnight > endVal) {
        // Beyond 5:30 PM -> Tomorrow at 9:30 AM
        const scheduledDate = new Date(now);
        scheduledDate.setDate(scheduledDate.getDate() + 1);
        scheduledDate.setHours(9, 30, 0, 0);
        return scheduledDate;
      } else if (alertMinutesFromMidnight < startVal) {
        // Before 9:30 AM -> Today at 9:30 AM
        const scheduledDate = new Date(now);
        scheduledDate.setHours(9, 30, 0, 0);
        return scheduledDate;
      }
      
      return alertTime;
    };

    setScheduledTime(calculateReminderTime());
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [remarks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const res = await updateLeadStatusAction(leadId, status, { remarks });
    setIsSubmitting(false);

    if (res.ok) {
      toast.success(`Lead status updated to ${statusLabel} and follow-up scheduled.`);
      onSuccess();
    } else {
      toast.error(res.error || "Failed to update lead status");
    }
  };

  const formatScheduledTime = (date: Date | null) => {
    if (!date) return "Calculating...";
    
    const today = new Date();
    const isTomorrow = date.getDate() !== today.getDate();
    
    const timeString = date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    if (isTomorrow) {
      return `Tomorrow (Log-in) at 9:30 AM`;
    }
    return `Today at ${timeString}`;
  };

  return (
    <CrmDialog
      open
      onClose={onClose}
      title={`Mark lead as ${statusLabel}`}
      description="Record the call outcome and schedule the controlled follow-up."
      size="default"
      footer={
        <div className="flex justify-end gap-3">
          <CrmButton type="button" onClick={onClose} variant="secondary">
            Cancel
          </CrmButton>
          <CrmButton
            type="submit"
            form="lead-follow-up-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Scheduling..." : "Confirm and schedule"}
          </CrmButton>
        </div>
      }
    >
        <form id="lead-follow-up-form" onSubmit={handleSubmit}>
          <div className="space-y-5">
            {/* Info/Warning alert matching the design system */}
            <div className="p-4 bg-[var(--mnx-accent)]/5 border border-[var(--mnx-accent)]/20 rounded-xl space-y-2 text-mono-muted">
              <div className="flex items-center gap-2 text-[var(--mnx-accent)] font-semibold text-xs uppercase tracking-wider">
                <Clock className="size-4" />
                <span>Follow-up Alert Workflow</span>
              </div>
              <p className="text-xs leading-relaxed">
                This action will automatically schedule a follow-up alert in 2 hours. If the alert falls outside normal working hours (9:30 AM - 5:30 PM), it will be scheduled for tomorrow morning at 9:30 AM.
              </p>
              {scheduledTime && (
                <div className="pt-2 flex items-center gap-2 border-t border-[var(--mnx-accent)]/10 text-xs">
                  <span className="text-mono-muted">Scheduled for:</span>
                  <span className="font-bold text-[var(--mnx-accent)] bg-[var(--mnx-accent)]/10 px-2 py-0.5 rounded">
                    {formatScheduledTime(scheduledTime)}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-mono-muted uppercase tracking-wider mb-2">
                Call Remarks / Reason for Status (Required) *
              </label>
              <CrmTextarea
                ref={textareaRef}
                required
                rows={2}
                style={{ resize: "none", overflow: "hidden" }}
                placeholder="e.g. Number busy, switched off, customer asked to call back later..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full p-3 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)] placeholder:text-mono-muted min-h-[60px]"
              />
              <p className="text-[10px] text-mono-muted mt-1.5 leading-relaxed">
                These remarks will be attached to the scheduled follow-up activity task and audit logs.
              </p>
            </div>
          </div>

        </form>
    </CrmDialog>
  );
}

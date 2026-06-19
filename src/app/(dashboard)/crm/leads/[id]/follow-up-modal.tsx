"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { updateLeadStatusAction } from "@/modules/crm/actions";
import { X, AlertCircle, Clock, Calendar } from "lucide-react";

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0f1319] border border-[#1c212a] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-[#1c212a]/50 bg-[#0c0f14]">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4.5 text-[#fb923c]" />
            <span className="font-bold text-sm text-white uppercase tracking-wider">
              Mark Lead as {statusLabel}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer">
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          
          <div className="flex-1 overflow-y-auto p-6 space-y-5 pr-4">
            {/* Info/Warning alert matching the design system */}
            <div className="p-4 bg-[#fb923c]/5 border border-[#fb923c]/20 rounded-xl space-y-2 text-slate-300">
              <div className="flex items-center gap-2 text-[#fb923c] font-semibold text-xs uppercase tracking-wider">
                <Clock className="size-4" />
                <span>Follow-up Alert Workflow</span>
              </div>
              <p className="text-xs leading-relaxed">
                This action will automatically schedule a follow-up alert in 2 hours. If the alert falls outside normal working hours (9:30 AM - 5:30 PM), it will be scheduled for tomorrow morning at 9:30 AM.
              </p>
              {scheduledTime && (
                <div className="pt-2 flex items-center gap-2 border-t border-[#fb923c]/10 text-xs">
                  <span className="text-slate-400">Scheduled for:</span>
                  <span className="font-bold text-[#fb923c] bg-[#fb923c]/10 px-2 py-0.5 rounded">
                    {formatScheduledTime(scheduledTime)}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Call Remarks / Reason for Status (Required) *
              </label>
              <textarea
                ref={textareaRef}
                required
                rows={2}
                style={{ resize: "none", overflow: "hidden" }}
                placeholder="e.g. Number busy, switched off, customer asked to call back later..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full p-3 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6] placeholder-slate-600 min-h-[60px]"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                These remarks will be attached to the scheduled follow-up activity task and audit logs.
              </p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex-shrink-0 flex justify-end gap-3 p-4 bg-[#0c0f14] border-t border-[#1c212a]/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#00cec4] hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer uppercase tracking-wider"
            >
              {isSubmitting ? "Scheduling..." : "Confirm & Schedule"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { updateLeadStatusAction } from "@/modules/crm/actions";
import { X, AlertCircle } from "lucide-react";

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0f1319] border border-[#1c212a] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-[#1c212a]/50 bg-[#0c0f14]">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4.5 text-[#fb923c]" />
            <span className="font-bold text-sm text-white uppercase tracking-wider">Lead Remarks (Not Interested)</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer">
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 pr-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Reason / Remarks *
              </label>
              <textarea
                ref={textareaRef}
                required
                rows={2}
                style={{ resize: "none", overflow: "hidden" }}
                placeholder="State the reason why the client is not interested (e.g. Price too high, chose competitor, no requirement at present)..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full p-3.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6] placeholder-slate-600 min-h-[80px]"
              />
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
              className="flex items-center gap-2 px-5 py-2 bg-[#ef4444] hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Submit Remarks"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

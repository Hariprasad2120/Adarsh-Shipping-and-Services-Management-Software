"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { convertLeadAction } from "@/modules/crm/actions";
import { X, RefreshCcw, Landmark, AlertCircle } from "lucide-react";

interface ConvertModalProps {
  leadId: string;
  leadName: string;
  companyName: string;
  onClose: () => void;
}

export function ConvertModal({ leadId, leadName, companyName, onClose }: ConvertModalProps) {
  const router = useRouter();
  const [createDeal, setCreateDeal] = useState(false);
  const [dealAmount, setDealAmount] = useState("");
  const [dealCloseDate, setDealCloseDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const amount = createDeal ? parseFloat(dealAmount) || 0 : undefined;
    const closeDate = createDeal ? dealCloseDate : undefined;

    const res = await convertLeadAction(leadId, createDeal, amount, closeDate);
    setIsSubmitting(false);

    if (res.ok) {
      toast.success("Lead converted successfully!");
      router.push(`/crm/accounts/${res.data.accountId}`);
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0f1319] border border-[#1c212a] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1c212a]/50 bg-[#0c0f14]">
          <div className="flex items-center gap-2">
            <RefreshCcw className="size-4.5 text-[#00c4b6] animate-spin-slow" />
            <span className="font-bold text-sm text-white uppercase tracking-wider">Convert Lead</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer">
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConvert} className="p-6 space-y-5">
          <div className="p-3 bg-[#161f28]/40 border border-[#1c212a]/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="size-5 text-[#00c4b6] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              Converting lead <strong className="text-white">{leadName}</strong> will establish:
              <ul className="list-disc pl-4 mt-1.5 space-y-1">
                <li>A new Customer Account named <strong className="text-white">{companyName}</strong></li>
                <li>A Contact Profile for <strong className="text-white">{leadName}</strong></li>
                <li>Transfer of all notes, file attachments, and pending follow-up activities</li>
              </ul>
            </div>
          </div>

          {/* Deal Toggle */}
          <div className="flex items-center gap-2.5 py-1">
            <input
              type="checkbox"
              id="create-deal-checkbox"
              checked={createDeal}
              onChange={(e) => setCreateDeal(e.target.checked)}
              className="size-4 rounded border-[#1c212a] bg-[#0a0d12] text-[#00c4b6] focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="create-deal-checkbox" className="text-xs font-bold text-white uppercase tracking-wide cursor-pointer select-none">
              Create a new Deal for this account
            </label>
          </div>

          {/* Deal fields if checked */}
          {createDeal && (
            <div className="p-4 bg-[#0a0d12] border border-[#1c212a] rounded-lg space-y-4 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-2 border-b border-[#1c212a]/30 pb-2 mb-1">
                <Landmark className="size-4 text-emerald-400" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Deal Information</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Amount (INR)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={dealAmount}
                    onChange={(e) => setDealAmount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0f1319] border border-[#1c212a] rounded text-xs text-white focus:outline-none focus:border-[#00c4b6]"
                    required={createDeal}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Close Date</label>
                  <input
                    type="date"
                    value={dealCloseDate}
                    onChange={(e) => setDealCloseDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0f1319] border border-[#1c212a] rounded text-xs text-white focus:outline-none focus:border-[#00c4b6]"
                    required={createDeal}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex justify-end gap-3 pt-3 border-t border-[#1c212a]/30">
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
              className="flex items-center gap-2 px-5 py-2 bg-[#00c4b6] hover:bg-[#00b0a3] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-[#00c4b6]/10 cursor-pointer"
            >
              {isSubmitting ? "Converting..." : "Convert Lead"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

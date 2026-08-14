"use client";

import { CrmButton, CrmDialog, CrmInput } from "@/modules/crm/components/workspace/crm-workspace";

import { DateInput } from "@/components/ui/date-input";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { convertLeadAction } from "@/modules/crm/actions";
import { Landmark, AlertCircle } from "lucide-react";

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
      router.push(`/crm/customers/${res.data.accountId}`);
    } else {
      toast.error(res.error);
    }
  };

  return (
    <CrmDialog
      open
      onClose={onClose}
      title="Convert lead"
      description="Create the customer, contact, and optional commercial opportunity."
      size="default"
      footer={
        <div className="flex justify-end gap-3">
          <CrmButton type="button" onClick={onClose} variant="secondary">
            Cancel
          </CrmButton>
          <CrmButton
            type="submit"
            form="convert-lead-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Converting..." : "Convert lead"}
          </CrmButton>
        </div>
      }
    >
        <form id="convert-lead-form" onSubmit={handleConvert} className="space-y-5">
          <div className="p-3 bg-[var(--mnx-surface)]/40 border border-[var(--mnx-border)]/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="size-5 text-[var(--mnx-accent)] shrink-0 mt-0.5" />
            <div className="text-xs text-[var(--mnx-muted)] leading-relaxed">
              Converting lead <strong className="text-[var(--mnx-text-strong)]">{leadName}</strong> will establish:
              <ul className="list-disc pl-4 mt-1.5 space-y-1">
                <li>A new Customer Account named <strong className="text-[var(--mnx-text-strong)]">{companyName}</strong></li>
                <li>A Contact Profile for <strong className="text-[var(--mnx-text-strong)]">{leadName}</strong></li>
                <li>Transfer of all notes, file attachments, and pending follow-up activities</li>
              </ul>
            </div>
          </div>

          {/* Deal Toggle */}
          <div className="flex items-center gap-2.5 py-1">
            <CrmInput
              type="checkbox"
              id="create-deal-checkbox"
              checked={createDeal}
              onChange={(e) => setCreateDeal(e.target.checked)}
              className="size-4 rounded border-[var(--mnx-border)] bg-[var(--mnx-surface)] text-[var(--mnx-accent)] focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="create-deal-checkbox" className="text-xs font-bold text-[var(--mnx-text-strong)] uppercase tracking-wide cursor-pointer select-none">
              Create a new Deal for this account
            </label>
          </div>

          {/* Deal fields if checked */}
          {createDeal && (
            <div className="p-4 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg space-y-4 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-2 border-b border-[var(--mnx-border)]/30 pb-2 mb-1">
                <Landmark className="size-4 text-[var(--mnx-success)]" />
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide">Deal Information</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">Amount (INR)</label>
                  <CrmInput
                    type="number"
                    placeholder="e.g. 50000"
                    value={dealAmount}
                    onChange={(e) => setDealAmount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    required={createDeal}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">Close Date</label>
                  <DateInput
                    value={dealCloseDate}
                    onChange={(e) => setDealCloseDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    required={createDeal}
                  />
                </div>
              </div>
            </div>
          )}

        </form>
    </CrmDialog>
  );
}

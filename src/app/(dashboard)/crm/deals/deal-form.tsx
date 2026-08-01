"use client";

import {
  CrmButton,
  CrmInput,
  CrmTextarea,
} from "@/modules/crm/components/workspace/crm-workspace";

import { NativeSelect } from "@/components/ui/native-select";
import { DateInput } from "@/components/ui/date-input";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createDealAction, updateDealAction } from "@/modules/crm/actions";
import { Save, Landmark, Building, User, Calendar, Tag } from "lucide-react";

interface Option {
  id: string;
  name: string;
}

interface DealFormProps {
  initialData?: any;
  accounts: Option[];
  contacts: { id: string; name: string }[];
  employees: Option[];
}

const STAGE_PROBABILITIES: Record<string, number> = {
  PROSPECTING: 10,
  QUALIFICATION: 20,
  PROPOSAL: 40,
  NEGOTIATION: 70,
  WON: 100,
  LOST: 0,
};

export function DealForm({
  initialData,
  accounts,
  contacts,
  employees,
}: DealFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(initialData?.name || "");
  const [stage, setStage] = useState(initialData?.stage || "PROSPECTING");
  const [probability, setProbability] = useState(
    initialData?.probability || 10,
  );

  // Auto-update probability when stage changes
  const handleStageChange = (newStage: string) => {
    setStage(newStage);
    if (STAGE_PROBABILITIES[newStage] !== undefined) {
      setProbability(STAGE_PROBABILITIES[newStage]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Deal Name is required");
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData(e.currentTarget);
    fd.append("probability", probability.toString());

    const res = isEdit
      ? await updateDealAction(initialData.id, fd)
      : await createDealAction(fd);

    setIsSubmitting(false);

    if (res.ok) {
      toast.success(
        isEdit ? "Deal updated successfully" : "Deal created successfully",
      );
      router.push(isEdit ? `/crm/deals/${initialData.id}` : "/crm/deals");
    } else {
      toast.error(res.error);
    }
  };

  const stagesList = [
    "PROSPECTING",
    "QUALIFICATION",
    "PROPOSAL",
    "NEGOTIATION",
    "WON",
    "LOST",
  ];
  const serviceTypes = [
    "Freight Forwarding",
    "Customs Clearance",
    "Transportation",
    "Warehousing",
    "CHA Service",
    "Project Cargo",
    "Documentation",
  ];
  const logisticsCategories = ["Import", "Export"];

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 max-w-5xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/60 rounded-xl p-6 shadow-2xl"
    >
      {/* ─── SECTION: BASIC INFO ────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-mono-text uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
          <Landmark className="size-4 text-[var(--mnx-accent)]" />
          <span>Deal Information</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Deal Name *
            </label>
            <CrmInput
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Adarsh Freight Deal"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Owner *
            </label>
            <NativeSelect
              name="ownerId"
              defaultValue={initialData?.ownerId || ""}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
              required
            >
              <option value="">Select Owner</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Account (Company) *
            </label>
            <NativeSelect
              name="accountId"
              defaultValue={initialData?.accountId || ""}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
              required
            >
              <option value="">Link Account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Primary Contact
            </label>
            <NativeSelect
              name="contactId"
              defaultValue={initialData?.contactId || ""}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
            >
              <option value="">Link Contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
      </div>

      {/* ─── SECTION: STAGING & METRICS ───────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-mono-text uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
          <Tag className="size-4 text-[var(--mnx-accent)]" />
          <span>Stage & Valuation</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Deal Stage
            </label>
            <NativeSelect
              name="stage"
              value={stage}
              onChange={(e) => handleStageChange(e.target.value)}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
            >
              {stagesList.map((st) => (
                <option key={st} value={st}>
                  {st.replace("_", " ")}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Deal Value (INR)
            </label>
            <CrmInput
              type="number"
              name="amount"
              defaultValue={initialData?.amount || ""}
              placeholder="e.g. 150000"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Probability (%)
            </label>
            <CrmInput
              type="number"
              value={probability}
              onChange={(e) =>
                setProbability(
                  Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                )
              }
              placeholder="e.g. 40"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Expected Close Date
            </label>
            <DateInput
              name="expectedCloseDate"
              defaultValue={
                initialData?.expectedCloseDate
                  ? new Date(initialData.expectedCloseDate)
                      .toISOString()
                      .split("T")[0]
                  : ""
              }
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Next Follow Up Date
            </label>
            <DateInput
              name="nextFollowUpDate"
              defaultValue={
                initialData?.nextFollowUpDate
                  ? new Date(initialData.nextFollowUpDate)
                      .toISOString()
                      .split("T")[0]
                  : ""
              }
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
        </div>
      </div>

      {/* ─── SECTION: LOGISTICS & CATEGORIES ────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-mono-text uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
          <Landmark className="size-4 text-[var(--mnx-accent)]" />
          <span>Logistics & Shipping Details</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Service Type
            </label>
            <NativeSelect
              name="serviceType"
              defaultValue={initialData?.serviceType || "Freight Forwarding"}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
            >
              {serviceTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Logistics Category
            </label>
            <NativeSelect
              name="logisticsCategory"
              defaultValue={initialData?.logisticsCategory || "Import"}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
            >
              {logisticsCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Competitor
            </label>
            <CrmInput
              type="text"
              name="competitor"
              defaultValue={initialData?.competitor || ""}
              placeholder="e.g. DHL, FedEx"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
        </div>
      </div>

      {/* Description / Lost Reason */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
            Description
          </label>
          <CrmTextarea
            name="description"
            defaultValue={initialData?.description || ""}
            placeholder="Log key specifications or client demands..."
            rows={3}
            className="w-full p-3 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
            Reason for Loss
          </label>
          <CrmTextarea
            name="lostReason"
            defaultValue={initialData?.lostReason || ""}
            placeholder="Specify reason if deal is lost..."
            rows={3}
            className="w-full p-3 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3.5 pt-4 border-t border-[var(--mnx-border)]/30">
        <CrmButton
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] text-mono-muted border border-[var(--mnx-border)]/80 rounded-lg text-sm font-semibold cursor-pointer"
        >
          Cancel
        </CrmButton>
        <CrmButton
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] disabled:opacity-50 text-mono-text rounded-lg text-sm font-bold transition-all mnx-shadow-panel cursor-pointer"
        >
          <Save className="size-4.5" />
          <span>
            {isSubmitting ? "Saving..." : isEdit ? "Update Deal" : "Save Deal"}
          </span>
        </CrmButton>
      </div>
    </form>
  );
}

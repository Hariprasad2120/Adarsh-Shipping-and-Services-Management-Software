"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createDealAction, updateDealAction } from "@/modules/crm/actions";
import { Save, Landmark, Building, User, Calendar, Tag, ShieldAlert } from "lucide-react";

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

export function DealForm({ initialData, accounts, contacts, employees }: DealFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(initialData?.name || "");
  const [stage, setStage] = useState(initialData?.stage || "PROSPECTING");
  const [probability, setProbability] = useState(initialData?.probability || 10);

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
      toast.success(isEdit ? "Deal updated successfully" : "Deal created successfully");
      router.push(isEdit ? `/crm/deals/${initialData.id}` : "/crm/deals");
    } else {
      toast.error(res.error);
    }
  };

  const stagesList = ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
  const serviceTypes = ["Freight Forwarding", "Customs Clearance", "Transportation", "Warehousing", "CHA Service", "Project Cargo", "Documentation"];
  const logisticsCategories = ["Import", "Export"];

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl bg-[#0f1319] border border-[#1c212a]/60 rounded-xl p-6 shadow-2xl">
      {/* ─── SECTION: BASIC INFO ────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
          <Landmark className="size-4 text-[#00c4b6]" />
          <span>Deal Information</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Deal Name *</label>
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Adarsh Freight Deal"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Owner *</label>
            <select
              name="ownerId"
              defaultValue={initialData?.ownerId || ""}
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#00c4b6]"
              required
            >
              <option value="">Select Owner</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Account (Company) *</label>
            <select
              name="accountId"
              defaultValue={initialData?.accountId || ""}
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#00c4b6]"
              required
            >
              <option value="">Link Account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Primary Contact</label>
            <select
              name="contactId"
              defaultValue={initialData?.contactId || ""}
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#00c4b6]"
            >
              <option value="">Link Contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── SECTION: STAGING & METRICS ───────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
          <Tag className="size-4 text-[#00c4b6]" />
          <span>Stage & Valuation</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Deal Stage</label>
            <select
              name="stage"
              value={stage}
              onChange={(e) => handleStageChange(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#00c4b6]"
            >
              {stagesList.map((st) => (
                <option key={st} value={st}>{st.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Deal Value (INR)</label>
            <input
              type="number"
              name="amount"
              defaultValue={initialData?.amount || ""}
              placeholder="e.g. 150000"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Probability (%)</label>
            <input
              type="number"
              value={probability}
              onChange={(e) => setProbability(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
              placeholder="e.g. 40"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Expected Close Date</label>
            <input
              type="date"
              name="expectedCloseDate"
              defaultValue={initialData?.expectedCloseDate ? new Date(initialData.expectedCloseDate).toISOString().split("T")[0] : ""}
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Next Follow Up Date</label>
            <input
              type="date"
              name="nextFollowUpDate"
              defaultValue={initialData?.nextFollowUpDate ? new Date(initialData.nextFollowUpDate).toISOString().split("T")[0] : ""}
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
        </div>
      </div>

      {/* ─── SECTION: LOGISTICS & CATEGORIES ────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
          <Landmark className="size-4 text-[#00c4b6]" />
          <span>Logistics & Shipping Details</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Service Type</label>
            <select
              name="serviceType"
              defaultValue={initialData?.serviceType || "Freight Forwarding"}
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#00c4b6]"
            >
              {serviceTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Logistics Category</label>
            <select
              name="logisticsCategory"
              defaultValue={initialData?.logisticsCategory || "Import"}
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#00c4b6]"
            >
              {logisticsCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Competitor</label>
            <input
              type="text"
              name="competitor"
              defaultValue={initialData?.competitor || ""}
              placeholder="e.g. DHL, FedEx"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
        </div>
      </div>

      {/* Description / Lost Reason */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Description</label>
          <textarea
            name="description"
            defaultValue={initialData?.description || ""}
            placeholder="Log key specifications or client demands..."
            rows={3}
            className="w-full p-3 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Reason for Loss</label>
          <textarea
            name="lostReason"
            defaultValue={initialData?.lostReason || ""}
            placeholder="Specify reason if deal is lost..."
            rows={3}
            className="w-full p-3 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3.5 pt-4 border-t border-[#1c212a]/30">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 bg-[#161f28] hover:bg-[#1f2d3a] text-slate-300 border border-[#1c212a]/80 rounded-lg text-sm font-semibold cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2 bg-[#00c4b6] hover:bg-[#00b0a3] disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-all shadow-md shadow-[#00c4b6]/10 cursor-pointer"
        >
          <Save className="size-4.5" />
          <span>{isSubmitting ? "Saving..." : isEdit ? "Update Deal" : "Save Deal"}</span>
        </button>
      </div>
    </form>
  );
}

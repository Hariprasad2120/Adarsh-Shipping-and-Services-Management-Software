"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createAccountAction, updateAccountAction } from "@/modules/crm/actions";
import { Save, Building, Phone, Mail, MapPin, DollarSign } from "lucide-react";

interface UserOption {
  id: string;
  name: string;
}

interface AccountFormProps {
  initialData?: any;
  employees: UserOption[];
}

export function AccountForm({ initialData, employees }: AccountFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(initialData?.name || "");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Account Name is required");
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData(e.currentTarget);

    const res = isEdit
      ? await updateAccountAction(initialData.id, fd)
      : await createAccountAction(fd);

    setIsSubmitting(false);

    if (res.ok) {
      toast.success(isEdit ? "Account updated successfully" : "Account created successfully");
      router.push(isEdit ? `/crm/accounts/${initialData.id}` : "/crm/accounts");
    } else {
      toast.error(res.error);
    }
  };

  const accountTypes = ["Customer", "Partner", "Vendor", "Prospect"];
  const paymentTermsList = ["Net 15", "Net 30", "Net 45", "Net 60", "Due on Receipt"];

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl bg-[#0f1319] border border-[#1c212a]/60 rounded-xl p-6 shadow-2xl">
      {/* ─── SECTION: BASIC INFO ────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
          <Building className="size-4 text-[#00c4b6]" />
          <span>Account Information</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Account Name *</label>
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Adarsh Shipping Ltd"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Account Type</label>
            <select
              name="type"
              defaultValue={initialData?.type || "Customer"}
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#00c4b6]"
            >
              {accountTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Website</label>
            <input
              type="url"
              name="website"
              defaultValue={initialData?.website || ""}
              placeholder="e.g. https://www.company.com"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Industry Segment</label>
            <input
              type="text"
              name="industry"
              defaultValue={initialData?.industry || ""}
              placeholder="e.g. Shipping / Logistics"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
        </div>
      </div>

      {/* ─── SECTION: CONTACT DETAILS ────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
          <Mail className="size-4 text-[#00c4b6]" />
          <span>Contact Details</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Phone</label>
            <input
              type="text"
              name="phone"
              defaultValue={initialData?.phone || ""}
              placeholder="e.g. +91 44 2819 1234"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Email</label>
            <input
              type="email"
              name="email"
              defaultValue={initialData?.email || ""}
              placeholder="e.g. office@domain.com"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">GSTIN / Tax ID</label>
            <input
              type="text"
              name="gstin"
              defaultValue={initialData?.gstin || ""}
              placeholder="e.g. 33AABCA1234F1Z1"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
        </div>
      </div>

      {/* ─── SECTION: FINANCE ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
          <DollarSign className="size-4 text-[#00c4b6]" />
          <span>Finance & Credit Terms</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Credit Limit (INR)</label>
            <input
              type="number"
              name="creditLimit"
              defaultValue={initialData?.creditLimit || ""}
              placeholder="e.g. 500000"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Payment Terms</label>
            <select
              name="paymentTerms"
              defaultValue={initialData?.paymentTerms || "Net 30"}
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#00c4b6]"
            >
              {paymentTermsList.map((term) => (
                <option key={term} value={term}>{term}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Account Owner *</label>
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
        </div>
      </div>

      {/* ─── SECTION: ADDRESS ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
          <MapPin className="size-4 text-[#00c4b6]" />
          <span>Billing & Shipping Address</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Billing Address</label>
            <textarea
              name="billingAddress"
              defaultValue={initialData?.billingAddress || ""}
              placeholder="Enter full billing address..."
              rows={3}
              className="w-full p-3 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Shipping Address</label>
            <textarea
              name="shippingAddress"
              defaultValue={initialData?.shippingAddress || ""}
              placeholder="Enter full shipping address..."
              rows={3}
              className="w-full p-3 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
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
          <span>{isSubmitting ? "Saving..." : isEdit ? "Update Account" : "Save Account"}</span>
        </button>
      </div>
    </form>
  );
}

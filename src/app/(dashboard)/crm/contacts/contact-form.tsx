"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createContactAction, updateContactAction } from "@/modules/crm/actions";
import { Save, User, Phone, Mail, Building, Tag } from "lucide-react";

interface Option {
  id: string;
  name: string;
}

interface ContactFormProps {
  initialData?: any;
  accounts: Option[];
  employees: Option[];
}

export function ContactForm({ initialData, accounts, employees }: ContactFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastName, setLastName] = useState(initialData?.lastName || "");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lastName.trim()) {
      toast.error("Last Name is required");
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData(e.currentTarget);

    const res = isEdit
      ? await updateContactAction(initialData.id, fd)
      : await createContactAction(fd);

    setIsSubmitting(false);

    if (res.ok) {
      toast.success(isEdit ? "Contact updated successfully" : "Contact created successfully");
      router.push(isEdit ? `/crm/contacts/${initialData.id}` : "/crm/contacts");
    } else {
      toast.error(res.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl bg-[#0f1319] border border-[#1c212a]/60 rounded-xl p-6 shadow-2xl">
      {/* ─── SECTION: BASIC INFO ────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
          <User className="size-4 text-[#00c4b6]" />
          <span>Contact Identity</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">First Name</label>
            <input
              type="text"
              name="firstName"
              defaultValue={initialData?.firstName || ""}
              placeholder="e.g. Adarsh"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Last Name *</label>
            <input
              type="text"
              name="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Hari"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Linked Account (Company) *</label>
            <select
              name="accountId"
              defaultValue={initialData?.accountId || ""}
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#00c4b6]"
              required
            >
              <option value="">Select Account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Designation</label>
            <input
              type="text"
              name="designation"
              defaultValue={initialData?.designation || ""}
              placeholder="e.g. Purchase Manager"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Department</label>
            <input
              type="text"
              name="department"
              defaultValue={initialData?.department || ""}
              placeholder="e.g. Procurement / Import"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div className="flex items-center gap-2.5 pt-6">
            <input
              type="checkbox"
              name="isDecisionMaker"
              value="true"
              defaultChecked={initialData?.isDecisionMaker}
              id="is-decision-maker"
              className="size-4 rounded border-[#1c212a] bg-[#0a0d12] text-[#00c4b6] focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="is-decision-maker" className="text-xs font-bold text-white uppercase tracking-wide cursor-pointer select-none">
              Key Decision Maker / CHA Liaison
            </label>
          </div>
        </div>
      </div>

      {/* ─── SECTION: CONTACT CHANNELS ───────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
          <Mail className="size-4 text-[#00c4b6]" />
          <span>Contact Channels</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Email Address</label>
            <input
              type="email"
              name="email"
              defaultValue={initialData?.email || ""}
              placeholder="e.g. contact@domain.com"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Phone (Direct)</label>
            <input
              type="text"
              name="phone"
              defaultValue={initialData?.phone || ""}
              placeholder="e.g. +91 44 2819 1234"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Mobile Number</label>
            <input
              type="text"
              name="mobile"
              defaultValue={initialData?.mobile || ""}
              placeholder="e.g. +91 98840 12345"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
        </div>
      </div>

      {/* ─── SECTION: ASSIGNMENT ────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
          <Tag className="size-4 text-[#00c4b6]" />
          <span>Assignment & Ownership</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Contact Owner *</label>
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
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Street Address</label>
            <input
              type="text"
              name="address"
              defaultValue={initialData?.address || ""}
              placeholder="e.g. Chennai Office details"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
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
          <span>{isSubmitting ? "Saving..." : isEdit ? "Update Contact" : "Save Contact"}</span>
        </button>
      </div>
    </form>
  );
}

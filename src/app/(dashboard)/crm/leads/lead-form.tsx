"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createLeadAction, updateLeadAction } from "@/modules/crm/actions";
import { Save, X, Briefcase, Mail, Phone, MapPin, Tag } from "lucide-react";

interface UserOption {
  id: string;
  name: string;
}

interface LeadFormProps {
  initialData?: any;
  employees: UserOption[];
}

export function LeadForm({ initialData, employees }: LeadFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastName, setLastName] = useState(initialData?.lastName || "");
  const [company, setCompany] = useState(initialData?.company || "");
  const [isPerishable, setIsPerishable] = useState(initialData?.isPerishable || false);
  const [showPerishablesDialog, setShowPerishablesDialog] = useState(false);
  const [perishableType, setPerishableType] = useState(initialData?.perishableDetails?.perishableType || "");
  const [tempRequired, setTempRequired] = useState(initialData?.perishableDetails?.tempRequired || "");
  const [humidityControl, setHumidityControl] = useState(initialData?.perishableDetails?.humidityControl || "");
  const [ventilation, setVentilation] = useState(initialData?.perishableDetails?.ventilation || "");
  const [perishableRemarks, setPerishableRemarks] = useState(initialData?.perishableDetails?.perishableRemarks || "");

  const handleFillDemo = () => {
    // Set controlled states
    setLastName("Hari");
    setCompany("Adarsh Shipping Logistics");
    
    // Set other inputs
    const formEl = document.querySelector("form");
    if (formEl) {
      const setVal = (name: string, val: string) => {
        const el = formEl.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (el) el.value = val;
      };
      setVal("firstName", "Adarsh");
      setVal("designation", "Operations Manager");
      setVal("email", "adarsh.hari@example.com");
      setVal("phone", "+91 44 2819 1234");
      setVal("mobile", "+91 98840 12345");
      setVal("fax", "+91 44 2819 5678");
      setVal("website", "https://www.adarshshipping.in");
      setVal("source", "Partner Referral");
      setVal("status", "NEW");
      setVal("rating", "Hot");
      setVal("industry", "Logistics & Supply Chain");
      setVal("annualRevenue", "15000000");
      setVal("address", "14 East Coast Road, Thiruvanmiyur");
      setVal("city", "Chennai");
      setVal("state", "Tamil Nadu");
      setVal("pincode", "600041");
      setVal("country", "India");
      setVal("tags", "VIP Customer, Custom Clearance");
      setVal("description", "Requires regular import shipments of automotive parts from Shanghai to Chennai Port. Expects LCL consolidation and custom clearing CHA support.");
      toast.success("Lead form demo data filled!");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lastName.trim() || !company.trim()) {
      toast.error("Lead Name/Last Name and Company are required");
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData(e.currentTarget);

    const res = isEdit
      ? await updateLeadAction(initialData.id, fd)
      : await createLeadAction(fd);

    setIsSubmitting(false);

    if (res.ok) {
      toast.success(isEdit ? "Lead updated successfully" : "Lead created successfully");
      router.push(isEdit ? `/crm/leads/${initialData.id}` : "/crm/leads");
    } else {
      toast.error(res.error);
    }
  };

  const sources = ["Cold Call", "Web Site", "Partner Referral", "Employee Referral", "Trade Show", "External Agency"];
  const statuses = ["NEW", "ATTEMPTED_TO_CONTACT", "CONTACTED", "QUALIFIED", "LOST"];
  const ratings = ["Hot", "Warm", "Cold"];

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl bg-[#0f1319] border border-[#1c212a]/60 rounded-xl p-6 shadow-2xl">
      {/* ─── SECTION: BASIC INFO ────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
          <Briefcase className="size-4 text-[#00c4b6]" />
          <span>Lead & Company Information</span>
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
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Last Name / Lead Name *</label>
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
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Company Name *</label>
            <input
              type="text"
              name="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Adarsh Shipping Ltd"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Designation</label>
            <input
              type="text"
              name="designation"
              defaultValue={initialData?.designation || ""}
              placeholder="e.g. Logistics Director"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
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
              placeholder="e.g. client@domain.com"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Phone (Office)</label>
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
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Fax Number</label>
            <input
              type="text"
              name="fax"
              defaultValue={initialData?.fax || ""}
              placeholder="e.g. +91 44 2819 5678"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Website URL</label>
            <input
              type="url"
              name="website"
              defaultValue={initialData?.website || ""}
              placeholder="e.g. https://www.company.com"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
        </div>
      </div>

      {/* ─── SECTION: CLASSIFICATION ────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
          <Tag className="size-4 text-[#00c4b6]" />
          <span>Classification & Scoring</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Lead Source</label>
            <select
              name="source"
              defaultValue={initialData?.source || "Cold Call"}
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#00c4b6]"
            >
              {sources.map((src) => (
                <option key={src} value={src}>{src}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Lead Status</label>
            <select
              name="status"
              defaultValue={initialData?.status || "NEW"}
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#00c4b6]"
            >
              {statuses.map((st) => (
                <option key={st} value={st}>{st.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Rating</label>
            <select
              name="rating"
              defaultValue={initialData?.rating || "Warm"}
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#00c4b6]"
            >
              {ratings.map((rt) => (
                <option key={rt} value={rt}>{rt}</option>
              ))}
            </select>
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
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Annual Revenue (INR)</label>
            <input
              type="number"
              name="annualRevenue"
              defaultValue={initialData?.annualRevenue || ""}
              placeholder="e.g. 5000000"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Lead Owner (HRMS Linked) *</label>
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

      {/* ─── SECTION: PERISHABLE CARGO ───────────────────────────────────── */}
      <div className="space-y-4 p-5 rounded-xl bg-[#161f28]/45 border border-[#1c212a] hover-cyan transition-all">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Perishable Cargo Handling</h4>
            <p className="text-[11px] text-slate-400">Specify if this client requires temperature-controlled or perishable cargo shipping</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPerishable}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsPerishable(checked);
                if (checked) {
                  setShowPerishablesDialog(true);
                }
              }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[#161f28] border border-[#1c212a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-[#00c4b6] after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00c4b6]/10 peer-checked:border-[#00c4b6]/40"></div>
          </label>
        </div>

        {/* Hidden inputs to be caught by FormData */}
        <input type="hidden" name="isPerishable" value={isPerishable ? "true" : "false"} />
        <input type="hidden" name="perishableType" value={perishableType} />
        <input type="hidden" name="tempRequired" value={tempRequired} />
        <input type="hidden" name="humidityControl" value={humidityControl} />
        <input type="hidden" name="ventilation" value={ventilation} />
        <input type="hidden" name="perishableRemarks" value={perishableRemarks} />

        {isPerishable && (
          <div className="p-4 bg-[#0a0d12]/60 rounded-lg border border-[#1c212a]/50 text-xs grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-200">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-0.5">Cargo Type</span>
              <span className="text-white font-medium">{perishableType || "Not specified"}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-0.5">Temperature Range</span>
              <span className="text-white font-medium">{tempRequired || "Not specified"}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-0.5">Humidity / Vent</span>
              <span className="text-white font-medium">H: {humidityControl || "N/A"} / V: {ventilation || "N/A"}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-0.5">Remarks</span>
              <span className="text-white font-medium block truncate">{perishableRemarks || "None"}</span>
            </div>
            <div className="col-span-2 md:col-span-4 flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowPerishablesDialog(true)}
                className="px-3 py-1 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-[#00c4b6] rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Edit Perishable Info
              </button>
            </div>
          </div>
        )}
      </div>

      {showPerishablesDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0f1319] border border-[#1c212a] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#1c212a]/50 bg-[#0c0f14]">
              <span className="font-bold text-xs text-white uppercase tracking-wider">Perishable Cargo Specification</span>
              <button 
                type="button" 
                onClick={() => setShowPerishablesDialog(false)} 
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Cargo Type (e.g. Fresh Fruits, Seafood, Vaccines)</label>
                <input
                  type="text"
                  placeholder="e.g. Chilled Blueberries"
                  value={perishableType}
                  onChange={(e) => setPerishableType(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#00c4b6]/40 rounded-lg text-xs text-white focus:outline-none focus:border-[#00c4b6]"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Required Temp (°C)</label>
                  <input
                    type="text"
                    placeholder="e.g. 2°C to 4°C"
                    value={tempRequired}
                    onChange={(e) => setTempRequired(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#00c4b6]/40 rounded-lg text-xs text-white focus:outline-none focus:border-[#00c4b6]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Humidity (%)</label>
                  <input
                    type="text"
                    placeholder="e.g. 85%"
                    value={humidityControl}
                    onChange={(e) => setHumidityControl(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#00c4b6]/40 rounded-lg text-xs text-white focus:outline-none focus:border-[#00c4b6]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Ventilation</label>
                  <input
                    type="text"
                    placeholder="e.g. 25 cbm/h"
                    value={ventilation}
                    onChange={(e) => setVentilation(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#00c4b6]/40 rounded-lg text-xs text-white focus:outline-none focus:border-[#00c4b6]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Special Remarks & Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Provide remarks regarding temperature logging, reefer power connection, or pre-cooling needs..."
                  value={perishableRemarks}
                  onChange={(e) => setPerishableRemarks(e.target.value)}
                  className="w-full p-2.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00c4b6] placeholder-slate-600 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 bg-[#0c0f14] border-t border-[#1c212a]/30">
              <button
                type="button"
                onClick={() => {
                  setShowPerishablesDialog(false);
                }}
                className="px-4 py-2 bg-[#00c4b6] hover:bg-[#00b0a3] text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION: ADDRESS ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1c212a]/30 pb-2 flex items-center gap-2">
          <MapPin className="size-4 text-[#00c4b6]" />
          <span>Address Details</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Street Address</label>
            <input
              type="text"
              name="address"
              defaultValue={initialData?.address || ""}
              placeholder="e.g. 14 East Coast Road, Thiruvanmiyur"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">City</label>
            <input
              type="text"
              name="city"
              defaultValue={initialData?.city || ""}
              placeholder="e.g. Chennai"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">State</label>
            <input
              type="text"
              name="state"
              defaultValue={initialData?.state || ""}
              placeholder="e.g. Tamil Nadu"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Pincode</label>
            <input
              type="text"
              name="pincode"
              defaultValue={initialData?.pincode || ""}
              placeholder="e.g. 600041"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Country</label>
            <input
              type="text"
              name="country"
              defaultValue={initialData?.country || ""}
              placeholder="e.g. India"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Comma-separated Tags</label>
            <input
              type="text"
              name="tags"
              defaultValue={initialData?.tags?.join(", ") || ""}
              placeholder="e.g. VIP, Customs Clearance, CHA"
              className="w-full px-3.5 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Enquiry / Description</label>
        <textarea
          name="description"
          defaultValue={initialData?.description || ""}
          placeholder="Enter details of customer enquiry, freight needs, or meeting notes..."
          rows={4}
          className="w-full p-3.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3.5 pt-4 border-t border-[#1c212a]/30">
        <button
          type="button"
          onClick={handleFillDemo}
          className="px-5 py-2 bg-[#00c4b6]/10 hover:bg-[#00c4b6]/20 border border-[#00c4b6]/35 text-[#00c4b6] rounded-lg text-sm font-semibold cursor-pointer"
        >
          Fill Demo Data
        </button>
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
          <span>{isSubmitting ? "Saving..." : isEdit ? "Update Lead" : "Save Lead"}</span>
        </button>
      </div>
    </form>
  );
}

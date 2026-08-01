"use client";

import {
  CrmButton,
  CrmDialogLayer,
  CrmInput,
  CrmTextarea,
} from "@/modules/crm/components/workspace/crm-workspace";

import { NativeSelect } from "@/components/ui/native-select";
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
  const [isPerishable, setIsPerishable] = useState(
    initialData?.isPerishable || false,
  );
  const [showPerishablesDialog, setShowPerishablesDialog] = useState(false);
  const [perishableType, setPerishableType] = useState(
    initialData?.perishableDetails?.perishableType || "",
  );
  const [tempRequired, setTempRequired] = useState(
    initialData?.perishableDetails?.tempRequired || "",
  );
  const [humidityControl, setHumidityControl] = useState(
    initialData?.perishableDetails?.humidityControl || "",
  );
  const [ventilation, setVentilation] = useState(
    initialData?.perishableDetails?.ventilation || "",
  );
  const [perishableRemarks, setPerishableRemarks] = useState(
    initialData?.perishableDetails?.perishableRemarks || "",
  );

  const handleFillDemo = () => {
    // Set controlled states
    setLastName("Hari");
    setCompany("Adarsh Shipping Logistics");

    // Set other inputs
    const formEl = document.querySelector("form");
    if (formEl) {
      const setVal = (name: string, val: string) => {
        const el = formEl.elements.namedItem(name) as
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
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
      setVal(
        "description",
        "Requires regular import shipments of automotive parts from Shanghai to Chennai Port. Expects LCL consolidation and custom clearing CHA support.",
      );
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
      toast.success(
        isEdit ? "Lead updated successfully" : "Lead created successfully",
      );
      router.push(isEdit ? `/crm/leads/${initialData.id}` : "/crm/leads");
    } else {
      toast.error(res.error);
    }
  };

  const sources = [
    "Cold Call",
    "Web Site",
    "Partner Referral",
    "Employee Referral",
    "Trade Show",
    "External Agency",
  ];
  const statuses = [
    "NEW",
    "ATTEMPTED_TO_CONTACT",
    "CONTACTED",
    "QUALIFIED",
    "LOST",
  ];
  const ratings = ["Hot", "Warm", "Cold"];

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 max-w-5xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/60 rounded-xl p-6 shadow-2xl"
    >
      {/* ─── SECTION: BASIC INFO ────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-mono-text uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
          <Briefcase className="size-4 text-[var(--mnx-accent)]" />
          <span>Lead & Company Information</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              First Name
            </label>
            <CrmInput
              type="text"
              name="firstName"
              defaultValue={initialData?.firstName || ""}
              placeholder="e.g. Adarsh"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Last Name / Lead Name *
            </label>
            <CrmInput
              type="text"
              name="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Hari"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Company Name *
            </label>
            <CrmInput
              type="text"
              name="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Adarsh Shipping Ltd"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Designation
            </label>
            <CrmInput
              type="text"
              name="designation"
              defaultValue={initialData?.designation || ""}
              placeholder="e.g. Logistics Director"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
        </div>
      </div>

      {/* ─── SECTION: CONTACT CHANNELS ───────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-mono-text uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
          <Mail className="size-4 text-[var(--mnx-accent)]" />
          <span>Contact Channels</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Email Address
            </label>
            <CrmInput
              type="email"
              name="email"
              defaultValue={initialData?.email || ""}
              placeholder="e.g. client@domain.com"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Phone (Office)
            </label>
            <CrmInput
              type="text"
              name="phone"
              defaultValue={initialData?.phone || ""}
              placeholder="e.g. +91 44 2819 1234"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Mobile Number
            </label>
            <CrmInput
              type="text"
              name="mobile"
              defaultValue={initialData?.mobile || ""}
              placeholder="e.g. +91 98840 12345"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Fax Number
            </label>
            <CrmInput
              type="text"
              name="fax"
              defaultValue={initialData?.fax || ""}
              placeholder="e.g. +91 44 2819 5678"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Website URL
            </label>
            <CrmInput
              type="url"
              name="website"
              defaultValue={initialData?.website || ""}
              placeholder="e.g. https://www.company.com"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
        </div>
      </div>

      {/* ─── SECTION: CLASSIFICATION ────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-mono-text uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
          <Tag className="size-4 text-[var(--mnx-accent)]" />
          <span>Classification & Scoring</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Lead Source
            </label>
            <NativeSelect
              name="source"
              defaultValue={initialData?.source || "Cold Call"}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
            >
              {sources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Lead Status
            </label>
            <NativeSelect
              name="status"
              defaultValue={initialData?.status || "NEW"}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
            >
              {statuses.map((st) => (
                <option key={st} value={st}>
                  {st.replace("_", " ")}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Rating
            </label>
            <NativeSelect
              name="rating"
              defaultValue={initialData?.rating || "Warm"}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
            >
              {ratings.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Industry Segment
            </label>
            <CrmInput
              type="text"
              name="industry"
              defaultValue={initialData?.industry || ""}
              placeholder="e.g. Shipping / Logistics"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Annual Revenue (INR)
            </label>
            <CrmInput
              type="number"
              name="annualRevenue"
              defaultValue={initialData?.annualRevenue || ""}
              placeholder="e.g. 5000000"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Lead Owner (HRMS Linked) *
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
        </div>
      </div>

      {/* ─── SECTION: PERISHABLE CARGO ───────────────────────────────────── */}
      <div className="space-y-4 p-5 rounded-xl bg-[var(--mnx-surface)]/45 border border-[var(--mnx-border)] mnx-crm-hover transition-all">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-mono-text uppercase tracking-wider">
              Perishable Cargo Handling
            </h4>
            <p className="text-[11px] text-mono-muted">
              Specify if this client requires temperature-controlled or
              perishable cargo shipping
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <CrmInput
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
            <div className="w-9 h-5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-mono-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-mono-soft peer-checked:after:bg-[var(--mnx-accent)] after:border-mono-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--mnx-accent)]/10 peer-checked:border-[var(--mnx-accent)]/40"></div>
          </label>
        </div>

        {/* Hidden inputs to be caught by FormData */}
        <CrmInput
          type="hidden"
          name="isPerishable"
          value={isPerishable ? "true" : "false"}
        />
        <CrmInput type="hidden" name="perishableType" value={perishableType} />
        <CrmInput type="hidden" name="tempRequired" value={tempRequired} />
        <CrmInput
          type="hidden"
          name="humidityControl"
          value={humidityControl}
        />
        <CrmInput type="hidden" name="ventilation" value={ventilation} />
        <CrmInput
          type="hidden"
          name="perishableRemarks"
          value={perishableRemarks}
        />

        {isPerishable && (
          <div className="p-4 bg-[var(--mnx-surface)]/60 rounded-lg border border-[var(--mnx-border)]/50 text-xs grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-200">
            <div>
              <span className="text-[10px] font-bold text-mono-muted uppercase tracking-wide block mb-0.5">
                Cargo Type
              </span>
              <span className="text-mono-text font-medium">
                {perishableType || "Not specified"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-mono-muted uppercase tracking-wide block mb-0.5">
                Temperature Range
              </span>
              <span className="text-mono-text font-medium">
                {tempRequired || "Not specified"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-mono-muted uppercase tracking-wide block mb-0.5">
                Humidity / Vent
              </span>
              <span className="text-mono-text font-medium">
                H: {humidityControl || "N/A"} / V: {ventilation || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-mono-muted uppercase tracking-wide block mb-0.5">
                Remarks
              </span>
              <span className="text-mono-text font-medium block truncate">
                {perishableRemarks || "None"}
              </span>
            </div>
            <div className="col-span-2 md:col-span-4 flex justify-end pt-1">
              <CrmButton
                type="button"
                onClick={() => setShowPerishablesDialog(true)}
                className="px-3 py-1 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] border border-[var(--mnx-border)] text-[var(--mnx-accent)] rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Edit Perishable Info
              </CrmButton>
            </div>
          </div>
        )}
      </div>

      {showPerishablesDialog && (
        <CrmDialogLayer
          open={showPerishablesDialog}
          onClose={() => setShowPerishablesDialog(false)}
          size="default"
          labelledBy="perishable-cargo-title"
        >
          <div className="w-full max-w-md bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--mnx-border)]/50 bg-[var(--mnx-surface)]">
              <span
                id="perishable-cargo-title"
                className="font-bold text-xs text-mono-text uppercase tracking-wider"
              >
                Perishable Cargo Specification
              </span>
              <CrmButton
                type="button"
                onClick={() => setShowPerishablesDialog(false)}
                className="p-1 hover:bg-mono-soft rounded text-mono-muted hover:text-mono-text cursor-pointer"
              >
                <X className="size-4" />
              </CrmButton>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                  Cargo Type (e.g. Fresh Fruits, Seafood, Vaccines)
                </label>
                <CrmInput
                  type="text"
                  placeholder="e.g. Chilled Blueberries"
                  value={perishableType}
                  onChange={(e) => setPerishableType(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/40 rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                    Required Temp (°C)
                  </label>
                  <CrmInput
                    type="text"
                    placeholder="e.g. 2°C to 4°C"
                    value={tempRequired}
                    onChange={(e) => setTempRequired(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/40 rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                    Humidity (%)
                  </label>
                  <CrmInput
                    type="text"
                    placeholder="e.g. 85%"
                    value={humidityControl}
                    onChange={(e) => setHumidityControl(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/40 rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                    Ventilation
                  </label>
                  <CrmInput
                    type="text"
                    placeholder="e.g. 25 cbm/h"
                    value={ventilation}
                    onChange={(e) => setVentilation(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/40 rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                  Special Remarks & Instructions
                </label>
                <CrmTextarea
                  rows={3}
                  placeholder="Provide remarks regarding temperature logging, reefer power connection, or pre-cooling needs..."
                  value={perishableRemarks}
                  onChange={(e) => setPerishableRemarks(e.target.value)}
                  className="w-full p-2.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)] placeholder:text-mono-muted resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 bg-[var(--mnx-surface)] border-t border-[var(--mnx-border)]/30">
              <CrmButton
                type="button"
                onClick={() => {
                  setShowPerishablesDialog(false);
                }}
                className="px-4 py-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-mono-text rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Save Details
              </CrmButton>
            </div>
          </div>
        </CrmDialogLayer>
      )}

      {/* ─── SECTION: ADDRESS ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-mono-text uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
          <MapPin className="size-4 text-[var(--mnx-accent)]" />
          <span>Address Details</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Street Address
            </label>
            <CrmInput
              type="text"
              name="address"
              defaultValue={initialData?.address || ""}
              placeholder="e.g. 14 East Coast Road, Thiruvanmiyur"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              City
            </label>
            <CrmInput
              type="text"
              name="city"
              defaultValue={initialData?.city || ""}
              placeholder="e.g. Chennai"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              State
            </label>
            <CrmInput
              type="text"
              name="state"
              defaultValue={initialData?.state || ""}
              placeholder="e.g. Tamil Nadu"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Pincode
            </label>
            <CrmInput
              type="text"
              name="pincode"
              defaultValue={initialData?.pincode || ""}
              placeholder="e.g. 600041"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Country
            </label>
            <CrmInput
              type="text"
              name="country"
              defaultValue={initialData?.country || ""}
              placeholder="e.g. India"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
              Comma-separated Tags
            </label>
            <CrmInput
              type="text"
              name="tags"
              defaultValue={initialData?.tags?.join(", ") || ""}
              placeholder="e.g. VIP, Customs Clearance, CHA"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-mono-muted uppercase tracking-wide mb-1.5">
          Enquiry / Description
        </label>
        <CrmTextarea
          name="description"
          defaultValue={initialData?.description || ""}
          placeholder="Enter details of customer enquiry, freight needs, or meeting notes..."
          rows={4}
          className="w-full p-3.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3.5 pt-4 border-t border-[var(--mnx-border)]/30">
        <CrmButton
          type="button"
          onClick={handleFillDemo}
          className="px-5 py-2 bg-[var(--mnx-accent)]/10 hover:bg-[var(--mnx-accent)]/20 border border-[var(--mnx-accent)]/35 text-[var(--mnx-accent)] rounded-lg text-sm font-semibold cursor-pointer"
        >
          Fill Demo Data
        </CrmButton>
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
            {isSubmitting ? "Saving..." : isEdit ? "Update Lead" : "Save Lead"}
          </span>
        </CrmButton>
      </div>
    </form>
  );
}

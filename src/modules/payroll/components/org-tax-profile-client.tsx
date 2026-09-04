"use client";

import * as React from "react";
import { toast } from "@/modules/notifications/client";
import { Button } from "@/components/ui/button";
import { PeopleControlInput } from "@/modules/people/components";
import { savePayrollOrgTaxProfileAction } from "@/modules/payroll/org-tax-profile-actions";

export function OrgTaxProfileClient({
  initial,
}: {
  initial: {
    pan: string;
    tan: string;
    tdsCircleAoCode: string;
    taxPaymentFrequency: string;
    deductorType: "EMPLOYEE" | "NON_EMPLOYEE";
    deductorName: string;
    deductorFatherName: string;
  };
}) {
  const [form, setForm] = React.useState(initial);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await savePayrollOrgTaxProfileAction(form);
      if (!response.ok) toast.error(response.error);
      else toast.success("Tax details saved");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">PAN*</span>
          <PeopleControlInput
            value={form.pan}
            onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value.toUpperCase() }))}
            placeholder="AAAAA0000A"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">TAN</span>
          <PeopleControlInput value={form.tan} onChange={(e) => setForm((f) => ({ ...f, tan: e.target.value.toUpperCase() }))} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">TDS circle / AO code</span>
          <PeopleControlInput value={form.tdsCircleAoCode} onChange={(e) => setForm((f) => ({ ...f, tdsCircleAoCode: e.target.value }))} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">Tax payment frequency</span>
          <PeopleControlInput value={form.taxPaymentFrequency} onChange={(e) => setForm((f) => ({ ...f, taxPaymentFrequency: e.target.value }))} placeholder="e.g. Monthly" />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-[var(--mnx-text)]">Deductor&apos;s Type</legend>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            {/* eslint-disable-next-line no-restricted-syntax -- native radio group, not a text field */}
            <input
              type="radio"
              checked={form.deductorType === "EMPLOYEE"}
              onChange={() => setForm((f) => ({ ...f, deductorType: "EMPLOYEE" }))}
            />
            Employee
          </label>
          <label className="flex items-center gap-2">
            {/* eslint-disable-next-line no-restricted-syntax -- native radio group, not a text field */}
            <input
              type="radio"
              checked={form.deductorType === "NON_EMPLOYEE"}
              onChange={() => setForm((f) => ({ ...f, deductorType: "NON_EMPLOYEE" }))}
            />
            Non-Employee
          </label>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">Deductor&apos;s Name</span>
          <PeopleControlInput value={form.deductorName} onChange={(e) => setForm((f) => ({ ...f, deductorName: e.target.value }))} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">Deductor&apos;s Father&apos;s Name</span>
          <PeopleControlInput value={form.deductorFatherName} onChange={(e) => setForm((f) => ({ ...f, deductorFatherName: e.target.value }))} />
        </label>
      </div>

      <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
        {isSaving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

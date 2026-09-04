"use client";

import * as React from "react";
import { toast } from "@/modules/notifications/client";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { PeopleControlInput } from "@/modules/people/components";
import { saveEpfConfigAction } from "@/modules/payroll/statutory-epf-actions";

export type EpfConfigValue = {
  enabled: boolean;
  epfNumber: string | null;
  deductionCycle: string;
  employeeContributionPercent: number;
  employerContributionPercent: number;
  restrictToWageCeiling: boolean;
  wageCeiling: number;
  includeEmployerPfInCtc: boolean;
  includeEdliInCtc: boolean;
  includeAdminChargesInCtc: boolean;
  allowEmployeeOverride: boolean;
  prorateRestrictedWage: boolean;
  considerLopForApplicability: boolean;
  eligibleForAbry: boolean;
};

function BoolField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      {/* eslint-disable-next-line no-restricted-syntax -- boolean toggle, not a text field */}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function EpfConfigClient({ initial }: { initial: EpfConfigValue }) {
  const [form, setForm] = React.useState({ ...initial, epfNumber: initial.epfNumber ?? "" });
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await saveEpfConfigAction(form);
      if (!response.ok) toast.error(response.error);
      else toast.success("EPF configuration saved");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <BoolField label="Enable EPF" checked={form.enabled} onChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">EPF Number</span>
          <PeopleControlInput value={form.epfNumber} onChange={(e) => setForm((f) => ({ ...f, epfNumber: e.target.value }))} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">Deduction Cycle</span>
          <NativeSelect value={form.deductionCycle} onChange={(e) => setForm((f) => ({ ...f, deductionCycle: e.target.value }))}>
            <option value="MONTHLY">Monthly</option>
          </NativeSelect>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">Employee Contribution Rate (%)</span>
          <PeopleControlInput
            type="number"
            value={String(form.employeeContributionPercent)}
            onChange={(e) => setForm((f) => ({ ...f, employeeContributionPercent: Number(e.target.value) || 0 }))}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">Employer Contribution Rate (%)</span>
          <PeopleControlInput
            type="number"
            value={String(form.employerContributionPercent)}
            onChange={(e) => setForm((f) => ({ ...f, employerContributionPercent: Number(e.target.value) || 0 }))}
          />
        </label>
      </div>

      <BoolField
        label="Restrict Contribution to PF Wage Ceiling"
        checked={form.restrictToWageCeiling}
        onChange={(v) => setForm((f) => ({ ...f, restrictToWageCeiling: v }))}
      />
      {form.restrictToWageCeiling ? (
        <label className="block max-w-xs space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">PF Wage Ceiling (₹)</span>
          <PeopleControlInput
            type="number"
            value={String(form.wageCeiling)}
            onChange={(e) => setForm((f) => ({ ...f, wageCeiling: Number(e.target.value) || 0 }))}
          />
        </label>
      ) : null}

      <div className="space-y-2">
        <span className="text-sm font-medium text-[var(--mnx-text)]">Contribution Preferences (Included in Salary Structure)</span>
        <BoolField label="Employer's PF contribution" checked={form.includeEmployerPfInCtc} onChange={(v) => setForm((f) => ({ ...f, includeEmployerPfInCtc: v }))} />
        <BoolField label="EDLI contribution" checked={form.includeEdliInCtc} onChange={(v) => setForm((f) => ({ ...f, includeEdliInCtc: v }))} />
        <BoolField label="Admin charges" checked={form.includeAdminChargesInCtc} onChange={(v) => setForm((f) => ({ ...f, includeAdminChargesInCtc: v }))} />
      </div>

      <BoolField label="Allow Employee level Override" checked={form.allowEmployeeOverride} onChange={(v) => setForm((f) => ({ ...f, allowEmployeeOverride: v }))} />
      <BoolField label="Pro-rate Restricted PF Wage" checked={form.prorateRestrictedWage} onChange={(v) => setForm((f) => ({ ...f, prorateRestrictedWage: v }))} />
      <BoolField label="Consider applicable salary components based on LOP" checked={form.considerLopForApplicability} onChange={(v) => setForm((f) => ({ ...f, considerLopForApplicability: v }))} />
      <BoolField label="Eligible for ABRY Scheme" checked={form.eligibleForAbry} onChange={(v) => setForm((f) => ({ ...f, eligibleForAbry: v }))} />

      <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
        {isSaving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

"use client";

import * as React from "react";
import { toast } from "@/modules/notifications/client";
import { Button } from "@/components/ui/button";
import { PeopleControlInput } from "@/modules/people/components";
import { saveEsiConfigAction } from "@/modules/payroll/statutory-esi-actions";

export type EsiConfigValue = {
  enabled: boolean;
  employeeContributionPercent: number;
  employerContributionPercent: number;
  wageCeiling: number;
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

export function EsiConfigClient({ initial }: { initial: EsiConfigValue }) {
  const [form, setForm] = React.useState(initial);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await saveEsiConfigAction(form);
      if (!response.ok) toast.error(response.error);
      else toast.success("ESI configuration saved");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <BoolField label="Enable ESI" checked={form.enabled} onChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
      <p className="text-xs text-[var(--mnx-muted)]">
        ESI applicability depends on employee headcount thresholds under the ESI Act — confirm your
        organisation is covered before enabling. Rates and the wage ceiling below are the standard
        national defaults; adjust only if a government notification has changed them.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
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
        <label className="block max-w-xs space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">Wage Ceiling (₹/month)</span>
          <PeopleControlInput
            type="number"
            value={String(form.wageCeiling)}
            onChange={(e) => setForm((f) => ({ ...f, wageCeiling: Number(e.target.value) || 0 }))}
          />
        </label>
      </div>
      <p className="text-xs text-[var(--mnx-muted)]">
        Employees whose monthly gross exceeds the wage ceiling are not ESI-applicable. A per-employee
        salary structure entry always overrides this calculation.
      </p>

      <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
        {isSaving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

"use client";

import * as React from "react";
import { toast } from "@/modules/notifications/client";
import { Button } from "@/components/ui/button";
import { PeopleControlInput } from "@/modules/people/components";
import { saveBonusConfigAction } from "@/modules/payroll/statutory-bonus-actions";

export type BonusConfigValue = {
  enabled: boolean;
  percent: number;
  eligibilityWageCeiling: number;
  calculationWageCeiling: number;
};

export function BonusConfigClient({ initial }: { initial: BonusConfigValue }) {
  const [form, setForm] = React.useState(initial);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await saveBonusConfigAction(form);
      if (!response.ok) toast.error(response.error);
      else toast.success("Bonus configuration saved");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        {/* eslint-disable-next-line no-restricted-syntax -- boolean toggle, not a text field */}
        <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} />
        Enable Statutory Bonus
      </label>
      <p className="text-xs text-[var(--mnx-muted)]">
        Payment of Bonus Act, 1965: minimum 8.33%, maximum 20% of the calculation wage. The actual
        percent within that range is a business decision (profitability-linked) — the statutory
        minimum/maximum bounds are enforced here, the exact figure is yours to set each year.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">Bonus Percent (8.33–20%)</span>
          <PeopleControlInput
            type="number"
            value={String(form.percent)}
            onChange={(e) => setForm((f) => ({ ...f, percent: Number(e.target.value) || 0 }))}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">Eligibility Wage Ceiling (₹/month)</span>
          <PeopleControlInput
            type="number"
            value={String(form.eligibilityWageCeiling)}
            onChange={(e) => setForm((f) => ({ ...f, eligibilityWageCeiling: Number(e.target.value) || 0 }))}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--mnx-text)]">Calculation Wage Ceiling (₹/month)</span>
          <PeopleControlInput
            type="number"
            value={String(form.calculationWageCeiling)}
            onChange={(e) => setForm((f) => ({ ...f, calculationWageCeiling: Number(e.target.value) || 0 }))}
          />
        </label>
      </div>
      <p className="text-xs text-[var(--mnx-muted)]">
        Employees whose current gross exceeds the eligibility ceiling are excluded. Bonus is calculated
        on min(basic, calculation ceiling) — a per-employee state minimum-wage floor isn&apos;t modeled;
        review the run preview before confirming.
      </p>

      <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
        {isSaving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

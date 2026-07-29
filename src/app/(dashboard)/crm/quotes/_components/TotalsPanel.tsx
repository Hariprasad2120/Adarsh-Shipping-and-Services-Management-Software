"use client";

import { CrmInput } from "@/components/monolith/crm-workspace";

import { NativeSelect } from "@/components/monolith/native-select";
import type { UseFormReturn } from "react-hook-form";
import { formatMoney } from "../_lib/quote-calculations";
import type { QuoteFormValues } from "../_lib/types";

type TotalsPanelProps = {
  form: UseFormReturn<QuoteFormValues>;
  discountAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
};

export function TotalsPanel({ form, discountAmount, cgst, sgst, igst }: TotalsPanelProps) {
  const subtotal = form.watch("subtotal");
  const total = form.watch("total");
  const roundOff = form.watch("roundOff");

  return (
    <div className="rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-5">
      <div className="space-y-4 text-[13px] text-[var(--mnx-text-strong)]">
        <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-4">
          <span>Sub Total</span>
          <span className="mnx-numeric text-right">₹ {formatMoney(subtotal)}</span>
        </div>

        {cgst > 0 && (
          <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-4 text-mono-muted text-xs">
            <span>CGST</span>
            <span className="mnx-numeric text-right">₹ {formatMoney(cgst)}</span>
          </div>
        )}

        {sgst > 0 && (
          <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-4 text-mono-muted text-xs">
            <span>SGST</span>
            <span className="mnx-numeric text-right">₹ {formatMoney(sgst)}</span>
          </div>
        )}

        {igst > 0 && (
          <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-4 text-mono-muted text-xs">
            <span>IGST</span>
            <span className="mnx-numeric text-right">₹ {formatMoney(igst)}</span>
          </div>
        )}

        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-4 gap-y-2 items-start">
          <span>Discount</span>
          <div className="min-w-0">
            <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
              <NativeSelect
                className="h-11 rounded-xl border bg-mono-card px-2 text-[12px] outline-none"
                {...form.register("discountType")}
              >
                <option value="percentage">%</option>
                <option value="amount">₹</option>
              </NativeSelect>
              <CrmInput
                type="number"
                min="0"
                step="0.01"
                className="h-11 min-w-0 rounded-xl border bg-mono-card px-3 text-right text-[12px] outline-none"
                {...form.register("discountValue", { valueAsNumber: true })}
              />
            </div>
            <div className="mt-2 text-right text-[11px] text-[var(--mnx-text-muted)]">Discount Amount: ₹ {formatMoney(discountAmount)}</div>
          </div>
        </div>

        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-4 items-center">
          <span>Adjustment</span>
          <CrmInput
            type="number"
            step="0.01"
            className="h-11 min-w-0 rounded-xl border bg-mono-card px-3 text-right text-[12px] outline-none"
            {...form.register("adjustment", { valueAsNumber: true })}
          />
        </div>

        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-4 items-center">
          <span>Round Off</span>
          <CrmInput
            type="text"
            readOnly
            value={formatMoney(roundOff ?? 0)}
            className="h-11 min-w-0 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3 text-right text-[12px] text-[var(--mnx-text-muted)] outline-none"
          />
        </div>

        <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-4 border-t border-[var(--mnx-border)] pt-4 text-[15px] font-semibold text-[var(--mnx-text-strong)]">
          <span>Total ( ₹ )</span>
          <span className="mnx-numeric text-right">₹ {formatMoney(total)}</span>
        </div>
      </div>
    </div>
  );
}

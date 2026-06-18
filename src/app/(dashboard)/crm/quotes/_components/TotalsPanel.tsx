"use client";

import type { UseFormReturn } from "react-hook-form";
import { formatMoney } from "../_lib/quote-calculations";
import type { QuoteFormValues } from "../_lib/types";

type TotalsPanelProps = {
  form: UseFormReturn<QuoteFormValues>;
  discountAmount: number;
};

export function TotalsPanel({ form, discountAmount }: TotalsPanelProps) {
  const subtotal = form.watch("subtotal");
  const total = form.watch("total");
  const roundOff = form.watch("roundOff");

  return (
    <div className="rounded-2xl border border-[#d9dee7] bg-[#fafbfd] p-5">
      <div className="space-y-4 text-[13px] text-[#374151]">
        <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-4">
          <span>Sub Total</span>
          <span className="ds-numeric text-right">₹ {formatMoney(subtotal)}</span>
        </div>

        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-4 gap-y-2 items-start">
          <span>Discount</span>
          <div className="min-w-0">
            <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
              <select
                className="h-11 rounded-xl border border-[#d9dee7] bg-white px-2 text-[12px] outline-none focus:border-[#408dfb] focus:ring-2 focus:ring-[#408dfb]/20"
                {...form.register("discountType")}
              >
                <option value="percentage">%</option>
                <option value="amount">₹</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                className="h-11 min-w-0 rounded-xl border border-[#d9dee7] bg-white px-3 text-right text-[12px] outline-none focus:border-[#408dfb] focus:ring-2 focus:ring-[#408dfb]/20"
                {...form.register("discountValue", { valueAsNumber: true })}
              />
            </div>
            <div className="mt-2 text-right text-[11px] text-[#6b7280]">Discount Amount: ₹ {formatMoney(discountAmount)}</div>
          </div>
        </div>

        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-4 items-center">
          <span>Adjustment</span>
          <input
            type="number"
            step="0.01"
            className="h-11 min-w-0 rounded-xl border border-[#d9dee7] bg-white px-3 text-right text-[12px] outline-none focus:border-[#408dfb] focus:ring-2 focus:ring-[#408dfb]/20"
            {...form.register("adjustment", { valueAsNumber: true })}
          />
        </div>

        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-4 items-center">
          <span>Round Off</span>
          <input
            type="text"
            readOnly
            value={formatMoney(roundOff ?? 0)}
            className="h-11 min-w-0 rounded-xl border border-[#d9dee7] bg-[#f3f6fb] px-3 text-right text-[12px] text-[#475569] outline-none"
          />
        </div>

        <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-4 border-t border-[#d9dee7] pt-4 text-[15px] font-semibold text-[#1f2937]">
          <span>Total ( ₹ )</span>
          <span className="ds-numeric text-right">₹ {formatMoney(total)}</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { CrmInput } from "@/modules/crm/components/workspace/crm-workspace";

import { NativeSelect } from "@/components/ui/native-select";
import type { UseFormReturn } from "react-hook-form";
import type { ReactNode } from "react";
import { formatMoney } from "@/modules/crm/components/quotes/lib/quote-calculations";
import type { QuoteFormValues } from "@/modules/crm/components/quotes/lib/types";

type TotalsPanelProps = {
  form: UseFormReturn<QuoteFormValues>;
  discountAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
};

function TotalsRow({
  label,
  children,
  muted = false,
  strong = false,
  bordered = false,
}: {
  label: string;
  children: ReactNode;
  muted?: boolean;
  strong?: boolean;
  bordered?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-4 ${
        muted ? "text-[var(--mnx-muted)] text-xs" : ""
      } ${strong ? "text-[15px] font-semibold text-[var(--mnx-text-strong)]" : ""} ${
        bordered ? "border-t border-[var(--mnx-border)] pt-4" : ""
      }`}
    >
      <span>{label}</span>
      {children}
    </div>
  );
}

export function TotalsPanel({ form, discountAmount, cgst, sgst, igst }: TotalsPanelProps) {
  const subtotal = form.watch("subtotal");
  const total = form.watch("total");
  const roundOff = form.watch("roundOff");

  return (
    <div className="rounded-2xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-5">
      <div className="space-y-4 text-[13px] text-[var(--mnx-text-strong)]">
        <TotalsRow label="Sub Total">
          <span className="mnx-numeric text-right">₹ {formatMoney(subtotal)}</span>
        </TotalsRow>

        {cgst > 0 && (
          <TotalsRow label="CGST" muted>
            <span className="mnx-numeric text-right">₹ {formatMoney(cgst)}</span>
          </TotalsRow>
        )}

        {sgst > 0 && (
          <TotalsRow label="SGST" muted>
            <span className="mnx-numeric text-right">₹ {formatMoney(sgst)}</span>
          </TotalsRow>
        )}

        {igst > 0 && (
          <TotalsRow label="IGST" muted>
            <span className="mnx-numeric text-right">₹ {formatMoney(igst)}</span>
          </TotalsRow>
        )}

        <TotalsRow label="Discount">
          <div className="flex items-center justify-end gap-3">
            <NativeSelect
              className="h-11 w-[72px] shrink-0 rounded-xl border bg-[var(--mnx-surface)] px-2 text-[12px] outline-none"
              {...form.register("discountType")}
            >
              <option value="percentage">%</option>
              <option value="amount">₹</option>
            </NativeSelect>
            <CrmInput
              type="number"
              min="0"
              step="0.01"
              className="h-11 min-w-0 flex-1 rounded-xl border bg-[var(--mnx-surface)] px-3 text-right text-[12px] outline-none"
              {...form.register("discountValue", { valueAsNumber: true })}
            />
            <span className="w-[130px] shrink-0 text-right text-[11px] text-[var(--mnx-text-muted)]">
              ₹ {formatMoney(discountAmount)}
            </span>
          </div>
        </TotalsRow>

        <TotalsRow label="Adjustment">
          <CrmInput
            type="number"
            step="0.01"
            className="h-11 min-w-0 rounded-xl border bg-[var(--mnx-surface)] px-3 text-right text-[12px] outline-none"
            {...form.register("adjustment", { valueAsNumber: true })}
          />
        </TotalsRow>

        <TotalsRow label="Round Off">
          <CrmInput
            type="text"
            readOnly
            value={formatMoney(roundOff ?? 0)}
            className="h-11 min-w-0 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3 text-right text-[12px] text-[var(--mnx-text-muted)] outline-none"
          />
        </TotalsRow>

        <TotalsRow label="Total ( ₹ )" strong bordered>
          <span className="mnx-numeric text-right">₹ {formatMoney(total)}</span>
        </TotalsRow>
      </div>
    </div>
  );
}

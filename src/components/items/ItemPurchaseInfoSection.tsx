"use client";

import React from "react";
import type { UseFormReturn } from "react-hook-form";
import type { ItemFormSchema } from "@/lib/items/validation";

const PURCHASE_ACCOUNTS = [
  "Cost of Goods Sold",
  "Freight Expense",
  "Customs Clearance Expense",
  "Agency Expense",
  "Direct Expense",
];

const inputCls =
  "w-full px-3 py-1.5 text-sm border border-[#d9dee7] rounded focus:outline-none focus:border-[#00cec4] focus:ring-1 focus:ring-[#00cec4]/20 text-[#212529] placeholder-[#6b7280] h-[34px]";

const selectCls =
  "w-full px-3 py-1.5 text-sm border border-[#d9dee7] rounded focus:outline-none focus:border-[#00cec4] text-[#212529] bg-white h-[34px]";

function FieldRow({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <label htmlFor={id} className="w-36 flex-shrink-0 text-xs font-medium text-[#212529] pt-1.5">
        {label}
      </label>
      <div className="flex-1 min-w-0">
        {children}
        {error && (
          <p className="mt-1 text-xs text-[#fe4242]" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

interface ItemPurchaseInfoSectionProps {
  form: UseFormReturn<ItemFormSchema, unknown, ItemFormSchema>;
}

export function ItemPurchaseInfoSection({ form }: ItemPurchaseInfoSectionProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const purchaseEnabled = watch("purchaseInformation");

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#212529] uppercase tracking-wide border-b border-[#d9dee7] pb-2">
        <input
          type="checkbox"
          className="rounded accent-[#00cec4]"
          {...register("purchaseInformation")}
        />
        Purchase Information
      </label>

      {purchaseEnabled && (
        <>
          <FieldRow label="Cost Price" id="item-cost-price" error={errors.costPrice?.message}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6b7280] font-medium select-none">
                ₹
              </span>
              <input
                id="item-cost-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className={`${inputCls} pl-7`}
                {...register("costPrice")}
              />
            </div>
          </FieldRow>

          <FieldRow
            label="Purchase Account"
            id="item-purchase-account"
            error={errors.purchaseAccount?.message}
          >
            <select id="item-purchase-account" className={selectCls} {...register("purchaseAccount")}>
              <option value="">— Select account —</option>
              {PURCHASE_ACCOUNTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </FieldRow>

          <FieldRow
            label="Purchase Description"
            id="item-purchase-desc"
            error={errors.purchaseDescription?.message}
          >
            <textarea
              id="item-purchase-desc"
              rows={3}
              placeholder="Add a description for purchase..."
              className="w-full px-3 py-2 text-sm border border-[#d9dee7] rounded focus:outline-none focus:border-[#00cec4] focus:ring-1 focus:ring-[#00cec4]/20 text-[#212529] placeholder-[#6b7280] resize-none"
              {...register("purchaseDescription")}
            />
          </FieldRow>
        </>
      )}
    </div>
  );
}

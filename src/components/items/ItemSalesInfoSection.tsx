"use client";

import React from "react";
import type { UseFormReturn } from "react-hook-form";
import type { ItemFormSchema } from "@/lib/items/validation";

const SALES_ACCOUNTS = [
  "Sales",
  "Service Revenue",
  "Freight Income",
  "Customs Clearance Income",
  "Agency Income",
];

const inputCls =
  "w-full px-3 py-1.5 text-sm border border-[#d9dee7] rounded focus:outline-none focus:border-[#00cec4] focus:ring-1 focus:ring-[#00cec4]/20 text-[#212529] placeholder-[#6b7280] h-[34px]";

const selectCls =
  "w-full px-3 py-1.5 text-sm border border-[#d9dee7] rounded focus:outline-none focus:border-[#00cec4] text-[#212529] bg-white h-[34px]";

interface FieldRowProps {
  label: string;
  required?: boolean;
  id: string;
  error?: string;
  children: React.ReactNode;
}

function FieldRow({ label, required, id, error, children }: FieldRowProps) {
  return (
    <div className="flex items-start gap-4">
      <label htmlFor={id} className="w-36 flex-shrink-0 text-xs font-medium text-[#212529] pt-1.5">
        {label}
        {required && <span className="text-[#fe4242]"> *</span>}
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

interface ItemSalesInfoSectionProps {
  form: UseFormReturn<ItemFormSchema, unknown, ItemFormSchema>;
}

export function ItemSalesInfoSection({ form }: ItemSalesInfoSectionProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-[#212529] uppercase tracking-wide border-b border-[#d9dee7] pb-2">
        Sales Information
      </h3>

      <FieldRow label="Selling Price" id="item-selling-price" error={errors.sellingPrice?.message}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6b7280] font-medium select-none">
            ₹
          </span>
          <input
            id="item-selling-price"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className={`${inputCls} pl-7`}
            {...register("sellingPrice")}
          />
        </div>
      </FieldRow>

      <FieldRow
        label="Sales Account"
        required
        id="item-sales-account"
        error={errors.salesAccount?.message}
      >
        <select id="item-sales-account" className={selectCls} {...register("salesAccount")}>
          <option value="">— Select account —</option>
          {SALES_ACCOUNTS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </FieldRow>

      <FieldRow label="Description" id="item-sales-desc" error={errors.salesDescription?.message}>
        <textarea
          id="item-sales-desc"
          rows={3}
          placeholder="Add a description for sales..."
          className="w-full px-3 py-2 text-sm border border-[#d9dee7] rounded focus:outline-none focus:border-[#00cec4] focus:ring-1 focus:ring-[#00cec4]/20 text-[#212529] placeholder-[#6b7280] resize-none"
          {...register("salesDescription")}
        />
      </FieldRow>
    </div>
  );
}

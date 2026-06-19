"use client";

import React from "react";
import { HelpCircle, Search } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { ItemFormSchema } from "@/lib/items/validation";

const UNITS = ["PCS", "KG", "TON", "CBM", "Container", "Shipment", "Hour", "Day", "Package"];

const GST_RATES = ["GST 0%", "GST 5%", "GST 12%", "GST 18%", "IGST 18%"];

const EXEMPTION_REASONS = ["Out of Scope", "Exempt Supply", "Nil Rated", "Non-GST Supply"];

interface ItemPrimaryInfoSectionProps {
  form: UseFormReturn<ItemFormSchema, unknown, ItemFormSchema>;
}

function FieldRow({
  label,
  required,
  help,
  children,
  error,
  id,
}: {
  label: string;
  required?: boolean;
  help?: boolean;
  children: React.ReactNode;
  error?: string;
  id: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <label
        htmlFor={id}
        className="w-36 flex-shrink-0 text-xs font-medium text-[#212529] pt-1.5 flex items-center gap-1"
      >
        {label}
        {required && <span className="text-[#fe4242]">*</span>}
        {help && <HelpCircle size={11} className="text-[#6b7280]" />}
      </label>
      <div className="flex-1 min-w-0">
        {children}
        {error && (
          <p id={`${id}-error`} className="mt-1 text-xs text-[#fe4242]" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-1.5 text-sm border border-[#d9dee7] rounded focus:outline-none focus:border-[#00cec4] focus:ring-1 focus:ring-[#00cec4]/20 text-[#212529] placeholder-[#6b7280] h-[34px]";

const selectCls =
  "w-full px-3 py-1.5 text-sm border border-[#d9dee7] rounded focus:outline-none focus:border-[#00cec4] text-[#212529] bg-white h-[34px]";

export function ItemPrimaryInfoSection({ form }: ItemPrimaryInfoSectionProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const taxPreference = watch("taxPreference");

  return (
    <div className="space-y-4">
      <FieldRow label="Name" required id="item-name" error={errors.name?.message}>
        <input
          id="item-name"
          type="text"
          autoFocus
          placeholder="Enter item name"
          aria-describedby={errors.name ? "item-name-error" : undefined}
          aria-invalid={!!errors.name}
          className={inputCls}
          {...register("name")}
        />
      </FieldRow>

      <FieldRow label="Type" required id="item-type" help error={errors.type?.message}>
        <div id="item-type" role="group" aria-label="Item type" className="flex items-center gap-6 pt-1.5">
          {(["Goods", "Service"] as const).map((t) => (
            <label key={t} className="flex items-center gap-1.5 cursor-pointer text-sm text-[#212529]">
              <input
                type="radio"
                value={t}
                className="accent-[#00cec4]"
                {...register("type")}
              />
              {t}
            </label>
          ))}
        </div>
      </FieldRow>

      <FieldRow label="Unit" id="item-unit" help error={errors.unit?.message}>
        <select id="item-unit" className={selectCls} {...register("unit")}>
          <option value="">— Select unit —</option>
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </FieldRow>

      <FieldRow label="SKU" id="item-sku" help error={errors.sku?.message}>
        <input
          id="item-sku"
          type="text"
          placeholder="Enter SKU"
          className={inputCls}
          {...register("sku")}
        />
      </FieldRow>

      <FieldRow label="HSN/SAC Code" id="item-hsn" error={errors.hsnSac?.message}>
        <div className="flex gap-2">
          <input
            id="item-hsn"
            type="text"
            placeholder="Search or enter HSN/SAC"
            className={`${inputCls} flex-1`}
            {...register("hsnSac")}
          />
          <button
            type="button"
            className="flex-shrink-0 w-[34px] h-[34px] flex items-center justify-center border border-[#d9dee7] rounded hover:bg-[#f3f5f8] text-[#6b7280] hover:text-[#212529] transition-colors"
            aria-label="Search HSN/SAC codes"
          >
            <Search size={14} />
          </button>
        </div>
      </FieldRow>

      <FieldRow
        label="Tax Preference"
        required
        id="item-tax-pref"
        error={errors.taxPreference?.message}
      >
        <div id="item-tax-pref" role="group" aria-label="Tax preference" className="flex items-center gap-6 pt-1.5">
          {(["Taxable", "Non-Taxable"] as const).map((t) => (
            <label key={t} className="flex items-center gap-1.5 cursor-pointer text-sm text-[#212529]">
              <input
                type="radio"
                value={t}
                className="accent-[#00cec4]"
                {...register("taxPreference")}
              />
              {t}
            </label>
          ))}
        </div>
      </FieldRow>

      {taxPreference === "Taxable" && (
        <FieldRow label="Tax Rate" id="item-tax-rate" error={errors.taxRate?.message}>
          <select id="item-tax-rate" className={selectCls} {...register("taxRate")}>
            <option value="">— Select GST rate —</option>
            {GST_RATES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </FieldRow>
      )}

      {taxPreference === "Non-Taxable" && (
        <FieldRow label="Exemption Reason" id="item-exemption" error={errors.exemptionReason?.message}>
          <select id="item-exemption" className={selectCls} {...register("exemptionReason")}>
            <option value="">— Select reason —</option>
            {EXEMPTION_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </FieldRow>
      )}
    </div>
  );
}

"use client";

import { CrmButton, CrmInput } from "@/components/monolith/crm-workspace";

import { NativeSelect } from "@/components/monolith/native-select";
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
        className="w-36 flex-shrink-0 text-xs font-medium text-[var(--mnx-text-strong)] pt-1.5 flex items-center gap-1"
      >
        {label}
        {required && <span className="text-[var(--mnx-danger)]">*</span>}
        {help && <HelpCircle size={11} className="text-[var(--mnx-text-muted)]" />}
      </label>
      <div className="flex-1 min-w-0">
        {children}
        {error && (
          <p id={`${id}-error`} className="mt-1 text-xs text-[var(--mnx-danger)]" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-1.5 text-sm border border-[var(--mnx-border)] rounded focus:outline-none focus:border-[var(--mnx-accent)] focus:ring-1 focus:ring-[var(--mnx-accent)]/20 text-[var(--mnx-text-strong)] placeholder-[var(--mnx-text-muted)] h-[34px]";

const selectCls =
  "w-full px-3 py-1.5 text-sm border border-[var(--mnx-border)] rounded focus:outline-none focus:border-[var(--mnx-accent)] text-[var(--mnx-text-strong)] bg-mono-card h-[34px]";

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
        <CrmInput
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
            <label key={t} className="flex items-center gap-1.5 cursor-pointer text-sm text-[var(--mnx-text-strong)]">
              <CrmInput
                type="radio"
                value={t}
                className="accent-[var(--mnx-accent)]"
                {...register("type")}
              />
              {t}
            </label>
          ))}
        </div>
      </FieldRow>

      <FieldRow label="Unit" id="item-unit" help error={errors.unit?.message}>
        <NativeSelect id="item-unit" className={selectCls} {...register("unit")}>
          <option value="">— Select unit —</option>
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </NativeSelect>
      </FieldRow>

      <FieldRow label="SKU" id="item-sku" help error={errors.sku?.message}>
        <CrmInput
          id="item-sku"
          type="text"
          placeholder="Enter SKU"
          className={inputCls}
          {...register("sku")}
        />
      </FieldRow>

      <FieldRow label="HSN/SAC Code" id="item-hsn" error={errors.hsnSac?.message}>
        <div className="flex gap-2">
          <CrmInput
            id="item-hsn"
            type="text"
            placeholder="Search or enter HSN/SAC"
            className={`${inputCls} flex-1`}
            {...register("hsnSac")}
          />
          <CrmButton
            type="button"
            className="flex-shrink-0 w-[34px] h-[34px] flex items-center justify-center border border-[var(--mnx-border)] rounded hover:bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)] hover:text-[var(--mnx-text-strong)] transition-colors"
            aria-label="Search HSN/SAC codes"
          >
            <Search size={14} />
          </CrmButton>
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
            <label key={t} className="flex items-center gap-1.5 cursor-pointer text-sm text-[var(--mnx-text-strong)]">
              <CrmInput
                type="radio"
                value={t}
                className="accent-[var(--mnx-accent)]"
                {...register("taxPreference")}
              />
              {t}
            </label>
          ))}
        </div>
      </FieldRow>

      {taxPreference === "Taxable" && (
        <FieldRow label="Tax Rate" id="item-tax-rate" error={errors.taxRate?.message}>
          <NativeSelect id="item-tax-rate" className={selectCls} {...register("taxRate")}>
            <option value="">— Select GST rate —</option>
            {GST_RATES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </NativeSelect>
        </FieldRow>
      )}

      {taxPreference === "Non-Taxable" && (
        <FieldRow label="Exemption Reason" id="item-exemption" error={errors.exemptionReason?.message}>
          <NativeSelect id="item-exemption" className={selectCls} {...register("exemptionReason")}>
            <option value="">— Select reason —</option>
            {EXEMPTION_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </NativeSelect>
        </FieldRow>
      )}
    </div>
  );
}

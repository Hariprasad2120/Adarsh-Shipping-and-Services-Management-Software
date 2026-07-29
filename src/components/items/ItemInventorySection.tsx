"use client";

import { CrmInput } from "@/components/monolith/crm-workspace";

import React from "react";
import type { UseFormReturn } from "react-hook-form";
import type { ItemFormSchema } from "@/lib/items/validation";

const inputCls =
  "w-full px-3 py-1.5 text-sm border border-[var(--mnx-border)] rounded focus:outline-none focus:border-[var(--mnx-accent)] focus:ring-1 focus:ring-[var(--mnx-accent)]/20 text-[var(--mnx-text-strong)] placeholder-[var(--mnx-text-muted)] h-[34px] disabled:bg-[var(--mnx-surface)] disabled:cursor-not-allowed disabled:text-[var(--mnx-text-muted)]";

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
      <label htmlFor={id} className="w-36 flex-shrink-0 text-xs font-medium text-[var(--mnx-text-strong)] pt-1.5">
        {label}
      </label>
      <div className="flex-1 min-w-0">
        {children}
        {error && (
          <p className="mt-1 text-xs text-[var(--mnx-danger)]" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

interface ItemInventorySectionProps {
  form: UseFormReturn<ItemFormSchema, unknown, ItemFormSchema>;
}

export function ItemInventorySection({ form }: ItemInventorySectionProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const inventoryEnabled = watch("inventoryTracking");

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-[var(--mnx-text-strong)] uppercase tracking-wide border-b border-[var(--mnx-border)] pb-2">
        Inventory
      </h3>

      {/* Inventory toggle — disabled */}
      <div className="flex items-start gap-4">
        <span className="w-36 flex-shrink-0 text-xs font-medium text-[var(--mnx-text-strong)] pt-1">
          Inventory Tracking
        </span>
        <div className="flex-1">
          <label className="flex items-center gap-2 cursor-not-allowed opacity-50">
            <CrmInput
              type="checkbox"
              disabled
              className="rounded accent-[var(--mnx-accent)]"
              {...register("inventoryTracking")}
            />
            <span className="text-xs text-[var(--mnx-text-muted)]">Enable inventory tracking</span>
          </label>
          <p className="mt-1 text-xs text-[var(--mnx-text-muted)]">
            Inventory is disabled. Enable inventory from item preferences to track stock.
          </p>
        </div>
      </div>

      <FieldRow label="Opening Stock" id="item-opening-stock" error={errors.openingStock?.message}>
        <CrmInput
          id="item-opening-stock"
          type="number"
          min="0"
          placeholder="0"
          disabled={!inventoryEnabled}
          className={inputCls}
          {...register("openingStock")}
        />
      </FieldRow>

      <FieldRow label="Reorder Point" id="item-reorder" error={errors.reorderPoint?.message}>
        <CrmInput
          id="item-reorder"
          type="number"
          min="0"
          placeholder="0"
          disabled={!inventoryEnabled}
          className={inputCls}
          {...register("reorderPoint")}
        />
      </FieldRow>
    </div>
  );
}

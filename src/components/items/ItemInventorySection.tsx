"use client";

import React from "react";
import type { UseFormReturn } from "react-hook-form";
import type { ItemFormSchema } from "@/lib/items/validation";

const inputCls =
  "w-full px-3 py-1.5 text-sm border border-[#d9dee7] rounded focus:outline-none focus:border-[#00cec4] focus:ring-1 focus:ring-[#00cec4]/20 text-[#212529] placeholder-[#6b7280] h-[34px] disabled:bg-[#f3f5f8] disabled:cursor-not-allowed disabled:text-[#6b7280]";

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
      <h3 className="text-xs font-semibold text-[#212529] uppercase tracking-wide border-b border-[#d9dee7] pb-2">
        Inventory
      </h3>

      {/* Inventory toggle — disabled */}
      <div className="flex items-start gap-4">
        <span className="w-36 flex-shrink-0 text-xs font-medium text-[#212529] pt-1">
          Inventory Tracking
        </span>
        <div className="flex-1">
          <label className="flex items-center gap-2 cursor-not-allowed opacity-50">
            <input
              type="checkbox"
              disabled
              className="rounded accent-[#00cec4]"
              {...register("inventoryTracking")}
            />
            <span className="text-xs text-[#6b7280]">Enable inventory tracking</span>
          </label>
          <p className="mt-1 text-xs text-[#6b7280]">
            Inventory is disabled. Enable inventory from item preferences to track stock.
          </p>
        </div>
      </div>

      <FieldRow label="Opening Stock" id="item-opening-stock" error={errors.openingStock?.message}>
        <input
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
        <input
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

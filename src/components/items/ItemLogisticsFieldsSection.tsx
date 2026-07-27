"use client";

import { NativeSelect } from "@/components/ui/native-select";
import React from "react";
import type { UseFormReturn } from "react-hook-form";
import type { ItemFormSchema } from "@/lib/items/validation";

const CHARGE_CATEGORIES = [
  "Freight",
  "Customs",
  "Port Charges",
  "Documentation",
  "Transportation",
  "Handling",
  "Agency",
  "Other",
];

const APPLICABLE_FOR = [
  "Import",
  "Export",
  "Domestic",
  "Air",
  "Sea",
  "Both Import & Export",
];

const CONTAINER_TYPES = ["20FT", "40FT", "40HQ", "LCL", "Air Cargo", "Not Applicable"];

const selectCls =
  "w-full px-3 py-1.5 text-sm border border-[#d9dee7] rounded focus:outline-none focus:border-[#00cec4] text-[#212529] bg-white h-[34px]";

function FieldRow({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <label htmlFor={id} className="w-36 flex-shrink-0 text-xs font-medium text-[#212529]">
        {label}
      </label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

interface ItemLogisticsFieldsSectionProps {
  form: UseFormReturn<ItemFormSchema, unknown, ItemFormSchema>;
}

export function ItemLogisticsFieldsSection({ form }: ItemLogisticsFieldsSectionProps) {
  const { register } = form;

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-[#212529] uppercase tracking-wide border-b border-[#d9dee7] pb-2">
        Logistics Classification
      </h3>

      <FieldRow label="Charge Category" id="item-charge-category">
        <NativeSelect id="item-charge-category" className={selectCls} {...register("chargeCategory")}>
          <option value="">— Select category —</option>
          {CHARGE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
      </FieldRow>

      <FieldRow label="Applicable For" id="item-applicable-for">
        <NativeSelect id="item-applicable-for" className={selectCls} {...register("applicableFor")}>
          <option value="">— Select —</option>
          {APPLICABLE_FOR.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </NativeSelect>
      </FieldRow>

      <FieldRow label="Container Type" id="item-container-type">
        <NativeSelect id="item-container-type" className={selectCls} {...register("defaultContainerType")}>
          <option value="">— Select —</option>
          {CONTAINER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </NativeSelect>
      </FieldRow>
    </div>
  );
}

"use client";

import type { UseFormReturn } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { GripVertical, ImagePlus, MoreHorizontal, Plus, Trash2, ChevronDown } from "lucide-react";
import { createEmptyLineItem, taxes, tdsOptions, units } from "../_lib/mock-data";
import { formatMoney } from "../_lib/quote-calculations";
import type { QuoteFormValues } from "../_lib/types";
import { Button } from "@/components/ui/button";
import { ItemAutocomplete } from "./ItemAutocomplete";

type LineItemsTableProps = {
  form: UseFormReturn<QuoteFormValues>;
};

export function LineItemRow({
  index,
  remove,
  canRemove,
  form,
}: {
  index: number;
  remove: (index: number) => void;
  canRemove: boolean;
  form: UseFormReturn<QuoteFormValues>;
}) {
  const errors = form.formState.errors.lineItems?.[index];
  const amount = form.watch(`lineItems.${index}.amount`);
  const description = form.watch(`lineItems.${index}.description`) ?? "";

  return (
    <tr className="border-b border-[#eef2f6] align-top">
      <td className="w-10 px-2 py-3 text-[#9ca3af]">
        <GripVertical className="size-4" />
      </td>
      <td className="min-w-[280px] px-2 py-2">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-md border border-[#d9dee7] bg-[#f8fafc] text-[#9ca3af]">
            <ImagePlus className="size-4" />
          </div>
          <ItemAutocomplete
            value={description}
            onChange={(name) => form.setValue(`lineItems.${index}.description`, name)}
            onSelectItem={(item) => {
              form.setValue(`lineItems.${index}.description`, item.name);
              if (item.rate > 0) {
                form.setValue(`lineItems.${index}.rate`, item.rate);
                // Recalculate amount
                const qty = form.getValues(`lineItems.${index}.quantity`);
                form.setValue(`lineItems.${index}.amount`, (qty ?? 0) * item.rate);
              }
              if (item.usageUnit && (units as readonly string[]).includes(item.usageUnit)) {
                form.setValue(`lineItems.${index}.unit`, item.usageUnit as typeof units[number]);
              }
            }}
            error={errors?.description?.message}
          />
        </div>
      </td>
      <td className="min-w-[110px] px-2 py-2">
        <select
          className="h-9 w-full rounded-xl border bg-white px-2 text-[12px] text-[#1f2937] outline-none"
          {...form.register(`lineItems.${index}.unit`)}
        >
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </td>
      <td className="min-w-[110px] px-2 py-2">
        <input
          type="number"
          min="0"
          step="0.01"
          className="h-9 w-full rounded-xl border bg-white px-3 text-right text-[12px] text-[#1f2937] outline-none"
          {...form.register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
        />
        {errors?.quantity ? <p className="mt-1 text-[11px] text-[#fe4242]">{errors.quantity.message}</p> : null}
      </td>
      <td className="min-w-[110px] px-2 py-2">
        <input
          type="number"
          min="0"
          step="0.01"
          className="h-9 w-full rounded-xl border bg-white px-3 text-right text-[12px] text-[#1f2937] outline-none"
          {...form.register(`lineItems.${index}.rate`, { valueAsNumber: true })}
        />
        {errors?.rate ? <p className="mt-1 text-[11px] text-[#fe4242]">{errors.rate.message}</p> : null}
      </td>
      <td className="min-w-[130px] px-2 py-2">
        <select
          className="h-9 w-full rounded-xl border bg-white px-2 text-[12px] text-[#1f2937] outline-none"
          {...form.register(`lineItems.${index}.tax`)}
        >
          <option value="">Select a Tax</option>
          {taxes.map((tax) => (
            <option key={tax} value={tax}>
              {tax}
            </option>
          ))}
        </select>
      </td>
      <td className="min-w-[130px] px-2 py-2">
        <select
          className="h-9 w-full rounded-xl border bg-white px-2 text-[12px] text-[#1f2937] outline-none"
          {...form.register(`lineItems.${index}.tds`)}
        >
          {tdsOptions.map((tds) => (
            <option key={tds} value={tds}>
              {tds}
            </option>
          ))}
        </select>
      </td>
      <td className="min-w-[120px] px-2 py-3 text-right text-[13px] font-medium text-[#1f2937]">₹ {formatMoney(amount ?? 0)}</td>
      <td className="min-w-[90px] px-2 py-3">
        <div className="flex items-center justify-end gap-2">
          <button type="button" className="rounded p-1 text-[#6b7280] hover:bg-[#f3f4f6]" aria-label="Row actions">
            <MoreHorizontal className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => remove(index)}
            disabled={!canRemove}
            className="rounded p-1 text-[#fe4242] hover:bg-[#fff1f1] disabled:cursor-not-allowed disabled:text-[#cbd5e1]"
            aria-label="Remove row"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function LineItemsTable({ form }: LineItemsTableProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
    keyName: "fieldId",
  });

  return (
    <section className="border-b border-[#d9dee7] px-5 py-5">
      <div className="flex items-center justify-between border border-[#d9dee7] bg-[#f6f8fb] px-4 py-2">
        <h2 className="text-[13px] font-semibold text-[#374151]">Item Table</h2>
        <button type="button" className="inline-flex items-center gap-1 text-[12px] font-medium text-[#374151]">
          <span>Bulk Actions</span>
          <ChevronDown className="size-4" />
        </button>
      </div>

      <div className="overflow-x-auto border-x border-b border-[#d9dee7]">
        <table className="min-w-[1120px] w-full bg-white">
          <thead className="bg-[#fbfcfd] text-left text-[11px] uppercase tracking-[0.08em] text-[#6b7280]">
            <tr>
              <th className="w-10 px-2 py-3"></th>
              <th className="min-w-[280px] px-2 py-3">Item Details</th>
              <th className="min-w-[110px] px-2 py-3">Unit</th>
              <th className="min-w-[110px] px-2 py-3 text-right">Quantity</th>
              <th className="min-w-[110px] px-2 py-3 text-right">Rate</th>
              <th className="min-w-[130px] px-2 py-3">Tax</th>
              <th className="min-w-[130px] px-2 py-3">TDS</th>
              <th className="min-w-[120px] px-2 py-3 text-right">Amount</th>
              <th className="min-w-[90px] px-2 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <LineItemRow
                key={field.fieldId}
                index={index}
                remove={remove}
                canRemove={fields.length > 1}
                form={form}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="h-9 border-[rgba(0,206,196,0.4)] bg-[#00cec4]/10 px-3 text-[12px] text-[#00cec4] hover:bg-[#00cec4]/15"
          onClick={() => append(createEmptyLineItem())}
        >
          <Plus className="mr-1 size-4" />
          Add New Row
          <ChevronDown className="ml-2 size-4" />
        </Button>
        <Button
          variant="outline"
          className="h-9 border-[rgba(0,206,196,0.4)] bg-white px-3 text-[12px] text-[#00cec4] hover:bg-[#00cec4]/10"
          onClick={() => append(createEmptyLineItem())}
        >
          <Plus className="mr-1 size-4" />
          Add Items in Bulk
        </Button>
      </div>
    </section>
  );
}

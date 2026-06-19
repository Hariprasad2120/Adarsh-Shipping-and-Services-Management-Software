"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { GripVertical, ImagePlus, Plus, Trash2 } from "lucide-react";
import { createEmptyLineItem, taxes, tdsOptions, units } from "../_lib/mock-data";
import { formatMoney } from "../_lib/quote-calculations";
import type { QuoteFormValues } from "../_lib/types";
import { Button } from "@/components/ui/button";
import { ItemAutocomplete } from "./ItemAutocomplete";
import { getCurrencies } from "@/lib/items/currency-store";
import { getAllItems } from "@/lib/items/item-store";

type LineItemsTableProps = {
  form: UseFormReturn<QuoteFormValues>;
};

type RowImageMap = Record<string, string | undefined>;

function resolveHsn(description: string, fallback?: string) {
  const matchedItem = getAllItems().find((item) => item.name.toLowerCase() === description.trim().toLowerCase());
  return matchedItem?.hsnSac || fallback || "";
}

export function LineItemRow({
  index,
  rowKey,
  remove,
  canRemove,
  form,
  onImageChange,
  imagePreview,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragTarget,
}: {
  index: number;
  rowKey: string;
  remove: (index: number) => void;
  canRemove: boolean;
  form: UseFormReturn<QuoteFormValues>;
  onImageChange: (rowKey: string, event: ChangeEvent<HTMLInputElement>) => void;
  imagePreview?: string;
  onDragStart: (index: number) => void;
  onDragOver: (index: number, event: React.DragEvent<HTMLTableRowElement>) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  isDragTarget: boolean;
}) {
  const errors = form.formState.errors.lineItems?.[index];
  const amount = form.watch(`lineItems.${index}.amount`);
  const description = form.watch(`lineItems.${index}.description`) ?? "";
  const currency = form.watch(`lineItems.${index}.currency`) ?? "INR";
  const exchangeRate = form.watch(`lineItems.${index}.exchangeRate`) ?? 1.0;
  const hsnSac = form.watch(`lineItems.${index}.hsnSac`) ?? "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCurrencyChange = (newCurrCode: string) => {
    form.setValue(`lineItems.${index}.currency`, newCurrCode);

    const allItems = getAllItems();
    const matchedItem = allItems.find((i) => i.name === description);

    let rate = 1.0;
    let customPrice: number | null = null;

    const currenciesList = getCurrencies();
    const curInfo = currenciesList.find((c) => c.code === newCurrCode);
    if (curInfo) {
      rate = curInfo.exchangeRate;
    }

    if (matchedItem && matchedItem.priceList) {
      const priceListItem = matchedItem.priceList.find((pl) => pl.currency === newCurrCode);
      if (priceListItem) {
        rate = priceListItem.exchangeRate;
        if (priceListItem.customPrice !== undefined) {
          customPrice = priceListItem.customPrice;
        }
      }
    }

    form.setValue(`lineItems.${index}.exchangeRate`, rate);

    if (customPrice !== null) {
      form.setValue(`lineItems.${index}.rate`, customPrice);
    } else if (matchedItem) {
      form.setValue(`lineItems.${index}.rate`, parseFloat((matchedItem.rate / rate).toFixed(2)));
    }

    const qty = form.getValues(`lineItems.${index}.quantity`) ?? 0;
    const itemRate = form.getValues(`lineItems.${index}.rate`) ?? 0;
    form.setValue(`lineItems.${index}.amount`, qty * itemRate * rate);
  };

  const effectiveHsn = resolveHsn(description, hsnSac);

  return (
    <tr
      className={[
        "border-b border-[#eef2f6] align-top transition-colors",
        isDragTarget ? "bg-[#00cec4]/5" : "bg-white",
      ].join(" ")}
      onDragOver={(event) => onDragOver(index, event)}
      onDrop={() => onDrop(index)}
      onDragEnd={onDragEnd}
    >
      <td className="w-10 px-2 py-3 text-[#9ca3af]">
        <button
          type="button"
          draggable
          onDragStart={() => onDragStart(index)}
          className="rounded-md p-1 text-[#94a3b8] transition-colors hover:bg-[#00cec4]/10 hover:text-[#00cec4] cursor-grab active:cursor-grabbing"
          aria-label={`Reorder item ${index + 1}`}
          title="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </button>
      </td>
      <td className="min-w-[260px] px-2 py-2">
        <div className="flex items-start gap-2">
          <div className="shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => onImageChange(rowKey, event)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-9 overflow-hidden items-center justify-center rounded-md border border-[#d9dee7] bg-[#f8fafc] text-[#9ca3af] transition-colors hover:border-[#00cec4] hover:bg-[#00cec4]/10 hover:text-[#00cec4]"
              aria-label="Upload item image"
              title="Upload item image"
            >
              {imagePreview ? (
                <Image src={imagePreview} alt="Item preview" width={36} height={36} unoptimized className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="size-4" />
              )}
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <ItemAutocomplete
              value={description}
              onChange={(name) => {
                form.setValue(`lineItems.${index}.description`, name);
                form.setValue(`lineItems.${index}.hsnSac`, resolveHsn(name));
              }}
              onSelectItem={(item) => {
                form.setValue(`lineItems.${index}.description`, item.name);
                form.setValue(`lineItems.${index}.hsnSac`, item.hsnSac || "");

                let currentRate = item.rate;
                let exRate = 1.0;

                const currenciesList = getCurrencies();
                const curInfo = currenciesList.find((c) => c.code === currency);
                if (curInfo) {
                  exRate = curInfo.exchangeRate;
                }

                if (item.priceList) {
                  const priceListItem = item.priceList.find((pl) => pl.currency === currency);
                  if (priceListItem) {
                    exRate = priceListItem.exchangeRate;
                    if (priceListItem.customPrice !== undefined) {
                      currentRate = priceListItem.customPrice;
                    } else {
                      currentRate = parseFloat((item.rate / exRate).toFixed(2));
                    }
                  } else {
                    currentRate = parseFloat((item.rate / exRate).toFixed(2));
                  }
                } else {
                  currentRate = parseFloat((item.rate / exRate).toFixed(2));
                }

                form.setValue(`lineItems.${index}.exchangeRate`, exRate);
                form.setValue(`lineItems.${index}.rate`, currentRate);

                const qty = form.getValues(`lineItems.${index}.quantity`) ?? 0;
                form.setValue(`lineItems.${index}.amount`, qty * currentRate * exRate);

                if (item.usageUnit && (units as readonly string[]).includes(item.usageUnit)) {
                  form.setValue(`lineItems.${index}.unit`, item.usageUnit as typeof units[number]);
                }
              }}
              error={errors?.description?.message}
            />
            <input type="hidden" {...form.register(`lineItems.${index}.hsnSac`)} />
            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#6b7280]">
              HSN/SAC: <span className="font-medium text-[#1f2937]">{effectiveHsn || "—"}</span>
            </p>
          </div>
        </div>
      </td>
      <td className="min-w-[90px] px-2 py-2">
        <select
          className="h-9 w-full rounded-xl border bg-white px-2 text-[12px] text-[#1f2937] outline-none"
          value={currency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
        >
          {getCurrencies().map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
      </td>
      <td className="min-w-[100px] px-2 py-2">
        <input
          type="number"
          step="0.0001"
          className="h-9 w-full rounded-xl border bg-white px-3 text-right text-[12px] text-[#1f2937] outline-none font-mono"
          disabled={currency === "INR"}
          value={exchangeRate}
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 1.0;
            form.setValue(`lineItems.${index}.exchangeRate`, val);
            const qty = form.getValues(`lineItems.${index}.quantity`) ?? 0;
            const rateVal = form.getValues(`lineItems.${index}.rate`) ?? 0;
            form.setValue(`lineItems.${index}.amount`, qty * rateVal * val);
          }}
        />
      </td>
      <td className="min-w-[100px] px-2 py-2">
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
      <td className="min-w-[90px] px-2 py-2">
        <input
          type="number"
          min="0"
          step="0.01"
          className="h-9 w-full rounded-xl border bg-white px-3 text-right text-[12px] text-[#1f2937] outline-none font-mono"
          {...form.register(`lineItems.${index}.quantity`, {
            valueAsNumber: true,
            onChange: (e) => {
              const qty = parseFloat(e.target.value) || 0;
              const rateVal = form.getValues(`lineItems.${index}.rate`) ?? 0;
              const xr = form.getValues(`lineItems.${index}.exchangeRate`) ?? 1.0;
              form.setValue(`lineItems.${index}.amount`, qty * rateVal * xr);
            },
          })}
        />
        {errors?.quantity ? <p className="mt-1 text-[11px] text-[#fe4242]">{errors.quantity.message}</p> : null}
      </td>
      <td className="min-w-[100px] px-2 py-2">
        <input
          type="number"
          min="0"
          step="0.01"
          className="h-9 w-full rounded-xl border bg-white px-3 text-right text-[12px] text-[#1f2937] outline-none font-mono"
          {...form.register(`lineItems.${index}.rate`, {
            valueAsNumber: true,
            onChange: (e) => {
              const r = parseFloat(e.target.value) || 0;
              const qty = form.getValues(`lineItems.${index}.quantity`) ?? 0;
              const xr = form.getValues(`lineItems.${index}.exchangeRate`) ?? 1.0;
              form.setValue(`lineItems.${index}.amount`, qty * r * xr);
            },
          })}
        />
        {errors?.rate ? <p className="mt-1 text-[11px] text-[#fe4242]">{errors.rate.message}</p> : null}
      </td>
      <td className="min-w-[110px] px-2 py-2">
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
      <td className="min-w-[110px] px-2 py-2">
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
      <td className="min-w-[120px] px-2 py-3 text-right text-[13px] font-mono font-medium text-[#1f2937]">
        ₹ {formatMoney(amount ?? 0)}
      </td>
      <td className="min-w-[72px] px-2 py-3">
        <div className="flex items-center justify-end">
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
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "lineItems",
    keyName: "fieldId",
  });

  const [rowImages, setRowImages] = useState<RowImageMap>({});
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);

  const handleImageChange = (rowKey: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setRowImages((current) => ({
        ...current,
        [rowKey]: typeof reader.result === "string" ? reader.result : current[rowKey],
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (index: number) => {
    const rowKey = fields[index]?.fieldId;
    remove(index);
    if (rowKey) {
      setRowImages((current) => {
        const next = { ...current };
        delete next[rowKey];
        return next;
      });
    }
  };

  const resetDragState = () => {
    setDraggingIndex(null);
    setDragTargetIndex(null);
  };

  return (
    <section className="border-b border-[#d9dee7] px-5 py-5">
      <div className="overflow-x-auto border border-[#d9dee7]">
        <table className="min-w-[1280px] w-full bg-white">
          <thead className="bg-[#fbfcfd] text-left text-[11px] uppercase tracking-[0.08em] text-[#6b7280]">
            <tr>
              <th className="w-10 px-2 py-3"></th>
              <th className="min-w-[260px] px-2 py-3">Item Details</th>
              <th className="min-w-[90px] px-2 py-3">Currency</th>
              <th className="min-w-[100px] px-2 py-3 text-right">Ex. Rate</th>
              <th className="min-w-[100px] px-2 py-3">Unit</th>
              <th className="min-w-[90px] px-2 py-3 text-right">Quantity</th>
              <th className="min-w-[100px] px-2 py-3 text-right">Rate</th>
              <th className="min-w-[110px] px-2 py-3">Tax</th>
              <th className="min-w-[110px] px-2 py-3">TDS</th>
              <th className="min-w-[120px] px-2 py-3 text-right">Amount (₹)</th>
              <th className="min-w-[72px] px-2 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <LineItemRow
                key={field.fieldId}
                index={index}
                rowKey={field.fieldId}
                remove={handleRemove}
                canRemove={fields.length > 1}
                form={form}
                onImageChange={handleImageChange}
                imagePreview={rowImages[field.fieldId]}
                onDragStart={(nextIndex) => {
                  setDraggingIndex(nextIndex);
                  setDragTargetIndex(nextIndex);
                }}
                onDragOver={(nextIndex, event) => {
                  event.preventDefault();
                  if (draggingIndex !== null && draggingIndex !== nextIndex) {
                    setDragTargetIndex(nextIndex);
                  }
                }}
                onDrop={(nextIndex) => {
                  if (draggingIndex !== null && draggingIndex !== nextIndex) {
                    move(draggingIndex, nextIndex);
                  }
                  resetDragState();
                }}
                onDragEnd={resetDragState}
                isDragTarget={draggingIndex !== null && dragTargetIndex === index && draggingIndex !== index}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          className="h-9 bg-[#00cec4] px-3 text-[12px] text-white hover:bg-[#00b8af]"
          onClick={() => append(createEmptyLineItem())}
        >
          <Plus className="mr-1 size-4" />
          Add New Row
        </Button>
        <Button
          className="h-9 bg-[#00cec4] px-3 text-[12px] text-white hover:bg-[#00b8af]"
          onClick={() => append(createEmptyLineItem())}
        >
          <Plus className="mr-1 size-4" />
          Add Items in Bulk
        </Button>
      </div>
    </section>
  );
}

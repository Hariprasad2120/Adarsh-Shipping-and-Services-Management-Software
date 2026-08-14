"use client";

import { CrmButton, CrmDialog, CrmInput, CrmTable, CrmTextarea } from "@/modules/crm/components/workspace/crm-workspace";
import { WorkspacePanelHeader } from "@/components/layout/workspace";

import { NativeSelect } from "@/components/ui/native-select";
import Image from "next/image";
import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { GripVertical, ImagePlus, Plus, Trash2 } from "lucide-react";
import { createEmptyLineItem, taxes, tdsOptions, units } from "@/modules/crm/components/quotes/lib/mock-data";
import { formatMoney } from "@/modules/crm/components/quotes/lib/quote-calculations";
import type { QuoteFormValues } from "@/modules/crm/components/quotes/lib/types";
import { Button } from "@/components/ui/button";
import { ItemAutocomplete } from "@/modules/crm/components/quotes/ItemAutocomplete";
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
        "border-b border-[var(--mnx-border)] align-top transition-colors",
        isDragTarget ? "bg-[var(--mnx-accent)]/5" : "bg-[var(--mnx-surface)]",
      ].join(" ")}
      onDragOver={(event) => onDragOver(index, event)}
      onDrop={() => onDrop(index)}
      onDragEnd={onDragEnd}
    >
      <td className="w-10 px-2 py-3 text-[var(--mnx-text-muted)]">
        <CrmButton
          type="button"
          draggable
          onDragStart={() => onDragStart(index)}
          className="rounded-md p-1 text-[var(--mnx-text-muted)] transition-colors hover:bg-[var(--mnx-accent)]/10 hover:text-[var(--mnx-accent)] cursor-grab active:cursor-grabbing"
          aria-label={`Reorder item ${index + 1}`}
          title="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </CrmButton>
      </td>
      <td className="min-w-[260px] px-2 py-2 whitespace-nowrap">
        <div className="flex items-start gap-2">
          <div className="shrink-0">
            <CrmInput
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => onImageChange(rowKey, event)}
            />
            <CrmButton
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-9 overflow-hidden items-center justify-center rounded-md border border-[var(--mnx-border)] bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)] transition-colors hover:border-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)]/10 hover:text-[var(--mnx-accent)]"
              aria-label="Upload item image"
              title="Upload item image"
            >
              {imagePreview ? (
                <Image src={imagePreview} alt="Item preview" width={36} height={36} unoptimized className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="size-4" />
              )}
            </CrmButton>
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
            <CrmInput type="hidden" {...form.register(`lineItems.${index}.hsnSac`)} />
            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
              HSN/SAC: <span className="font-medium text-[var(--mnx-text-strong)]">{effectiveHsn || "—"}</span>
            </p>
          </div>
        </div>
      </td>
      <td className="min-w-[90px] px-2 py-2 whitespace-nowrap">
        <NativeSelect
          className="h-9 w-full rounded-xl border bg-[var(--mnx-surface)] px-2 text-[12px] text-[var(--mnx-text-strong)] outline-none"
          value={currency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
        >
          {getCurrencies().map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </NativeSelect>
      </td>
      <td className="min-w-[110px] px-2 py-2 whitespace-nowrap">
        <CrmInput
          type="number"
          step="0.0001"
          className="h-9 w-full rounded-xl border bg-[var(--mnx-surface)] px-3 text-right text-[12px] text-[var(--mnx-text-strong)] outline-none font-mono"
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
      <td className="min-w-[100px] px-2 py-2 whitespace-nowrap">
        <NativeSelect
          className="h-9 w-full rounded-xl border bg-[var(--mnx-surface)] px-2 text-[12px] text-[var(--mnx-text-strong)] outline-none"
          {...form.register(`lineItems.${index}.unit`)}
        >
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </NativeSelect>
      </td>
      <td className="min-w-[90px] px-2 py-2 whitespace-nowrap">
        <CrmInput
          type="number"
          min="0"
          step="0.01"
          className="h-9 w-full rounded-xl border bg-[var(--mnx-surface)] px-3 text-right text-[12px] text-[var(--mnx-text-strong)] outline-none font-mono"
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
        {errors?.quantity ? <p className="mt-1 text-[11px] text-[var(--mnx-danger)]">{errors.quantity.message}</p> : null}
      </td>
      <td className="min-w-[100px] px-2 py-2 whitespace-nowrap">
        <CrmInput
          type="number"
          min="0"
          step="0.01"
          className="h-9 w-full rounded-xl border bg-[var(--mnx-surface)] px-3 text-right text-[12px] text-[var(--mnx-text-strong)] outline-none font-mono"
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
        {errors?.rate ? <p className="mt-1 text-[11px] text-[var(--mnx-danger)]">{errors.rate.message}</p> : null}
      </td>
      <td className="min-w-[110px] px-2 py-2 whitespace-nowrap">
        <NativeSelect
          className="h-9 w-full rounded-xl border bg-[var(--mnx-surface)] px-2 text-[12px] text-[var(--mnx-text-strong)] outline-none"
          {...form.register(`lineItems.${index}.tax`)}
        >
          <option value="">Select a Tax</option>
          {taxes.map((tax) => (
            <option key={tax} value={tax}>
              {tax}
            </option>
          ))}
        </NativeSelect>
      </td>
      <td className="min-w-[110px] px-2 py-2 whitespace-nowrap">
        <NativeSelect
          className="h-9 w-full rounded-xl border bg-[var(--mnx-surface)] px-2 text-[12px] text-[var(--mnx-text-strong)] outline-none"
          {...form.register(`lineItems.${index}.tds`)}
        >
          {tdsOptions.map((tds) => (
            <option key={tds} value={tds}>
              {tds}
            </option>
          ))}
        </NativeSelect>
      </td>
      <td className="min-w-[120px] px-2 py-3 whitespace-nowrap text-right text-[13px] font-mono font-medium text-[var(--mnx-text-strong)]">
        ₹ {formatMoney(amount ?? 0)}
      </td>
      <td className="min-w-[72px] px-2 py-3 whitespace-nowrap">
        <div className="flex items-center justify-end">
          <CrmButton
            type="button"
            onClick={() => remove(index)}
            disabled={!canRemove}
            className="rounded p-1 text-[var(--mnx-danger)] hover:bg-[var(--mnx-danger-bg)] disabled:cursor-not-allowed disabled:text-[var(--mnx-border)]"
            aria-label="Remove row"
          >
            <Trash2 className="size-4" />
          </CrmButton>
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
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [bulkAddText, setBulkAddText] = useState("");

  const handleBulkAdd = () => {
    const lines = bulkAddText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    lines.forEach((description) => {
      append({ ...createEmptyLineItem(), description });
    });
    setBulkAddText("");
    setBulkAddOpen(false);
  };

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
    <div className="p-5">
      <WorkspacePanelHeader
        eyebrow="Commercial lines"
        title="Line items and pricing"
        description="Build the quote using itemized services, tax selection, currency, and quantity details."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-9"
              variant="default"
              size="sm"
              onClick={() => append(createEmptyLineItem())}
            >
              <Plus className="mr-1 size-4" />
              Add line
            </Button>
            <Button
              className="h-9"
              variant="outline"
              size="sm"
              onClick={() => setBulkAddOpen(true)}
            >
              <Plus className="mr-1 size-4" />
              Bulk add
            </Button>
          </div>
        }
      />
      <div className="overflow-x-auto border border-[var(--mnx-border)]">
        <CrmTable className="min-w-[1280px] w-full bg-[var(--mnx-surface)]">
          <thead className="bg-[var(--mnx-surface)] text-left text-[11px] uppercase tracking-[0.08em] text-[var(--mnx-text-muted)] whitespace-nowrap">
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
        </CrmTable>
      </div>
      {bulkAddOpen ? (
        <CrmDialog
          open
          onClose={() => setBulkAddOpen(false)}
          title="Bulk add line items"
          size="compact"
          footer={
            <div className="flex justify-end gap-3">
              <CrmButton onClick={() => setBulkAddOpen(false)} variant="secondary">
                Cancel
              </CrmButton>
              <CrmButton onClick={handleBulkAdd}>Add lines</CrmButton>
            </div>
          }
        >
          <div className="space-y-2">
            <p className="text-sm text-[var(--mnx-text-muted)]">
              Enter one item description per line. Each line becomes a new line item, which you can
              then fill in with rate, quantity, tax, etc.
            </p>
            <CrmTextarea
              value={bulkAddText}
              onChange={(event) => setBulkAddText(event.target.value)}
              rows={8}
              placeholder={"Ocean freight charges\nTerminal handling charges\nCustoms clearance fee"}
              className="w-full rounded-xl"
            />
          </div>
        </CrmDialog>
      ) : null}
    </div>
  );
}

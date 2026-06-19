"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { toast } from "sonner";

import { itemFormSchema, type ItemFormSchema } from "@/lib/items/validation";
import type { ItemListItem } from "@/lib/items/types";
import { saveCustomItem, saveItemOverride, generateItemId } from "@/lib/items/item-store";
import { InventoryInfoBanner } from "./InventoryInfoBanner";
import { ItemPrimaryInfoSection } from "./ItemPrimaryInfoSection";
import { ItemSalesInfoSection } from "./ItemSalesInfoSection";
import { ItemPurchaseInfoSection } from "./ItemPurchaseInfoSection";
import { ItemInventorySection } from "./ItemInventorySection";
import { ItemLogisticsFieldsSection } from "./ItemLogisticsFieldsSection";
import { Button } from "@/components/ui/button";

interface NewItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSaveSuccess: (newItem: ItemListItem) => void;
  initialName?: string;
  itemToEdit?: ItemListItem;
}

const DEFAULT_VALUES: ItemFormSchema = {
  name: "",
  type: "Service",
  unit: "",
  sku: "",
  hsnSac: "",
  taxPreference: "Taxable",
  taxRate: "",
  exemptionReason: "",
  sellingPrice: 0,
  salesAccount: "Sales",
  salesDescription: "",
  purchaseInformation: false,
  costPrice: 0,
  purchaseAccount: "",
  purchaseDescription: "",
  inventoryTracking: false,
  openingStock: 0,
  reorderPoint: 0,
  chargeCategory: "",
  applicableFor: "",
  defaultContainerType: "",
};

export function NewItemDialog({ open, onClose, onSaveSuccess, initialName = "", itemToEdit }: NewItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ItemFormSchema, unknown, ItemFormSchema>({
    resolver: zodResolver(itemFormSchema) as Resolver<ItemFormSchema>,
    defaultValues: DEFAULT_VALUES,
  });

  const getInitialValues = useCallback((): ItemFormSchema => {
    if (itemToEdit) {
      return {
        name: itemToEdit.name,
        type: itemToEdit.type,
        unit: itemToEdit.usageUnit || "",
        sku: itemToEdit.sku || "",
        hsnSac: itemToEdit.hsnSac || "",
        taxPreference: itemToEdit.taxPreference,
        taxRate: "", 
        exemptionReason: "",
        sellingPrice: itemToEdit.rate,
        salesAccount: "Sales",
        salesDescription: itemToEdit.description || "",
        purchaseInformation: itemToEdit.purchaseRate > 0,
        costPrice: itemToEdit.purchaseRate,
        purchaseAccount: "Cost of Goods Sold",
        purchaseDescription: itemToEdit.purchaseDescription || "",
        inventoryTracking: false,
        openingStock: 0,
        reorderPoint: 0,
        chargeCategory: "",
        applicableFor: "",
        defaultContainerType: "",
      };
    }
    return {
      ...DEFAULT_VALUES,
      name: initialName,
    };
  }, [initialName, itemToEdit]);

  useEffect(() => {
    if (open) {
      form.reset(getInitialValues());
    }
  }, [open, form, getInitialValues]);

  if (!open) return null;

  const handleSave = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      const id = itemToEdit ? itemToEdit.id : generateItemId();
      const status = itemToEdit ? itemToEdit.status : "Active";
      
      const newItem: ItemListItem = {
        id,
        name: data.name,
        sku: data.sku || undefined,
        purchaseDescription: data.purchaseDescription || undefined,
        purchaseRate: data.costPrice ?? 0,
        description: data.salesDescription || undefined,
        rate: data.sellingPrice,
        hsnSac: data.hsnSac || undefined,
        usageUnit: data.unit || undefined,
        type: data.type,
        taxPreference: data.taxPreference,
        status,
      };

      saveCustomItem(newItem);

      if (itemToEdit && !itemToEdit.id.startsWith("ITEM-USR-")) {
        saveItemOverride(itemToEdit.id, {
          name: data.name,
          sku: data.sku || undefined,
          purchaseDescription: data.purchaseDescription || undefined,
          purchaseRate: data.costPrice ?? 0,
          description: data.salesDescription || undefined,
          rate: data.sellingPrice,
          hsnSac: data.hsnSac || undefined,
          usageUnit: data.unit || undefined,
          type: data.type,
          taxPreference: data.taxPreference,
        });
      }

      toast.success(itemToEdit ? "Item updated" : `"${data.name}" added to Items master`);
      onSaveSuccess(newItem);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save item");
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/35 px-4 py-6">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border border-[#d9dee7] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-4">
          <h2 className="text-[16px] font-semibold text-[#1f2937]">{itemToEdit ? "Edit Item" : "New Item"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#6b7280] hover:bg-[#f3f4f6]"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <InventoryInfoBanner />

          {/* Primary info card */}
          <div className="bg-white border border-[#d9dee7] rounded p-6">
            <ItemPrimaryInfoSection form={form} />
          </div>

          {/* Sales info card */}
          <div className="bg-white border border-[#d9dee7] rounded p-6">
            <ItemSalesInfoSection form={form} />
          </div>

          {/* Purchase info card */}
          <div className="bg-white border border-[#d9dee7] rounded p-6">
            <ItemPurchaseInfoSection form={form} />
          </div>

          {/* Inventory card */}
          <div className="bg-white border border-[#d9dee7] rounded p-6">
            <ItemInventorySection form={form} />
          </div>

          {/* Logistics card */}
          <div className="bg-white border border-[#d9dee7] rounded p-6">
            <ItemLogisticsFieldsSection form={form} />
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="flex justify-end gap-3 border-t border-[#e5e7eb] px-6 py-4 bg-[#f8fafc]">
          <Button
            variant="outline"
            className="h-9 border-[#d9dee7] bg-white px-4 text-[12px] text-[#4b5563]"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            className="h-9 bg-[#00cec4] hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] text-white px-4 text-[12px] transition-all"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

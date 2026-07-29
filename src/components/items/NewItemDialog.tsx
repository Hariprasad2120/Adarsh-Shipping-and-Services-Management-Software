"use client";

import { CrmDialog } from "@/components/monolith/crm-workspace";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { itemFormSchema, type ItemFormSchema } from "@/lib/items/validation";
import type { ItemListItem } from "@/lib/items/types";
import { saveCustomItem, saveItemOverride, generateItemId } from "@/lib/items/item-store";
import { InventoryInfoBanner } from "./InventoryInfoBanner";
import { ItemPrimaryInfoSection } from "./ItemPrimaryInfoSection";
import { ItemSalesInfoSection } from "./ItemSalesInfoSection";
import { ItemPriceListSection } from "./ItemPriceListSection";
import { ItemPurchaseInfoSection } from "./ItemPurchaseInfoSection";
import { ItemInventorySection } from "./ItemInventorySection";
import { ItemLogisticsFieldsSection } from "./ItemLogisticsFieldsSection";
import { Button } from "@/components/monolith/button";

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
  priceList: [],
  priceListAuto: true,
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
        priceList: itemToEdit.priceList || [],
        priceListAuto: itemToEdit.priceListAuto ?? true,
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
        priceList: data.priceList,
        priceListAuto: data.priceListAuto,
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
          priceList: data.priceList,
          priceListAuto: data.priceListAuto,
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
    <CrmDialog
      open={open}
      onClose={onClose}
      title={itemToEdit ? "Edit item" : "New item"}
      description="Maintain commercial, inventory, purchasing, and logistics settings."
      size="wide"
      footer={
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      }
    >
        <div className="space-y-6">
          <InventoryInfoBanner />

          {/* Primary info card */}
          <div className="bg-mono-card border border-[var(--mnx-border)] rounded p-6">
            <ItemPrimaryInfoSection form={form} />
          </div>

          {/* Sales info card */}
          <div className="bg-mono-card border border-[var(--mnx-border)] rounded p-6">
            <ItemSalesInfoSection form={form} />
          </div>

          {/* Price List card */}
          <div className="bg-mono-card border border-[var(--mnx-border)] rounded p-6">
            <ItemPriceListSection form={form} />
          </div>

          {/* Purchase info card */}
          <div className="bg-mono-card border border-[var(--mnx-border)] rounded p-6">
            <ItemPurchaseInfoSection form={form} />
          </div>

          {/* Inventory card */}
          <div className="bg-mono-card border border-[var(--mnx-border)] rounded p-6">
            <ItemInventorySection form={form} />
          </div>

          {/* Logistics card */}
          <div className="bg-mono-card border border-[var(--mnx-border)] rounded p-6">
            <ItemLogisticsFieldsSection form={form} />
          </div>
        </div>
    </CrmDialog>
  );
}

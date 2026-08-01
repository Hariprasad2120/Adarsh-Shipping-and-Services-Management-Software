"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { itemFormSchema, type ItemFormSchema } from "@/lib/items/validation";
import { saveCustomItem, generateItemId } from "@/lib/items/item-store";
import type { ItemListItem } from "@/lib/items/types";
import { ItemFormHeader } from "@/modules/items/components/ItemFormHeader";
import { InventoryInfoBanner } from "@/modules/items/components/InventoryInfoBanner";
import { ItemPrimaryInfoSection } from "@/modules/items/components/ItemPrimaryInfoSection";
import { ItemSalesInfoSection } from "@/modules/items/components/ItemSalesInfoSection";
import { ItemPriceListSection } from "@/modules/items/components/ItemPriceListSection";
import { ItemPurchaseInfoSection } from "@/modules/items/components/ItemPurchaseInfoSection";
import { ItemInventorySection } from "@/modules/items/components/ItemInventorySection";
import { ItemLogisticsFieldsSection } from "@/modules/items/components/ItemLogisticsFieldsSection";
import { FixedItemActionBar } from "@/modules/items/components/FixedItemActionBar";
import { ConfirmDialog } from "@/modules/items/components/ConfirmDialog";

interface NewItemPageProps {
  backPath?: string;
}

const DEFAULT_VALUES: ItemFormSchema = {
  name: "",
  salesInformation: true,
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

export function NewItemPage({ backPath = "/crm/items" }: NewItemPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  const form = useForm<ItemFormSchema, unknown, ItemFormSchema>({
    resolver: zodResolver(itemFormSchema) as Resolver<ItemFormSchema>,
    defaultValues: DEFAULT_VALUES,
  });

  const { isDirty } = form.formState;

  const handleSave = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      console.log("Item payload:", data);
      const newItem: ItemListItem = {
        id: generateItemId(),
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
        status: "Active",
        priceList: data.priceList,
        priceListAuto: data.priceListAuto,
      };
      saveCustomItem(newItem);
      await new Promise((r) => setTimeout(r, 400));
      toast.success("Item saved");
      router.push(backPath);
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleSaveAndNew = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      console.log("Item payload:", data);
      const newItem: ItemListItem = {
        id: generateItemId(),
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
        status: "Active",
        priceList: data.priceList,
        priceListAuto: data.priceListAuto,
      };
      saveCustomItem(newItem);
      await new Promise((r) => setTimeout(r, 400));
      toast.success("Item saved");
      form.reset(DEFAULT_VALUES);
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleCancel = () => {
    if (isDirty) {
      setShowDiscard(true);
    } else {
      router.push(backPath);
    }
  };

  return (
    <div className="mnx-item-workspace flex flex-col h-full bg-[var(--mnx-surface)]">
      <ItemFormHeader
        title="New Item"
        backPath={backPath}
        onClose={handleCancel}
      />

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-8">
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
      </div>

      <FixedItemActionBar
        onSave={handleSave}
        onSaveAndNew={handleSaveAndNew}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />

      <ConfirmDialog
        open={showDiscard}
        title="Discard changes?"
        message="You have unsaved changes. Discard them and leave this page?"
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        onConfirm={() => {
          setShowDiscard(false);
          router.push(backPath);
        }}
        onCancel={() => setShowDiscard(false)}
      />
    </div>
  );
}

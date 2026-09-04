"use client";

import { useState, useTransition } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "@/modules/notifications/client";
import {
  CrmButton,
  CrmDialog,
  CrmField,
  CrmInput,
  CrmTextarea,
} from "@/modules/crm/components/workspace/crm-workspace";
import { NativeSelect } from "@/components/ui/native-select";
import { updateProductAction } from "@/modules/crm/actions";

export type EditableProduct = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  taxPercent: number;
  active: boolean;
  description: string | null;
};

export function EditProductButton({ product }: { product: EditableProduct }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await updateProductAction(product.id, formData);
      if (res.ok) {
        toast.success("Product updated successfully.");
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to update product.");
      }
    });
  }

  return (
    <>
      <CrmButton
        type="button"
        onClick={() => setOpen(true)}
        className="p-1.5 text-[var(--mnx-muted)] hover:text-[var(--mnx-accent)] rounded hover:bg-[var(--mnx-soft)] cursor-pointer transition-colors"
        title="Edit"
      >
        <Pencil className="size-4" />
      </CrmButton>
      {open ? (
        <CrmDialog
          open
          onClose={() => setOpen(false)}
          title="Edit product"
          size="compact"
          footer={
            <div className="flex justify-end gap-3">
              <CrmButton type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </CrmButton>
              <CrmButton type="submit" form="edit-product-form" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Save
              </CrmButton>
            </div>
          }
        >
          <form id="edit-product-form" action={handleSubmit} className="space-y-4">
            <CrmField label="Product Name" htmlFor="edit-product-name" required>
              <CrmInput
                id="edit-product-name"
                type="text"
                name="name"
                defaultValue={product.name}
                required
                className="h-11 w-full rounded-xl"
              />
            </CrmField>
            <div className="grid grid-cols-2 gap-3">
              <CrmField label="Category" htmlFor="edit-product-category">
                <CrmInput
                  id="edit-product-category"
                  type="text"
                  name="category"
                  defaultValue={product.category ?? ""}
                  className="h-11 w-full rounded-xl"
                />
              </CrmField>
              <CrmField label="Base Price (INR)" htmlFor="edit-product-price">
                <CrmInput
                  id="edit-product-price"
                  type="number"
                  name="price"
                  defaultValue={product.price}
                  className="h-11 w-full rounded-xl"
                />
              </CrmField>
            </div>
            <CrmField label="GST Rate (%)" htmlFor="edit-product-tax">
              <NativeSelect
                id="edit-product-tax"
                name="taxPercent"
                defaultValue={String(product.taxPercent)}
                className="h-11 w-full rounded-xl border bg-[var(--mnx-surface)] px-3 text-sm"
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18% GST</option>
                <option value="28">28%</option>
              </NativeSelect>
            </CrmField>
            <CrmField label="Description" htmlFor="edit-product-description">
              <CrmTextarea
                id="edit-product-description"
                name="description"
                defaultValue={product.description ?? ""}
                rows={3}
                className="w-full rounded-xl"
              />
            </CrmField>
            <CrmInput type="hidden" name="active" value={product.active ? "true" : "false"} />
          </form>
        </CrmDialog>
      ) : null}
    </>
  );
}

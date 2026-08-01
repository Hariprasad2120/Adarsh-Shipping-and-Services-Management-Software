"use client";

import { CrmInput } from "@/modules/crm/components/workspace/crm-workspace";

import { NativeSelect } from "@/components/ui/native-select";
import type { UseFormReturn } from "react-hook-form";
import type { QuoteFormValues } from "@/modules/crm/components/quotes/lib/types";

type ShippingDetailsSectionProps = {
  form: UseFormReturn<QuoteFormValues>;
  incoterms: readonly string[];
  containerTypes: readonly string[];
};

type ShippingFieldName =
  | "portOfLoading"
  | "portOfLoadingCountry"
  | "portOfDischarge"
  | "portOfDestinationCountry"
  | "numberOfContainers"
  | "commodity"
  | "weight";

const fields: Array<{ name: ShippingFieldName; label: string; type?: "text" | "number" }> = [
  { name: "portOfLoading", label: "Port of Loading" },
  { name: "portOfLoadingCountry", label: "Port of Loading - Country" },
  { name: "portOfDischarge", label: "Port of Discharge" },
  { name: "portOfDestinationCountry", label: "Port of Destination - Country" },
  { name: "numberOfContainers", label: "No of Containers", type: "number" },
  { name: "commodity", label: "Commodity" },
  { name: "weight", label: "Weight" },
];

export function ShippingDetailsSection({ form, incoterms, containerTypes }: ShippingDetailsSectionProps) {
  const errors = form.formState.errors;

  return (
    <section className="mnx-crm-form-section border-b border-[var(--mnx-border)] px-5 py-5">
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-mono-muted">Logistics / Shipping Details</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.slice(0, 4).map((field) => (
          <div key={field.name}>
            <label className="mb-1 block text-[12px] font-medium text-[var(--mnx-text-strong)]">{field.label}</label>
            <CrmInput
              type={field.type ?? "text"}
              className="h-9 w-full rounded-xl border bg-mono-card px-3 text-[13px] text-[var(--mnx-text-strong)] outline-none"
              {...form.register(field.name, field.type === "number" ? { valueAsNumber: true } : undefined)}
            />
            {errors[field.name]?.message ? <p className="mt-1 text-[11px] text-[var(--mnx-danger)]">{errors[field.name]?.message}</p> : null}
          </div>
        ))}

        <div>
          <label className="mb-1 block text-[12px] font-medium text-[var(--mnx-text-strong)]">INCOTERM</label>
          <NativeSelect
            className="h-9 w-full rounded-xl border bg-mono-card px-3 text-[13px] text-[var(--mnx-text-strong)] outline-none"
            {...form.register("incoterm")}
          >
            <option value="">Select INCOTERM</option>
            {incoterms.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-[var(--mnx-text-strong)]">Container type</label>
          <NativeSelect
            className="h-9 w-full rounded-xl border bg-mono-card px-3 text-[13px] text-[var(--mnx-text-strong)] outline-none"
            {...form.register("containerType")}
          >
            <option value="">Select container type</option>
            {containerTypes.map((containerType) => (
              <option key={containerType} value={containerType}>
                {containerType}
              </option>
            ))}
          </NativeSelect>
        </div>

        {fields.slice(4).map((field) => (
          <div key={field.name}>
            <label className="mb-1 block text-[12px] font-medium text-[var(--mnx-text-strong)]">{field.label}</label>
            <CrmInput
              type={field.type ?? "text"}
              className="h-9 w-full rounded-xl border bg-mono-card px-3 text-[13px] text-[var(--mnx-text-strong)] outline-none"
              {...form.register(field.name, field.type === "number" ? { valueAsNumber: true } : undefined)}
            />
            {errors[field.name]?.message ? <p className="mt-1 text-[11px] text-[var(--mnx-danger)]">{errors[field.name]?.message}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

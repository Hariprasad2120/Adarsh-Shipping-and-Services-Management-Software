"use client";

import type { UseFormReturn } from "react-hook-form";
import type { QuoteFormValues } from "../_lib/types";

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
    <section className="border-b border-[#d9dee7] px-5 py-5">
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Logistics / Shipping Details</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.slice(0, 4).map((field) => (
          <div key={field.name}>
            <label className="mb-1 block text-[12px] font-medium text-[#374151]">{field.label}</label>
            <input
              type={field.type ?? "text"}
              className="h-9 w-full rounded-md border border-[#d9dee7] bg-white px-3 text-[13px] text-[#1f2937] outline-none focus:border-[#408dfb] focus:ring-2 focus:ring-[#408dfb]/20"
              {...form.register(field.name, field.type === "number" ? { valueAsNumber: true } : undefined)}
            />
            {errors[field.name]?.message ? <p className="mt-1 text-[11px] text-[#fe4242]">{errors[field.name]?.message}</p> : null}
          </div>
        ))}

        <div>
          <label className="mb-1 block text-[12px] font-medium text-[#374151]">INCOTERM</label>
          <select
            className="h-9 w-full rounded-md border border-[#d9dee7] bg-white px-3 text-[13px] text-[#1f2937] outline-none focus:border-[#408dfb] focus:ring-2 focus:ring-[#408dfb]/20"
            {...form.register("incoterm")}
          >
            <option value="">Select INCOTERM</option>
            {incoterms.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-[#374151]">Container type</label>
          <select
            className="h-9 w-full rounded-md border border-[#d9dee7] bg-white px-3 text-[13px] text-[#1f2937] outline-none focus:border-[#408dfb] focus:ring-2 focus:ring-[#408dfb]/20"
            {...form.register("containerType")}
          >
            <option value="">Select container type</option>
            {containerTypes.map((containerType) => (
              <option key={containerType} value={containerType}>
                {containerType}
              </option>
            ))}
          </select>
        </div>

        {fields.slice(4).map((field) => (
          <div key={field.name}>
            <label className="mb-1 block text-[12px] font-medium text-[#374151]">{field.label}</label>
            <input
              type={field.type ?? "text"}
              className="h-9 w-full rounded-md border border-[#d9dee7] bg-white px-3 text-[13px] text-[#1f2937] outline-none focus:border-[#408dfb] focus:ring-2 focus:ring-[#408dfb]/20"
              {...form.register(field.name, field.type === "number" ? { valueAsNumber: true } : undefined)}
            />
            {errors[field.name]?.message ? <p className="mt-1 text-[11px] text-[#fe4242]">{errors[field.name]?.message}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

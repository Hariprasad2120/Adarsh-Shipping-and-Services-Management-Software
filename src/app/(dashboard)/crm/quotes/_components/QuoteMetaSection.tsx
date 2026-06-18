"use client";

import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Settings } from "lucide-react";
import type { ComboboxOption, QuoteFormValues } from "../_lib/types";
import { ComboboxField } from "./ComboboxField";
import { DateField } from "./DateField";
import { FormRow } from "./FormRow";

type QuoteMetaSectionProps = {
  form: UseFormReturn<QuoteFormValues>;
  salespersons: ComboboxOption[];
  projectOptions: ComboboxOption[];
  hasCustomer: boolean;
};

export function QuoteMetaSection({ form, salespersons, projectOptions, hasCustomer }: QuoteMetaSectionProps) {
  const errors = form.formState.errors;

  return (
    <section className="ds-form-section border-b border-[#d9dee7] px-5 py-5">
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Quote Metadata</h2>
      <div className="space-y-0">
        <FormRow label="Quote#" required error={errors.quoteNumber?.message}>
          <div className="flex gap-2">
            <input
              aria-required="true"
              className="h-9 flex-1 rounded-md bg-white px-3 text-[13px] text-[#1f2937] outline-none"
              {...form.register("quoteNumber")}
            />
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-md border border-[#d9dee7] bg-[#f9fafb] px-3 text-[#6b7280] hover:bg-[#f3f4f6]"
              aria-label="Quote numbering preferences"
            >
              <Settings className="size-4" />
            </button>
          </div>
        </FormRow>

        <FormRow label="Reference#" error={errors.referenceNumber?.message}>
          <input
            className="h-9 w-full rounded-md bg-white px-3 text-[13px] text-[#1f2937] outline-none"
            {...form.register("referenceNumber")}
          />
        </FormRow>

        <FormRow label="Quote Date" required error={errors.quoteDate?.message}>
          <DateField aria-required="true" error={!!errors.quoteDate} {...form.register("quoteDate")} />
        </FormRow>

        <FormRow label="Expiry Date" error={errors.expiryDate?.message}>
          <DateField error={!!errors.expiryDate} {...form.register("expiryDate")} />
        </FormRow>

        <FormRow label="Salesperson" error={errors.salesperson?.message}>
          <Controller
            control={form.control}
            name="salesperson"
            render={({ field }) => (
              <ComboboxField
                ariaLabel="Salesperson"
                options={salespersons}
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Select or Add Salesperson"
              />
            )}
          />
        </FormRow>

        <FormRow label="Project Name" helperText={hasCustomer ? undefined : "Select a customer to associate a project."} error={errors.projectId?.message}>
          <Controller
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <ComboboxField
                ariaLabel="Project Name"
                options={projectOptions}
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Select a project"
                disabled={!hasCustomer}
              />
            )}
          />
        </FormRow>
      </div>
    </section>
  );
}

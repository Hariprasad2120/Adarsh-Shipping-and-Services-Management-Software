"use client";

import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Search } from "lucide-react";
import { ComboboxField } from "./ComboboxField";
import { FormRow } from "./FormRow";
import type { CustomerOption, QuoteFormValues } from "../_lib/types";

type CustomerSectionProps = {
  form: UseFormReturn<QuoteFormValues>;
  customers: CustomerOption[];
  locations: readonly string[];
  sourceOfSupply: string;
  selectedCustomer: CustomerOption | null;
};

export function CustomerSection({ form, customers, locations, sourceOfSupply, selectedCustomer }: CustomerSectionProps) {
  const errors = form.formState.errors;

  return (
    <section className="border-b border-[#d9dee7] px-5 py-5">
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">Customer and Location</h2>
      <div className="space-y-0">
        <FormRow label="Customer Name" required error={errors.customerId?.message}>
          <div className="flex gap-2">
            <div className="flex-1">
              <Controller
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <ComboboxField
                    ariaLabel="Customer Name"
                    options={customers}
                    value={field.value}
                    onChange={(nextValue) => {
                      field.onChange(nextValue);
                      form.setValue("projectId", "", { shouldDirty: true });
                    }}
                    placeholder="Select or add a customer"
                  />
                )}
              />
            </div>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1 rounded-md border border-[#8eb8ff] bg-[#eef5ff] px-3 text-[12px] font-medium text-[#408dfb]"
              aria-label="Advanced customer search"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
          {selectedCustomer ? (
            <div className="rounded-md border border-[#dbe7fb] bg-[#f8fbff] px-3 py-2 text-[12px] text-[#4b5563]">
              <div>{selectedCustomer.billingAddress}</div>
              <div className="mt-1 text-[#6b7280]">
                {selectedCustomer.contactEmail} {selectedCustomer.phone ? `· ${selectedCustomer.phone}` : ""}
              </div>
            </div>
          ) : null}
        </FormRow>

        <FormRow label="Location" helperText={`Source of Supply: ${sourceOfSupply}`}>
          <select
            aria-label="Location"
            className="h-9 w-full rounded-md border border-[#d9dee7] bg-white px-3 text-[13px] text-[#1f2937] outline-none focus:border-[#408dfb] focus:ring-2 focus:ring-[#408dfb]/20"
            {...form.register("location")}
          >
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </FormRow>
      </div>
    </section>
  );
}

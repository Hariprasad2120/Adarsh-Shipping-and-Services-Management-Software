"use client";

import {
  CrmButton,
  CrmPanel,
  CrmSection,
  CrmStatus,
} from "@/modules/crm/components/workspace/crm-workspace";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Wand2 } from "lucide-react";
import { CustomerSection } from "@/modules/crm/components/quotes/CustomerSection";
import { QuoteMetaSection } from "@/modules/crm/components/quotes/QuoteMetaSection";
import { ShippingDetailsSection } from "@/modules/crm/components/quotes/ShippingDetailsSection";
import { LineItemsTable } from "@/modules/crm/components/quotes/LineItemsTable";
import { NotesAndTermsSection } from "@/modules/crm/components/quotes/NotesAndTermsSection";
import { FixedActionBar } from "@/modules/crm/components/quotes/FixedActionBar";
import { ConfirmDialog } from "@/modules/crm/components/quotes/ConfirmDialog";
import {defaultQuoteValues,incoterms,locations,pdfTemplates,projects,salespersons,sourceOfSupplyByLocation,containerTypes,} from "@/modules/crm/components/quotes/lib/mock-data";
import { calculateFinalTotal, calculateLineItemAmount } from "@/modules/crm/components/quotes/lib/quote-calculations";
import type {
  QuoteFormValues,
  QuoteStatus,
  QuoteTemplateOption,
  ComboboxOption,
  CustomerOption,
  QuoteWorkflowContext,
} from "@/modules/crm/components/quotes/lib/types";
import { quoteFormSchema } from "@/modules/crm/components/quotes/lib/validation";
import { ButtonLink } from "@/components/ui/button";

import { useRouter } from "next/navigation";
import { saveQuoteAction } from "@/modules/crm/actions";

export function NewQuotePage({
  initialData,
  quoteId,
  salespersons: propSalespersons,
  accounts: propAccounts,
  linkedLeadId,
  workflowContext,
}: {
  initialData?: QuoteFormValues;
  quoteId?: string;
  salespersons?: ComboboxOption[];
  accounts?: CustomerOption[];
  linkedLeadId?: string;
  workflowContext?: QuoteWorkflowContext;
}) {
  const effectiveSalespersons = propSalespersons || salespersons;
  const effectiveAccounts = useMemo(() => propAccounts ?? [], [propAccounts]);
  const router = useRouter();
  const form = useForm<QuoteFormValues, unknown, QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema) as Resolver<QuoteFormValues>,
    defaultValues: initialData || defaultQuoteValues,
    mode: "onBlur",
  });

  const [files, setFiles] = useState<File[]>([]);
  const [template, setTemplate] = useState<QuoteTemplateOption>("Spreadsheet Template");
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const customerId = useWatch({ control: form.control, name: "customerId", defaultValue: initialData?.customerId || defaultQuoteValues.customerId });
  const location = useWatch({ control: form.control, name: "location", defaultValue: initialData?.location || defaultQuoteValues.location });
  const placeOfSupply = useWatch({ control: form.control, name: "placeOfSupply", defaultValue: initialData?.placeOfSupply || "33" });
  const lineItems = useWatch({ control: form.control, name: "lineItems", defaultValue: initialData?.lineItems || defaultQuoteValues.lineItems });
  const discountType = useWatch({ control: form.control, name: "discountType", defaultValue: initialData?.discountType || defaultQuoteValues.discountType });
  const discountValue = useWatch({ control: form.control, name: "discountValue", defaultValue: initialData?.discountValue || defaultQuoteValues.discountValue });
  const adjustment = useWatch({ control: form.control, name: "adjustment", defaultValue: initialData?.adjustment || defaultQuoteValues.adjustment });
  const subtotal = useWatch({ control: form.control, name: "subtotal", defaultValue: initialData?.subtotal || defaultQuoteValues.subtotal });
  const total = useWatch({ control: form.control, name: "total", defaultValue: initialData?.total || defaultQuoteValues.total });

  const selectedCustomer = useMemo(
    () => effectiveAccounts.find((customer) => customer.id === customerId) ?? null,
    [customerId, effectiveAccounts],
  );
  const projectOptions = useMemo(
    () => projects.filter((project) => project.customerId === customerId),
    [customerId],
  );

  const calculations = useMemo(
    () =>
      calculateFinalTotal({
        lineItems,
        discountType,
        discountValue,
        adjustment,
        roundOff: 0,
        location,
        placeOfSupply,
      }),
    [adjustment, discountType, discountValue, lineItems, location, placeOfSupply],
  );

  useEffect(() => {
    if (selectedCustomer && selectedCustomer.gstin) {
      const stateCode = selectedCustomer.gstin.substring(0, 2);
      if (stateCode && /^\d{2}$/.test(stateCode)) {
        form.setValue("placeOfSupply", stateCode, { shouldDirty: true, shouldValidate: true });
      }
    }
  }, [customerId, selectedCustomer, form]);

  useEffect(() => {
    lineItems.forEach((item, index) => {
      const nextAmount = calculateLineItemAmount(item);
      if (item.amount !== nextAmount) {
        form.setValue(`lineItems.${index}.amount`, nextAmount, { shouldDirty: false, shouldValidate: false });
      }
    });

    if (subtotal !== calculations.subtotal) {
      form.setValue("subtotal", calculations.subtotal, { shouldDirty: false, shouldValidate: false });
    }

    if (form.getValues("roundOff") !== calculations.roundOff) {
      form.setValue("roundOff", calculations.roundOff, { shouldDirty: false, shouldValidate: false });
    }

    if (total !== calculations.total) {
      form.setValue("total", calculations.total, { shouldDirty: false, shouldValidate: false });
    }
  }, [calculations.roundOff, calculations.subtotal, calculations.total, form, lineItems, subtotal, total]);

  function fillDemo() {
    const today = new Date();
    const expiry = new Date(today);
    expiry.setDate(expiry.getDate() + 30);
    const suffix = Math.floor(Math.random() * 900 + 100);

    const firstAccount = effectiveAccounts[0];
    const firstSalesperson = effectiveSalespersons[0];

    form.reset({
      customerId: firstAccount?.id ?? "",
      location: "Chennai",
      placeOfSupply: "33",
      quoteNumber: `QT-2026-${suffix}`,
      referenceNumber: `REF-EXP-${suffix}`,
      quoteDate: today.toISOString().slice(0, 10),
      expiryDate: expiry.toISOString().slice(0, 10),
      salesperson: firstSalesperson?.id ?? "",
      projectId: "",
      portOfLoading: "Chennai (INNSA)",
      portOfLoadingCountry: "India",
      portOfDischarge: "Singapore (SGSIN)",
      portOfDestinationCountry: "Singapore",
      incoterm: "FOB",
      containerType: "20FT",
      numberOfContainers: 2,
      commodity: "General Cargo - Machine Parts",
      weight: "12,400 KG",
      lineItems: [
        {
          id: `line_demo_1`,
          description: "Ocean Freight Charges",
          hsnSac: "996719",
          unit: "Container",
          quantity: 2,
          rate: 28500,
          tax: "IGST 18%",
          tds: "None",
          amount: 57000,
        },
        {
          id: `line_demo_2`,
          description: "Documentation & BL Fees",
          hsnSac: "996712",
          unit: "Shipment",
          quantity: 1,
          rate: 3500,
          tax: "GST 18%",
          tds: "None",
          amount: 3500,
        },
        {
          id: `line_demo_3`,
          description: "Port Handling & THC",
          hsnSac: "996712",
          unit: "Container",
          quantity: 2,
          rate: 6200,
          tax: "GST 18%",
          tds: "None",
          amount: 12400,
        },
        {
          id: `line_demo_4`,
          description: "Customs Clearance Charges",
          hsnSac: "996712",
          unit: "Shipment",
          quantity: 1,
          rate: 4800,
          tax: "GST 18%",
          tds: "None",
          amount: 4800,
        },
      ],
      customerNotes: "Rates valid for 30 days from quote date. Subject to space availability at time of booking.",
      terms: "Payment due within 7 days of invoice. All rates in INR. Port surcharges billed actuals.",
      bankDetailsId: "",
      discountType: "percentage",
      discountValue: 0,
      adjustment: 0,
      roundOff: 0,
      subtotal: 77700,
      total: 77700,
    });

    toast.success("Demo data filled");
  }

  async function handlePersist(status: QuoteStatus) {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("Please correct the highlighted fields before continuing.");
      return;
    }

    const isSubmit = status === "sent";
    const values = form.getValues();

    try {
      const res = await saveQuoteAction(
        quoteId,
        values,
        isSubmit,
        linkedLeadId,
        workflowContext,
      );
      if (res.ok) {
        toast.success(isSubmit ? "Quote submitted for approval." : "Quote saved as draft.");
        if (res.data?.id) {
          router.push(`/crm/quotes/${res.data.id}`);
          router.refresh();
        }
      } else {
        toast.error(res.error || "Failed to save quote.");
      }
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "An error occurred while saving.");
    } finally {
      setSendDialogOpen(false);
    }
  }


  return (
    <>
      <div className="space-y-6 pb-8 text-[var(--mnx-text-strong)]">
      <CrmSection
        title={initialData ? "Edit quote workspace" : "Prepare quote workspace"}
        description={
          initialData
            ? "Review the commercial context, adjust line items, and keep the approval trail intact."
            : "Build a customer proposal with operational, pricing, tax, and delivery context."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/crm/quotes" variant="inverse" size="sm">
              Back to quotes
            </ButtonLink>
            {!initialData ? (
              <CrmButton
                type="button"
                onClick={fillDemo}
                variant="outline"
                size="compact"
                className="inline-flex items-center gap-1.5"
              >
                <Wand2 className="size-3.5" />
                Demo fill
              </CrmButton>
            ) : null}
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-4">
            <CrmStatus variant="success">
              {initialData ? "Editing existing quote" : "New draft quote"}
            </CrmStatus>
            <div className="text-sm font-semibold text-[var(--mnx-text-strong)]">
              {form.getValues("quoteNumber") || "Quote number pending"}
            </div>
            <p className="text-sm text-[var(--mnx-text-muted)]">
              Customer-facing document control and approval-ready pricing stay in the shared CRM workflow.
            </p>
            {workflowContext?.latestQuoteVersion ? (
              <p className="text-xs text-[var(--mnx-text-muted)]">
                Next saved revision will continue from V{workflowContext.latestQuoteVersion}.
              </p>
            ) : null}
          </div>
          <div className="space-y-2 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
              Selected customer
            </div>
            <div className="text-sm font-semibold text-[var(--mnx-text-strong)]">
              {selectedCustomer?.label || "Choose a customer"}
            </div>
            <p className="text-sm text-[var(--mnx-text-muted)]">
              Billing, tax jurisdiction, and project options will adapt once the customer is set.
            </p>
          </div>
          <div className="space-y-2 rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface)] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
              Workflow context
            </div>
            <div className="text-sm font-semibold text-[var(--mnx-text-strong)]">
              {linkedLeadId ? "Linked to CRM enquiry flow" : "Standalone commercial draft"}
            </div>
            <p className="text-sm text-[var(--mnx-text-muted)]">
              {linkedLeadId
                ? "This quote remains connected to the originating lead so follow-up and conversion stay traceable."
                : "Use this mode to prepare a proposal directly from the quotes workspace."}
            </p>
            {workflowContext ? (
              <p className="text-xs text-[var(--mnx-text-muted)]">
                Mode: {workflowContext.mode.replace(/-/g, " ")}. Included departments:{" "}
                {workflowContext.includedDepartments.length
                  ? workflowContext.includedDepartments
                      .map((item) =>
                        item === "FREIGHT_FORWARDING"
                          ? "Freight Forwarding"
                          : "Customs Clearance",
                      )
                      .join(", ")
                  : "none"}.
              </p>
            ) : null}
          </div>
        </div>
      </CrmSection>

      {workflowContext?.pendingDepartments?.length ? (
        <CrmPanel className="border-[var(--mnx-warning)]/30 bg-[var(--mnx-warning-bg)]/25 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <CrmStatus variant="warning">Pending department rates</CrmStatus>
            <p className="text-sm text-[var(--mnx-text-muted)]">
              {workflowContext.pendingDepartments
                .map((item) =>
                  item === "FREIGHT_FORWARDING"
                    ? "Freight Forwarding"
                    : "Customs Clearance",
                )
                .join(" and ")}{" "}
              rates are still pending. You can still save or submit this partial quotation.
            </p>
          </div>
        </CrmPanel>
      ) : null}

      <CrmPanel>
        <CustomerSection
          form={form}
          customers={effectiveAccounts}
          locations={locations}
          sourceOfSupply={sourceOfSupplyByLocation[location as keyof typeof sourceOfSupplyByLocation] ?? "Tamil Nadu"}
          selectedCustomer={selectedCustomer}
        />
      </CrmPanel>

      <CrmPanel>
        <QuoteMetaSection
          form={form}
          salespersons={effectiveSalespersons}
          projectOptions={projectOptions}
          hasCustomer={!!selectedCustomer}
        />
      </CrmPanel>

      <CrmPanel>
        <ShippingDetailsSection form={form} incoterms={incoterms} containerTypes={containerTypes} />
      </CrmPanel>

      <CrmPanel>
        <LineItemsTable form={form} />
      </CrmPanel>

      <CrmPanel>
        <NotesAndTermsSection
          form={form}
          files={files}
          onFilesChange={setFiles}
          discountAmount={calculations.discountAmount}
          cgst={calculations.cgst}
          sgst={calculations.sgst}
          igst={calculations.igst}
        />
      </CrmPanel>

      <CrmPanel>
        <FixedActionBar
          onSaveDraft={() => handlePersist("draft")}
          onSaveSend={async () => {
            const isValid = await form.trigger();
            if (!isValid) {
              toast.error("Please correct the highlighted fields before sending.");
              return;
            }
            setSendDialogOpen(true);
          }}
          onCancel={() => {
            if (form.formState.isDirty || files.length) {
              setCancelDialogOpen(true);
              return;
            }
            window.history.back();
          }}
          template={template}
          templateOptions={pdfTemplates}
          templateMenuOpen={templateMenuOpen}
          onToggleTemplateMenu={() => setTemplateMenuOpen((current) => !current)}
          onTemplateChange={(nextTemplate) => {
            setTemplate(nextTemplate);
            setTemplateMenuOpen(false);
          }}
        />
      </CrmPanel>
      </div>
      <ConfirmDialog
        open={sendDialogOpen}
        title="Send Quote"
        description="Save and send this quote to the customer?"
        confirmLabel="Confirm"
        onCancel={() => setSendDialogOpen(false)}
        onConfirm={() => handlePersist("sent")}
      />

      <ConfirmDialog
        open={cancelDialogOpen}
        title="Discard Changes"
        description="You have unsaved changes. Are you sure you want to cancel this quote?"
        confirmLabel="Discard"
        onCancel={() => setCancelDialogOpen(false)}
        onConfirm={() => {
          setCancelDialogOpen(false);
          window.history.back();
        }}
      />
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Wand2 } from "lucide-react";
import { CustomerSection } from "./CustomerSection";
import { QuoteMetaSection } from "./QuoteMetaSection";
import { ShippingDetailsSection } from "./ShippingDetailsSection";
import { LineItemsTable } from "./LineItemsTable";
import { NotesAndTermsSection } from "./NotesAndTermsSection";
import { FixedActionBar } from "./FixedActionBar";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  defaultQuoteValues,
  incoterms,
  locations,
  pdfTemplates,
  projects,
  salespersons,
  sourceOfSupplyByLocation,
  containerTypes,
} from "../_lib/mock-data";
import { calculateFinalTotal, calculateLineItemAmount } from "../_lib/quote-calculations";
import type { QuoteFormValues, QuoteStatus, QuoteTemplateOption, ComboboxOption, CustomerOption } from "../_lib/types";
import { quoteFormSchema } from "../_lib/validation";

function buildQuotePayload(values: QuoteFormValues, status: QuoteStatus, attachments: File[]) {
  return {
    ...values,
    status,
    attachments: attachments.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    })),
  };
}

async function saveQuoteDraft(payload: ReturnType<typeof buildQuotePayload>) {
  console.log("saveQuoteDraft", payload);
  return payload;
}

async function saveQuoteAndSend(payload: ReturnType<typeof buildQuotePayload>) {
  console.log("saveQuoteAndSend", payload);
  return payload;
}

import { useRouter } from "next/navigation";
import { saveQuoteAction } from "@/modules/crm/actions";

export function NewQuotePage({
  initialData,
  quoteId,
  salespersons: propSalespersons,
  accounts: propAccounts,
}: {
  initialData?: QuoteFormValues;
  quoteId?: string;
  salespersons?: ComboboxOption[];
  accounts?: CustomerOption[];
}) {
  const effectiveSalespersons = propSalespersons || salespersons;
  const effectiveAccounts = propAccounts ?? [];
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
      }),
    [adjustment, discountType, discountValue, lineItems],
  );

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
      const res = await saveQuoteAction(quoteId, values, isSubmit);
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
    <div className="min-h-screen bg-[#f7f9fb] text-[#1f2937]">
      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col">
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="bg-white">
            <div className="border-b border-[#dfe6f3] bg-[#f8f9fa] px-6 py-4 flex items-center gap-4">
              <Link
                href="/crm/quotes"
                className="inline-flex size-10 items-center justify-center rounded-xl border border-[#dbe3f0] bg-white text-[#5d6c86] shadow-sm hover:bg-surface-container-low transition-colors"
                aria-label="Back to quotes"
              >
                <ArrowLeft className="size-4" />
              </Link>
              <div className="flex-1">
                <h1 className="text-xl font-bold tracking-tight text-[#0f172a] uppercase font-sans">
                  {initialData ? "Edit Quote" : "New Quote"}
                </h1>
                <p className="text-xs text-[#64748b]">
                  {initialData ? "Modify existing quote details" : "Create a new quotation for a customer"}
                </p>
              </div>
              {!initialData && (
                <button
                  type="button"
                  onClick={fillDemo}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#00cec4] bg-[rgba(0,206,196,0.06)] px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#00cec4] transition-colors hover:bg-[rgba(0,206,196,0.12)]"
                >
                  <Wand2 className="size-3.5" />
                  Demo Fill
                </button>
              )}
            </div>
            <CustomerSection
              form={form}
              customers={effectiveAccounts}
              locations={locations}
              sourceOfSupply={sourceOfSupplyByLocation[location as keyof typeof sourceOfSupplyByLocation] ?? "Tamil Nadu"}
              selectedCustomer={selectedCustomer}
            />
            <QuoteMetaSection
              form={form}
              salespersons={effectiveSalespersons}
              projectOptions={projectOptions}
              hasCustomer={!!selectedCustomer}
            />
            <ShippingDetailsSection form={form} incoterms={incoterms} containerTypes={containerTypes} />
            <LineItemsTable form={form} />
            <NotesAndTermsSection form={form} files={files} onFilesChange={setFiles} discountAmount={calculations.discountAmount} />
          </div>
        </main>

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
    </div>
  );
}

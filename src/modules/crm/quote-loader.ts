import { db } from "@/lib/db";
import { MOCK_ITEMS } from "@/lib/items/mock-data";
import type { QuoteDetailRecord, QuoteListStatus } from "@/modules/crm/components/quotes/lib/types";
import type { QuoteWorkflowContext } from "@/modules/crm/components/quotes/lib/types";
import { getStateCodeForLocation } from "@/modules/crm/components/quotes/lib/gst-states";
import { mapQuoteApprovalStatusToListStatus } from "@/modules/crm/approval-workflow";

export async function loadQuoteDetailRecord(
  quoteId: string,
  orgId: string,
): Promise<QuoteDetailRecord | null> {
  const dbQuote = await db.crmInvoice.findFirst({
    where: { id: quoteId, orgId, type: "QUOTE" },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          billingAddress: true,
          shippingAddress: true,
          gstin: true,
        },
      },
      owner: { select: { name: true } },
      items: true,
    },
  });

  if (!dbQuote) return null;

  const quote: QuoteDetailRecord = {
    id: dbQuote.id,
    date: dbQuote.date.toISOString().split("T")[0],
    location: dbQuote.location || "Chennai",
    quoteNumber: dbQuote.invoiceNumber,
    referenceNumber: dbQuote.referenceNumber || dbQuote.invoiceNumber,
    customerName: dbQuote.account?.name || "Cash Customer",
    status: mapQuoteApprovalStatusToListStatus(
      dbQuote.approvalStatus || dbQuote.status || "draft",
    ) as Exclude<QuoteListStatus, "all">,
    amount: dbQuote.total,
    creationDate: dbQuote.createdAt.toISOString().split("T")[0],
    salesperson: dbQuote.owner?.name || "Admin User",
    placeOfSupply: dbQuote.placeOfSupply || "33",
    pdfTemplate: "Spreadsheet Template",
    customerInitial: (dbQuote.account?.name || "C").charAt(0).toUpperCase(),
    customerEmail: dbQuote.account?.email || undefined,
    billingAddress: dbQuote.account?.billingAddress || "",
    shippingAddress: dbQuote.account?.shippingAddress || "",
    notes: dbQuote.manualNotes || "",
    terms: dbQuote.terms || "",
    bankDetailsId: dbQuote.bankDetails || "",
    items: dbQuote.items.map((item) => ({
      id: item.id,
      name: item.productName,
      description: item.productName,
      hsnSac: MOCK_ITEMS.find((catalogItem) => catalogItem.name === item.productName)?.hsnSac || "",
      quantity: item.qty,
      unit: item.unit || "PCS",
      price: item.rate,
      tax: item.taxLabel || `GST ${item.taxPercent}%`,
      tds: item.tds || "None",
      amount: item.amount,
      currency: item.currency || "INR",
      exchangeRate: item.exchangeRate || 1,
    })),
    taxes: (() => {
      const supplierStateCode = getStateCodeForLocation(dbQuote.location || "Chennai");
      const isSameState = supplierStateCode && supplierStateCode === dbQuote.placeOfSupply;
      if (isSameState) {
        return [
          { label: "CGST", amount: dbQuote.tax / 2 },
          { label: "SGST", amount: dbQuote.tax / 2 },
        ];
      }
      return [{ label: "IGST", amount: dbQuote.tax }];
    })(),
    discount: dbQuote.discount,
    discountType: dbQuote.discountType || "percentage",
    adjustment: 0,
    roundOff: 0,
    subtotal: dbQuote.total - dbQuote.tax,
    total: dbQuote.total,
    portOfLoading: dbQuote.portOfLoading || "",
    portOfLoadingCountry: dbQuote.portOfLoadingCountry || "",
    portOfDischarge: dbQuote.portOfDischarge || "",
    portOfDestinationCountry: dbQuote.portOfDestinationCountry || "",
    incoterm: dbQuote.incoterm || "",
    containerType: dbQuote.containerType || "",
    numberOfContainers: dbQuote.numberOfContainers || 0,
    commodity: dbQuote.commodity || "",
    weight: dbQuote.weight || "",
    versionNumber: dbQuote.sourceQuotationVersion || 1,
    rootQuoteNumber: dbQuote.sourceQuotationNumber || dbQuote.invoiceNumber,
    workflowContext: (dbQuote.sourceQuotationSnapshot as QuoteWorkflowContext | null) || null,
  };

  return quote;
}

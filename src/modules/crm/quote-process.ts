import "server-only";

import { db } from "@/lib/db";
import type {
  FreightBookingFormData,
} from "@/modules/freight-forwarding/booking-shared";
import type { QuoteWorkflowContext } from "@/modules/crm/components/quotes/lib/types";

type QuoteProcessWorkflowContext = QuoteWorkflowContext & {
  conversion?: QuoteWorkflowContext["conversion"] & {
    chaStatus?: "CREATED" | "PROCESSING_PENDING" | "PROCESSING" | null;
    freightStatus?: "CREATED" | "PROCESSING_PENDING" | null;
  };
};

export type QuoteProcessRecord = {
  id: string;
  quoteNumber: string;
  referenceNumber: string;
  customerId: string | null;
  customerName: string;
  ownerId: string | null;
  ownerName: string | null;
  location: string | null;
  portOfLoading: string | null;
  portOfDischarge: string | null;
  portOfDestinationCountry: string | null;
  incoterm: string | null;
  commodity: string | null;
  weight: string | null;
  containerType: string | null;
  numberOfContainers: number | null;
  sourceSnapshot: Record<string, unknown> | null;
  workflowContext: QuoteProcessWorkflowContext | null;
  createdAt: string;
};

function readWorkflowContext(
  snapshot: unknown,
): QuoteProcessWorkflowContext | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }

  return snapshot as QuoteProcessWorkflowContext;
}

function toProcessRecord(row: {
  id: string;
  invoiceNumber: string;
  referenceNumber: string | null;
  accountId: string | null;
  account: { name: string } | null;
  ownerId: string | null;
  owner: { name: string | null } | null;
  location: string | null;
  portOfLoading: string | null;
  portOfDischarge: string | null;
  portOfDestinationCountry: string | null;
  incoterm: string | null;
  commodity: string | null;
  weight: string | null;
  containerType: string | null;
  numberOfContainers: number | null;
  sourceQuotationSnapshot: unknown;
  createdAt: Date;
}) {
  return {
    id: row.id,
    quoteNumber: row.invoiceNumber,
    referenceNumber: row.referenceNumber || row.invoiceNumber,
    customerId: row.accountId,
    customerName: row.account?.name || "Cash Customer",
    ownerId: row.ownerId,
    ownerName: row.owner?.name ?? null,
    location: row.location,
    portOfLoading: row.portOfLoading,
    portOfDischarge: row.portOfDischarge,
    portOfDestinationCountry: row.portOfDestinationCountry,
    incoterm: row.incoterm,
    commodity: row.commodity,
    weight: row.weight,
    containerType: row.containerType,
    numberOfContainers: row.numberOfContainers,
    sourceSnapshot:
      row.sourceQuotationSnapshot &&
      typeof row.sourceQuotationSnapshot === "object" &&
      !Array.isArray(row.sourceQuotationSnapshot)
        ? (row.sourceQuotationSnapshot as Record<string, unknown>)
        : null,
    workflowContext: readWorkflowContext(row.sourceQuotationSnapshot),
    createdAt: row.createdAt.toISOString(),
  } satisfies QuoteProcessRecord;
}

async function listQueuedQuoteProcesses(orgId: string) {
  const rows = await db.crmInvoice.findMany({
    where: {
      orgId,
      type: "QUOTE",
      approvalStatus: "BOOKING_CREATED",
    },
    select: {
      id: true,
      invoiceNumber: true,
      referenceNumber: true,
      accountId: true,
      account: { select: { name: true } },
      ownerId: true,
      owner: { select: { name: true } },
      location: true,
      portOfLoading: true,
      portOfDischarge: true,
      portOfDestinationCountry: true,
      incoterm: true,
      commodity: true,
      weight: true,
      containerType: true,
      numberOfContainers: true,
      sourceQuotationSnapshot: true,
      createdAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map(toProcessRecord);
}

export async function listPendingFreightQuoteProcesses(orgId: string) {
  const quotes = await listQueuedQuoteProcesses(orgId);
  return quotes.filter(
    (quote) =>
      quote.workflowContext?.conversion?.freightStatus === "PROCESSING_PENDING",
  );
}

export async function listPendingChaQuoteProcesses(orgId: string) {
  const quotes = await listQueuedQuoteProcesses(orgId);
  return quotes.filter(
    (quote) =>
      quote.workflowContext?.conversion?.chaStatus === "PROCESSING_PENDING",
  );
}

export async function getQuoteProcessRecord(orgId: string, quoteId: string) {
  const row = await db.crmInvoice.findFirst({
    where: {
      id: quoteId,
      orgId,
      type: "QUOTE",
      approvalStatus: "BOOKING_CREATED",
    },
    select: {
      id: true,
      invoiceNumber: true,
      referenceNumber: true,
      accountId: true,
      account: { select: { name: true } },
      ownerId: true,
      owner: { select: { name: true } },
      location: true,
      portOfLoading: true,
      portOfDischarge: true,
      portOfDestinationCountry: true,
      incoterm: true,
      commodity: true,
      weight: true,
      containerType: true,
      numberOfContainers: true,
      sourceQuotationSnapshot: true,
      createdAt: true,
    },
  });

  return row ? toProcessRecord(row) : null;
}

export function buildFreightProcessDraftFromQuote(
  quote: QuoteProcessRecord,
): FreightBookingFormData {
  const customerName = quote.customerName || "Customer";
  const reference = quote.referenceNumber || quote.quoteNumber;

  return {
    bookingPartyId: quote.customerId || "",
    salespersonId: quote.ownerId || "",
    origin: quote.location || "",
    portOfLoad: quote.portOfLoading || "",
    portOfDischarge: quote.portOfDischarge || "",
    finalDestination: quote.portOfDestinationCountry || quote.portOfDischarge || "",
    blNumber: "",
    linerBooking: "",
    linerBlNumber: "",
    blType: "",
    serviceType: "PORT_TO_PORT",
    masterBlNumber: "",
    notes: "",
    freeDaysOrigin: "0",
    freeDaysDestination: "0",
    customsVoyageType: "DIRECT",
    customsVoyage: "",
    transshipmentVoyage: "",
    transshipmentVessel: "",
    linerName: "",
    linerVessel: "",
    linerVoyage: "",
    eta: "",
    etd: "",
    importVessel: "",
    importVoyage: "",
    freightTerm: "PREPAID",
    cargo: "GENERAL",
    surrenderStatus: "ORIGINAL",
    term: quote.incoterm || "FOB",
    csPersonId: quote.ownerId || "",
    handledById: quote.ownerId || "",
    depot: "",
    terminal: "",
    jobNumber: reference,
    shipper: customerName,
    consignee: customerName,
    notifyParty: customerName,
    bookingAgentId: "",
    destinationAgentId: "",
    cargoDescription: quote.commodity || "",
    marksAndNumbers: "",
    comments: "",
    internalNotes: `Created from approved quotation ${quote.quoteNumber}.`,
    attachmentName: quote.quoteNumber,
  };
}

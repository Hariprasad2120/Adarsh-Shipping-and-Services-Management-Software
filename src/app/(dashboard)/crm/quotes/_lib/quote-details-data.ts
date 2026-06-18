import { customers, sourceOfSupplyByLocation } from "./mock-data";
import { quoteRecords } from "./quote-list-data";
import type { QuoteDetailItem, QuoteDetailRecord, QuoteRecord } from "./types";

const serviceTemplates = [
  { name: "Ocean Freight", note: "Base freight allocation" },
  { name: "Terminal Handling Charges", note: "Port-side handling" },
  { name: "Customs Clearance", note: "Documentation and clearance" },
  { name: "Container Pickup", note: "Pickup and movement support" },
  { name: "Insurance", note: "Cargo protection cover" },
];

const itemSplit = [0.52, 0.16, 0.13, 0.11, 0.08];

function formatReference(record: QuoteRecord) {
  const suffix = record.quoteNumber.split("-").slice(-1)[0];
  return `REF-${record.location.slice(0, 3).toUpperCase()}-${suffix}`;
}

function buildItems(subtotal: number, seed: number): QuoteDetailItem[] {
  let running = 0;

  return serviceTemplates.map((service, index) => {
    const isLast = index === serviceTemplates.length - 1;
    const amount = isLast ? subtotal - running : Math.round(subtotal * itemSplit[index]);
    running += amount;

    return {
      id: `item_${seed}_${index + 1}`,
      name: service.name,
      description: `${service.note} for quote batch ${seed + 1}`,
      quantity: 1,
      price: amount,
      amount,
    };
  });
}

function buildQuoteDetail(record: QuoteRecord, index: number): QuoteDetailRecord {
  const subtotal = Math.round(record.amount / 1.18);
  const cgst = Math.round(subtotal * 0.09);
  const sgst = Math.round(subtotal * 0.09);
  const roundOff = record.amount - subtotal - cgst - sgst;
  const sourceOfSupply = sourceOfSupplyByLocation[record.location as keyof typeof sourceOfSupplyByLocation] ?? record.location;
  const customerDirectory = customers[index % customers.length];

  return {
    ...record,
    referenceNumber: record.referenceNumber ?? formatReference(record),
    creationDate: record.date,
    salesperson: index % 3 === 0 ? "Hari Prasad" : index % 3 === 1 ? "Purushothaman" : "Admin User",
    placeOfSupply: sourceOfSupply,
    pdfTemplate: index % 2 === 0 ? "Spreadsheet Template" : "Standard Template",
    customerInitial: record.customerName.charAt(0).toUpperCase(),
    billingAddress:
      index === 0
        ? "Old No. 14, New No. 28, NSC Bose Road, Chennai 600001"
        : customerDirectory.billingAddress ?? `${record.location} trade lane office`,
    shippingAddress:
      index === 0 ? "Adarsh Yard, Ennore Expressway, Chennai 600057" : `${record.location} destination warehouse`,
    notes: "Looking forward for your business.",
    terms: index % 2 === 0 ? "Payment due within 7 days from approval of the quotation." : "No Terms and Conditions",
    items: buildItems(subtotal, index),
    taxes: [
      { label: "CGST 9%", amount: cgst },
      { label: "SGST 9%", amount: sgst },
    ],
    discount: 0,
    adjustment: 0,
    roundOff,
    subtotal,
    total: record.amount,
  };
}

export const quoteDetails: QuoteDetailRecord[] = quoteRecords.map(buildQuoteDetail);

export function getQuoteDetailById(quoteId: string) {
  return quoteDetails.find((quote) => quote.id === quoteId) ?? null;
}

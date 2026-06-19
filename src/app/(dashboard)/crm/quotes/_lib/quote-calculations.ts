import type { LineItem, QuoteFormValues } from "./types";
import { getStateCodeForLocation } from "./gst-states";

function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateLineItemAmount(item: Pick<LineItem, "quantity" | "rate" | "exchangeRate">) {
  const rate = safeNumber(item.rate);
  const qty = safeNumber(item.quantity);
  const xr = safeNumber(item.exchangeRate ?? 1);
  return qty * rate * xr;
}

export function calculateSubtotal(lineItems: LineItem[]) {
  return lineItems.reduce((sum, item) => sum + calculateLineItemAmount(item), 0);
}

export function calculateDiscountAmount(subtotal: number, discountType: QuoteFormValues["discountType"], discountValue: number) {
  const safeSubtotal = safeNumber(subtotal);
  const safeDiscountValue = Math.max(0, safeNumber(discountValue));
  if (discountType === "percentage") {
    return (safeSubtotal * safeDiscountValue) / 100;
  }
  return safeDiscountValue;
}

export function calculateFinalTotal(values: Pick<QuoteFormValues, "lineItems" | "discountType" | "discountValue" | "adjustment" | "roundOff" | "location" | "placeOfSupply">) {
  const subtotal = calculateSubtotal(values.lineItems);
  const discountAmount = calculateDiscountAmount(subtotal, values.discountType, values.discountValue);
  const adjustment = safeNumber(values.adjustment);
  
  // Calculate total GST
  let totalGst = 0;
  values.lineItems.forEach((item) => {
    const itemAmount = calculateLineItemAmount(item);
    const taxPercent = parseFloat(String(item.tax).match(/[\d.]+/)?.[0] ?? "0");
    totalGst += itemAmount * (taxPercent / 100);
  });

  const supplierStateCode = getStateCodeForLocation(values.location);
  const isSameState = supplierStateCode && supplierStateCode === values.placeOfSupply;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isSameState) {
    cgst = totalGst / 2;
    sgst = totalGst / 2;
  } else {
    igst = totalGst;
  }

  const baseTotal = subtotal - discountAmount + adjustment + totalGst;
  const roundedTotal = Math.round(baseTotal);
  const roundOff = roundedTotal - baseTotal;
  const total = roundedTotal;

  return {
    subtotal,
    discountAmount,
    totalGst,
    cgst,
    sgst,
    igst,
    roundOff,
    total: Number.isFinite(total) ? total : 0,
  };
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}


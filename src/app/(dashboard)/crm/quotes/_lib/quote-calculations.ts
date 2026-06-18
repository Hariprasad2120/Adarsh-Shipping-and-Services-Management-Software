import type { LineItem, QuoteFormValues } from "./types";

function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateLineItemAmount(item: Pick<LineItem, "quantity" | "rate">) {
  return safeNumber(item.quantity) * safeNumber(item.rate);
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

export function calculateFinalTotal(values: Pick<QuoteFormValues, "lineItems" | "discountType" | "discountValue" | "adjustment" | "roundOff">) {
  const subtotal = calculateSubtotal(values.lineItems);
  const discountAmount = calculateDiscountAmount(subtotal, values.discountType, values.discountValue);
  const adjustment = safeNumber(values.adjustment);
  const baseTotal = subtotal - discountAmount + adjustment;
  const roundedTotal = Math.round(baseTotal);
  const roundOff = roundedTotal - baseTotal;
  const total = roundedTotal;

  return {
    subtotal,
    discountAmount,
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

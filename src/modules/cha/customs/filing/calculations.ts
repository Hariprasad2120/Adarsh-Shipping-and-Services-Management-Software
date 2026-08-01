import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { ExportInvoiceDraftInput, ExportItemDraftInput } from "./export-schemas";
import type { ImportInvoiceDraftInput, ImportItemDraftInput } from "./import-schemas";

export type CalculationRequirement = {
  field: string;
  message: string;
};

type DecimalLike = Prisma.Decimal | string | number | null | undefined;

function decimal(value: DecimalLike) {
  if (value instanceof Prisma.Decimal) return value;
  if (typeof value === "number") return new Prisma.Decimal(value);
  if (typeof value === "string" && value.trim()) return new Prisma.Decimal(value.trim());
  return new Prisma.Decimal(0);
}

function text(value: DecimalLike) {
  return decimal(value).toFixed();
}

function hasValue(value: DecimalLike) {
  return typeof value === "string" ? value.trim().length > 0 : value != null;
}

function safeDiv(numerator: Prisma.Decimal, denominator: DecimalLike) {
  const divisor = decimal(denominator);
  return divisor.equals(0) ? numerator : numerator.div(divisor);
}

function nearlyEqual(left: DecimalLike, right: DecimalLike, scale = "0.0001") {
  return decimal(left).minus(decimal(right)).abs().lte(new Prisma.Decimal(scale));
}

export function calculateImportInvoiceTotals(invoice: ImportInvoiceDraftInput) {
  const requirements: CalculationRequirement[] = [];
  const invoiceValue = decimal(invoice.invoiceValue);
  const exchangeRate = decimal(invoice.exchangeRate);
  const positiveCharges = invoice.charges.filter((charge) => !charge.isActual || hasValue(charge.amount));
  const invoiceValueInr = invoiceValue.mul(exchangeRate);
  const chargesInr = positiveCharges.reduce(
    (sum, charge) => sum.plus(decimal(charge.amount).mul(decimal(charge.exchangeRate))),
    new Prisma.Decimal(0),
  );
  const chargesFc = positiveCharges.reduce(
    (sum, charge) => sum.plus(decimal(charge.amount)),
    new Prisma.Decimal(0),
  );
  const assessableValueFc = invoiceValue.plus(chargesFc);
  const assessableValueInr = invoiceValueInr.plus(chargesInr);

  if (!hasValue(invoice.currency)) {
    requirements.push({ field: `invoice:${invoice.sequenceNo}:currency`, message: `Invoice ${invoice.sequenceNo} needs a currency before INR totals are authoritative.` });
  }
  if (!hasValue(invoice.exchangeRate)) {
    requirements.push({ field: `invoice:${invoice.sequenceNo}:exchangeRate`, message: `Invoice ${invoice.sequenceNo} needs an exchange rate before INR totals are authoritative.` });
  }
  if (!nearlyEqual(invoice.invoiceValueInr, invoiceValueInr)) {
    requirements.push({ field: `invoice:${invoice.sequenceNo}:invoiceValueInr`, message: `Invoice ${invoice.sequenceNo} INR total differs from the server Decimal calculation.` });
  }
  if (!nearlyEqual(invoice.assessableValueFc, assessableValueFc)) {
    requirements.push({ field: `invoice:${invoice.sequenceNo}:assessableValueFc`, message: `Invoice ${invoice.sequenceNo} assessable FC differs from the server Decimal calculation.` });
  }
  if (!nearlyEqual(invoice.assessableValueInr, assessableValueInr)) {
    requirements.push({ field: `invoice:${invoice.sequenceNo}:assessableValueInr`, message: `Invoice ${invoice.sequenceNo} assessable INR differs from the server Decimal calculation.` });
  }

  return {
    invoiceValueInr: text(invoiceValueInr),
    assessableValueFc: text(assessableValueFc),
    assessableValueInr: text(assessableValueInr),
    chargesInr: text(chargesInr),
    requirements,
    rulesetVersion: "IMPORT_BE_SERVER_RULES_V1",
  };
}

export function calculateImportItemTotals(
  item: ImportItemDraftInput,
  linkedInvoice?: Pick<ImportInvoiceDraftInput, "sequenceNo" | "exchangeRate" | "currency"> | null,
) {
  const requirements: CalculationRequirement[] = [];
  const quantity = decimal(item.quantity);
  const unitPrice = decimal(item.unitPrice);
  const per = decimal(item.per);
  const itemAmount = safeDiv(quantity.mul(unitPrice), per.equals(0) ? 1 : per);
  const exchangeRate = linkedInvoice ? decimal(linkedInvoice.exchangeRate) : new Prisma.Decimal(0);
  const itemAmountInr = linkedInvoice ? itemAmount.mul(exchangeRate) : new Prisma.Decimal(0);

  if (!linkedInvoice) {
    requirements.push({ field: `item:${item.sequenceNo}:invoiceSequenceNo`, message: `Import item ${item.sequenceNo} must link to an invoice before INR calculations are authoritative.` });
  } else if (!hasValue(linkedInvoice.exchangeRate)) {
    requirements.push({ field: `item:${item.sequenceNo}:exchangeRate`, message: `Linked invoice ${linkedInvoice.sequenceNo} needs an exchange rate before import item INR totals are authoritative.` });
  }
  if (!nearlyEqual(item.itemAmount, itemAmount)) {
    requirements.push({ field: `item:${item.sequenceNo}:itemAmount`, message: `Import item ${item.sequenceNo} amount FC differs from the server Decimal calculation.` });
  }
  if (linkedInvoice && !nearlyEqual(item.itemAmountInr, itemAmountInr)) {
    requirements.push({ field: `item:${item.sequenceNo}:itemAmountInr`, message: `Import item ${item.sequenceNo} amount INR differs from the linked invoice exchange-rate calculation.` });
  }

  return {
    itemAmount: text(itemAmount),
    itemAmountInr: linkedInvoice ? text(itemAmountInr) : "",
    requirements,
    rulesetVersion: "IMPORT_BE_SERVER_RULES_V1",
  };
}

export function calculateExportInvoiceTotals(invoice: ExportInvoiceDraftInput) {
  const requirements: CalculationRequirement[] = [];
  const productValue = decimal(invoice.productValue);
  const exchangeRate = decimal(invoice.exchangeRate);
  const positiveCharges = invoice.charges.filter((charge) => !charge.isDeduction);
  const deductionCharges = invoice.charges.filter((charge) => charge.isDeduction);
  const invoiceValueFc = productValue
    .plus(positiveCharges.reduce((sum, charge) => sum.plus(decimal(charge.amount)), new Prisma.Decimal(0)))
    .minus(deductionCharges.reduce((sum, charge) => sum.plus(decimal(charge.amount)), new Prisma.Decimal(0)));
  const invoiceValueInr = decimal(invoice.productValueInr)
    .plus(positiveCharges.reduce((sum, charge) => sum.plus(decimal(charge.amountInr)), new Prisma.Decimal(0)))
    .minus(deductionCharges.reduce((sum, charge) => sum.plus(decimal(charge.amountInr)), new Prisma.Decimal(0)));
  const fobDiscountFc = invoice.charges
    .filter((charge) => String(charge.chargeType).toUpperCase() === "FOB_DISCOUNT")
    .reduce((sum, charge) => sum.plus(decimal(charge.amount)), new Prisma.Decimal(0));
  const fobDiscountInr = invoice.charges
    .filter((charge) => String(charge.chargeType).toUpperCase() === "FOB_DISCOUNT")
    .reduce((sum, charge) => sum.plus(decimal(charge.amountInr)), new Prisma.Decimal(0));
  const fobValueFc = invoiceValueFc.minus(fobDiscountFc);
  const fobValueInr = invoiceValueInr.minus(fobDiscountInr);
  const productValueInr = productValue.mul(exchangeRate);

  if (!hasValue(invoice.currency)) {
    requirements.push({ field: `exportInvoice:${invoice.sequenceNo}:currency`, message: `Export invoice ${invoice.sequenceNo} needs a currency before FC/INR totals are authoritative.` });
  }
  if (!hasValue(invoice.exchangeRate)) {
    requirements.push({ field: `exportInvoice:${invoice.sequenceNo}:exchangeRate`, message: `Export invoice ${invoice.sequenceNo} needs an exchange rate before FC/INR totals are authoritative.` });
  }
  if (!nearlyEqual(invoice.productValueInr, productValueInr)) {
    requirements.push({ field: `exportInvoice:${invoice.sequenceNo}:productValueInr`, message: `Export invoice ${invoice.sequenceNo} product value INR differs from the server Decimal calculation.` });
  }
  if (!nearlyEqual(invoice.invoiceValueFc, invoiceValueFc) && !invoice.calculationOverrideReason?.trim()) {
    requirements.push({ field: `exportInvoice:${invoice.sequenceNo}:invoiceValueFc`, message: `Export invoice ${invoice.sequenceNo} total FC differs from the server Decimal calculation and needs an override reason.` });
  }
  if (!nearlyEqual(invoice.invoiceValueInr, invoiceValueInr) && !invoice.calculationOverrideReason?.trim()) {
    requirements.push({ field: `exportInvoice:${invoice.sequenceNo}:invoiceValueInr`, message: `Export invoice ${invoice.sequenceNo} total INR differs from the server Decimal calculation and needs an override reason.` });
  }
  if (!nearlyEqual(invoice.fobValueFc, fobValueFc) && !invoice.calculationOverrideReason?.trim()) {
    requirements.push({ field: `exportInvoice:${invoice.sequenceNo}:fobValueFc`, message: `Export invoice ${invoice.sequenceNo} FOB FC differs from the server Decimal calculation and needs an override reason.` });
  }
  if (!nearlyEqual(invoice.fobValueInr, fobValueInr) && !invoice.calculationOverrideReason?.trim()) {
    requirements.push({ field: `exportInvoice:${invoice.sequenceNo}:fobValueInr`, message: `Export invoice ${invoice.sequenceNo} FOB INR differs from the server Decimal calculation and needs an override reason.` });
  }

  return {
    productValueInr: text(productValueInr),
    invoiceValueFc: text(invoiceValueFc),
    invoiceValueInr: text(invoiceValueInr),
    fobValueFc: text(fobValueFc),
    fobValueInr: text(fobValueInr),
    requirements,
    rulesetVersion: "EXPORT_SB_SERVER_RULES_V1",
  };
}

export function calculateExportItemTotals(
  item: ExportItemDraftInput,
  linkedInvoice?: Pick<ExportInvoiceDraftInput, "sequenceNo" | "exchangeRate" | "currency"> | null,
) {
  const requirements: CalculationRequirement[] = [];
  const quantity = decimal(item.quantity);
  const unitPrice = decimal(item.unitPrice);
  const per = decimal(item.per);
  const itemAmount = safeDiv(quantity.mul(unitPrice), per.equals(0) ? 1 : per);
  const exchangeRate = linkedInvoice ? decimal(linkedInvoice.exchangeRate) : new Prisma.Decimal(0);
  const itemAmountInr = linkedInvoice ? itemAmount.mul(exchangeRate) : new Prisma.Decimal(0);
  const taxableValue = hasValue(item.taxableValue) ? decimal(item.taxableValue) : itemAmountInr;
  const igstAmount = taxableValue.mul(decimal(item.igstRate)).div(100);

  if (!linkedInvoice) {
    requirements.push({ field: `exportItem:${item.sequenceNo}:invoiceSequenceNo`, message: `Export item ${item.sequenceNo} must link to an invoice before INR totals are authoritative.` });
  } else if (!hasValue(linkedInvoice.exchangeRate)) {
    requirements.push({ field: `exportItem:${item.sequenceNo}:exchangeRate`, message: `Linked export invoice ${linkedInvoice.sequenceNo} needs an exchange rate before item INR totals are authoritative.` });
  }
  if (!nearlyEqual(item.itemAmount, itemAmount)) {
    requirements.push({ field: `exportItem:${item.sequenceNo}:itemAmount`, message: `Export item ${item.sequenceNo} amount FC differs from the server Decimal calculation.` });
  }
  if (linkedInvoice && !nearlyEqual(item.itemAmountInr, itemAmountInr)) {
    requirements.push({ field: `exportItem:${item.sequenceNo}:itemAmountInr`, message: `Export item ${item.sequenceNo} amount INR differs from the linked invoice exchange-rate calculation.` });
  }
  if (hasValue(item.igstRate) && !nearlyEqual(item.igstAmount, igstAmount)) {
    requirements.push({ field: `exportItem:${item.sequenceNo}:igstAmount`, message: `Export item ${item.sequenceNo} IGST amount differs from the server Decimal calculation.` });
  }
  if (hasValue(item.drawbackCapInInr) && decimal(item.drawbackAmount).gt(decimal(item.drawbackCapInInr))) {
    requirements.push({ field: `exportItem:${item.sequenceNo}:drawbackAmount`, message: `Export item ${item.sequenceNo} drawback amount exceeds the selected cap.` });
  }
  if (hasValue(item.rodtepCap) && decimal(item.rodtepAmount).gt(decimal(item.rodtepCap))) {
    requirements.push({ field: `exportItem:${item.sequenceNo}:rodtepAmount`, message: `Export item ${item.sequenceNo} RoDTEP amount exceeds the selected cap.` });
  }

  return {
    itemAmount: text(itemAmount),
    itemAmountInr: linkedInvoice ? text(itemAmountInr) : "",
    taxableValue: text(taxableValue),
    igstAmount: text(igstAmount),
    requirements,
    rulesetVersion: "EXPORT_SB_SERVER_RULES_V1",
  };
}

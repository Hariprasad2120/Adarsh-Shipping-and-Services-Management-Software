import type {
  ImportInvoiceCharge,
  ImportInvoiceRecord,
  ImportItemRecord,
  ImportJobDraft,
} from "./import-job.types";

export type DecimalInput = string | number | null | undefined;

export function parseDecimal(value: DecimalInput): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundDecimal(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatDecimal(value: DecimalInput, precision = 2): string {
  return roundDecimal(parseDecimal(value), precision).toFixed(precision);
}

export function calculateInvoiceInr(invoiceValue: DecimalInput, exchangeRate: DecimalInput) {
  return roundDecimal(parseDecimal(invoiceValue) * parseDecimal(exchangeRate));
}

export function calculateItemAmountFc(quantity: DecimalInput, unitPrice: DecimalInput) {
  return roundDecimal(parseDecimal(quantity) * parseDecimal(unitPrice));
}

export function calculateItemAmountInr(
  quantity: DecimalInput,
  unitPrice: DecimalInput,
  exchangeRate: DecimalInput,
) {
  return roundDecimal(calculateItemAmountFc(quantity, unitPrice) * parseDecimal(exchangeRate));
}

export function calculateChargeInr(charge: Pick<ImportInvoiceCharge, "amount" | "exchangeRate">) {
  return roundDecimal(parseDecimal(charge.amount) * parseDecimal(charge.exchangeRate));
}

export function calculateInvoiceAssessableFc(invoice: ImportInvoiceRecord) {
  const appliedCharges = invoice.charges
    .filter((charge) => charge.apply)
    .reduce((total, charge) => total + parseDecimal(charge.amount), 0);

  return roundDecimal(parseDecimal(invoice.invoiceValue) + appliedCharges);
}

export function calculateInvoiceAssessableInr(invoice: ImportInvoiceRecord) {
  const invoiceInr = calculateInvoiceInr(invoice.invoiceValue, invoice.exchangeRate);
  const chargesInr = invoice.charges
    .filter((charge) => charge.apply)
    .reduce((total, charge) => total + calculateChargeInr(charge), 0);

  return roundDecimal(invoiceInr + chargesInr);
}

export function calculateDutyAmount(itemAmountInr: number, rate: DecimalInput) {
  return roundDecimal((itemAmountInr * parseDecimal(rate)) / 100);
}

export class DemoImportCalculationEngine {
  calculateInvoice(invoice: ImportInvoiceRecord) {
    const invoiceValueInr = calculateInvoiceInr(invoice.invoiceValue, invoice.exchangeRate);
    const chargesInr = invoice.charges
      .filter((charge) => charge.apply)
      .reduce((total, charge) => total + calculateChargeInr(charge), 0);
    const assessableValueFc = calculateInvoiceAssessableFc(invoice);
    const assessableValueInr = roundDecimal(invoiceValueInr + chargesInr);

    return {
      invoiceValueInr,
      chargesInr: roundDecimal(chargesInr),
      assessableValueFc,
      assessableValueInr,
    };
  }

  calculateItem(item: ImportItemRecord, linkedInvoice?: ImportInvoiceRecord) {
    const exchangeRate = linkedInvoice?.exchangeRate ?? "0";
    const amountFc = calculateItemAmountFc(item.quantity, item.unitPrice);
    const amountInr = calculateItemAmountInr(item.quantity, item.unitPrice, exchangeRate);
    let runningBase = amountInr;
    const duties = item.duties.map((duty) => {
      const dutyAmount = duty.manualOverride
        ? parseDecimal(duty.amount)
        : calculateDutyAmount(runningBase, duty.rate);
      if (!duty.manualOverride && ["bcd", "aidc", "sws"].includes(duty.key)) {
        runningBase = roundDecimal(runningBase + dutyAmount);
      }

      return {
        key: duty.key,
        dutyAmount: roundDecimal(dutyAmount),
      };
    });
    const totalDuty = roundDecimal(duties.reduce((total, duty) => total + duty.dutyAmount, 0));

    return {
      amountFc,
      amountInr,
      duties,
      totalDuty,
    };
  }

  aggregateInvoices(invoices: ImportInvoiceRecord[]) {
    return invoices.reduce(
      (totals, invoice) => {
        const calculated = this.calculateInvoice(invoice);
        totals.invoiceValueFc = roundDecimal(totals.invoiceValueFc + parseDecimal(invoice.invoiceValue));
        totals.invoiceValueInr = roundDecimal(totals.invoiceValueInr + calculated.invoiceValueInr);
        totals.assessableValueFc = roundDecimal(totals.assessableValueFc + calculated.assessableValueFc);
        totals.assessableValueInr = roundDecimal(totals.assessableValueInr + calculated.assessableValueInr);
        return totals;
      },
      {
        invoiceValueFc: 0,
        invoiceValueInr: 0,
        assessableValueFc: 0,
        assessableValueInr: 0,
      },
    );
  }

  aggregateItems(items: ImportItemRecord[], invoices: ImportInvoiceRecord[]) {
    const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));

    return items.reduce(
      (totals, item) => {
        const calculated = this.calculateItem(item, invoiceById.get(item.invoiceId));
        totals.amountFc = roundDecimal(totals.amountFc + calculated.amountFc);
        totals.amountInr = roundDecimal(totals.amountInr + calculated.amountInr);
        totals.totalDuty = roundDecimal(totals.totalDuty + calculated.totalDuty);

        for (const duty of calculated.duties) {
          totals.byDuty[duty.key] = roundDecimal((totals.byDuty[duty.key] ?? 0) + duty.dutyAmount);
        }

        return totals;
      },
      {
        amountFc: 0,
        amountInr: 0,
        totalDuty: 0,
        byDuty: {} as Record<string, number>,
      },
    );
  }

  aggregateDraft(draft: ImportJobDraft) {
    return {
      invoices: this.aggregateInvoices(draft.invoiceRecords),
      items: this.aggregateItems(draft.itemRecords, draft.invoiceRecords),
    };
  }
}

export const demoImportCalculationEngine = new DemoImportCalculationEngine();

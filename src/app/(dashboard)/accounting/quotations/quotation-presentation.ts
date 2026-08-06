/* eslint-disable @typescript-eslint/no-explicit-any */

export function serializeQuotationForPresentation(quotation: any) {
  return {
    ...quotation,
    postingDate: quotation.postingDate.toISOString(),
    validUntil: quotation.validUntil.toISOString(),
    exchangeRate: quotation.exchangeRate?.toString() ?? null,
    subTotal: quotation.subTotal.toString(),
    grossSubtotal: quotation.grossSubtotal.toString(),
    discountAmount: quotation.discountAmount.toString(),
    taxableSubtotal: quotation.taxableSubtotal.toString(),
    taxAmount: quotation.taxAmount.toString(),
    additionalCharges: quotation.additionalCharges.toString(),
    roundingAdjustment: quotation.roundingAdjustment.toString(),
    grandTotal: quotation.grandTotal.toString(),
    createdAt: quotation.createdAt.toISOString(),
    updatedAt: quotation.updatedAt.toISOString(),
    submittedAt: quotation.submittedAt?.toISOString() ?? null,
    approvedAt: quotation.approvedAt?.toISOString() ?? null,
    returnedAt: quotation.returnedAt?.toISOString() ?? null,
    sentAt: quotation.sentAt?.toISOString() ?? null,
    acceptedAt: quotation.acceptedAt?.toISOString() ?? null,
    declinedAt: quotation.declinedAt?.toISOString() ?? null,
    cancelledAt: quotation.cancelledAt?.toISOString() ?? null,
    items: quotation.items.map((line: any) => ({
      ...line,
      qty: line.qty.toString(),
      rate: line.rate.toString(),
      discount: line.discount.toString(),
      discountValue: line.discountValue?.toString() ?? null,
      taxRate: line.taxRate.toString(),
      taxableAmount: line.taxableAmount.toString(),
      taxAmount: line.taxAmount.toString(),
      amount: line.amount.toString(),
      lineTotal: line.lineTotal.toString(),
      convertedQuantity: line.convertedQuantity.toString(),
    })),
    audit: quotation.audit.map((entry: any) => ({
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    })),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import { notFound } from "next/navigation";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getQuotation } from "@/modules/accounting/service";
import { QuotationDetailClient } from "./quotation-detail-client";

interface QuotationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuotationDetailPage({
  params,
}: QuotationDetailPageProps) {
  const { id } = await params;
  const { orgId, caps } = await requireAccountingRouteAccess(
    `/accounting/quotations/${id}`,
    [
      "accounting.quotation.read",
      "accounting.quotation.edit",
      "accounting.quotation.submit",
      "accounting.quotation.approve",
      "accounting.quotation.send",
      "accounting.quotation.decide",
      "accounting.quotation.cancel",
      "accounting.quotation.convert_invoice",
    ],
  );

  const quotation = (await getQuotation(orgId, id)) as any;
  if (!quotation) notFound();

  const serializedQuotation = {
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

  const quotationCaps = {
    canEdit: Boolean(caps["accounting.quotation.edit"]),
    canSubmit: Boolean(caps["accounting.quotation.submit"]),
    canApprove: Boolean(caps["accounting.quotation.approve"]),
    canSend: Boolean(caps["accounting.quotation.send"]),
    canDecide: Boolean(caps["accounting.quotation.decide"]),
    canCancel: Boolean(caps["accounting.quotation.cancel"]),
    canConvert: Boolean(caps["accounting.quotation.convert_invoice"]),
    canCreate: Boolean(caps["accounting.quotation.create"]),
  };

  return (
    <>
      <AccountingRoutePageHeader
        title={`Quotation ${quotation.quotationNumber}`}
        actions={
          <AccountingActionLink href="/accounting/quotations">
            Back to quotations
          </AccountingActionLink>
        }
      />
      <QuotationDetailClient caps={quotationCaps} quotation={serializedQuotation} />
    </>
  );
}

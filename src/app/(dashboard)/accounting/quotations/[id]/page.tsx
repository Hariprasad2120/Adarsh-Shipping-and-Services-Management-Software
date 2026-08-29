/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import { notFound } from "next/navigation";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
} from "@/components/monolith";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getQuotation } from "@/modules/accounting/service";
import { QuotationDetailClient } from "./quotation-detail-client";
import { serializeQuotationForPresentation } from "../quotation-presentation";

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
      "accounting.quotation.create",
      "crm.invoice.manage",
    ],
  );

  const quotation = (await getQuotation(orgId, id)) as any;
  if (!quotation) notFound();
  const serializedQuotation = serializeQuotationForPresentation(quotation);

  const quotationCaps = {
    canEdit: Boolean(caps["accounting.quotation.edit"]),
    canSubmit: Boolean(caps["accounting.quotation.submit"]),
    canApprove: Boolean(caps["accounting.quotation.approve"]),
    canSend: Boolean(caps["accounting.quotation.send"]),
    canDecide: Boolean(caps["accounting.quotation.decide"]),
    canCancel: Boolean(caps["accounting.quotation.cancel"]),
    canConvert: Boolean(caps["accounting.quotation.convert_invoice"]),
    canConvertToSalesOrder: Boolean(caps["crm.invoice.manage"]),
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

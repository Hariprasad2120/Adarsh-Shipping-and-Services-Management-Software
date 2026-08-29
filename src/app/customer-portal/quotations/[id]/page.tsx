import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import {
  CustomerPortalPage,
  CustomerPortalPageHeader,
} from "@/components/monolith";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import { getPortalAccountingQuotation } from "@/modules/customer-portal/accounting-quotations";
import { formatAccountingMoney } from "@/modules/accounting/operational-helpers";
import { PortalQuotationDecisionPanel } from "./quotation-decision-panel";

interface CustomerPortalQuotationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerPortalQuotationDetailPage({
  params,
}: CustomerPortalQuotationDetailPageProps) {
  const session = await requirePortalSession();
  const { id } = await params;

  let quotation;
  try {
    quotation = await getPortalAccountingQuotation({
      orgId: session.orgId,
      customerId: session.customerId,
      quotationId: id,
    });
  } catch {
    notFound();
  }

  return (
    <CustomerPortalPage>
      <CustomerPortalPageHeader
        eyebrow="Commercial documents"
        title={`Quotation ${quotation.quotationNumber}`}
        description="Review the published quotation details shared through the customer portal."
        icon={<FileText size={22} />}
        actions={
          <Link href="/customer-portal/quotations" className="mnx-button mnx-button-secondary">
            Back to quotations
          </Link>
        }
      />

      <div className="space-y-6">
        <section className="mnx-portal-panel rounded-xl border border-mono-border/60 bg-mono-card p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <PortalDetail label="Customer" value={quotation.customer.name} />
            <PortalDetail label="Status" value={quotation.status.replaceAll("_", " ")} />
            <PortalDetail label="Posting date" value={formatDate(quotation.postingDate)} />
            <PortalDetail label="Valid until" value={formatDate(quotation.validUntil)} />
            <PortalDetail label="Reference" value={quotation.referenceNumber || "—"} />
            <PortalDetail label="Terms" value={quotation.terms || "—"} />
            <PortalDetail label="Subject" value={quotation.subject || "—"} />
            <PortalDetail
              label="Grand total"
              value={formatAccountingMoney(quotation.grandTotal.toString(), quotation.currencyCode)}
            />
          </div>
          {quotation.customerVisibleRemarks ? (
            <div className="mt-4 border-t border-mono-border/20 pt-4">
              <p className="mnx-portal-eyebrow text-xs tracking-wider">Remarks</p>
              <p className="mt-2 text-sm text-mono-muted">
                {quotation.customerVisibleRemarks}
              </p>
            </div>
          ) : null}
        </section>

        <PortalQuotationDecisionPanel
          quotationId={quotation.id}
          status={quotation.status}
          rowVersion={quotation.rowVersion}
          validUntilIso={quotation.validUntil.toISOString()}
          currentTimeIso={new Date().toISOString()}
          acceptedAtIso={quotation.acceptedAt?.toISOString() ?? null}
          declinedAtIso={quotation.declinedAt?.toISOString() ?? null}
          acceptanceComment={quotation.acceptanceComment}
          declineReason={quotation.declineReason}
        />

        <section className="mnx-portal-panel rounded-xl border border-mono-border/60 bg-mono-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="mnx-portal-eyebrow text-xs tracking-wider">Line items</p>
              <h2 className="mnx-portal-title-3 text-mono-text">Quoted services and charges</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-mono-border/20 text-left text-mono-muted">
                  <th className="pb-3 pr-4 font-medium">Item</th>
                  <th className="pb-3 pr-4 font-medium">Qty</th>
                  <th className="pb-3 pr-4 font-medium">Rate</th>
                  <th className="pb-3 pr-4 font-medium">Tax</th>
                  <th className="pb-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((line) => (
                  <tr key={line.id} className="border-b border-mono-border/10 align-top">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-mono-text">{line.itemName}</div>
                      <div className="text-xs text-mono-muted">
                        {line.descriptionSnapshot || line.hsnSac || "—"}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-mono-text">{line.qty.toString()}</td>
                    <td className="py-3 pr-4 text-mono-text">
                      {formatAccountingMoney(line.rate.toString(), quotation.currencyCode)}
                    </td>
                    <td className="py-3 pr-4 text-mono-text">
                      {formatAccountingMoney(line.taxAmount.toString(), quotation.currencyCode)}
                    </td>
                    <td className="py-3 text-mono-text">
                      {formatAccountingMoney(line.lineTotal.toString(), quotation.currencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </CustomerPortalPage>
  );
}

function PortalDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mnx-portal-eyebrow text-xs tracking-wider">{label}</p>
      <p className="mt-1 text-sm text-mono-text">{value}</p>
    </div>
  );
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

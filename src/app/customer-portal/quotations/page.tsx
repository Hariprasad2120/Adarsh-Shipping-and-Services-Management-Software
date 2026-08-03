import Link from "next/link";
import { FileText } from "lucide-react";
import {
  CustomerPortalPage,
  CustomerPortalPageHeader,
} from "@/components/monolith/customer-portal-workspace";
import { Badge } from "@/components/monolith/badge";
import { Button } from "@/components/monolith/button";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import { listPortalAccountingQuotations } from "@/modules/customer-portal/accounting-quotations";
import { formatAccountingMoney } from "@/modules/accounting/operational-helpers";

export default async function CustomerPortalQuotationsPage() {
  const session = await requirePortalSession();
  const quotations = await listPortalAccountingQuotations({
    orgId: session.orgId,
    customerId: session.customerId,
  });

  return (
    <CustomerPortalPage>
      <CustomerPortalPageHeader
        eyebrow="Commercial documents"
        title="Quotations"
        description="Review quotations that were published to your customer portal."
        icon={<FileText size={22} />}
      />

      {quotations.length === 0 ? (
        <div className="rounded-xl border border-mono-border/40 bg-mono-card p-12 text-center">
          <FileText className="mx-auto size-10 text-mono-accent opacity-50" />
          <h3 className="mnx-portal-title-3 mt-4 text-mono-text">
            No Quotations Published
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-xs text-mono-muted">
            Quotations shared through the Monolith commercial workflow will
            appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {quotations.map((quotation) => (
            <div
              key={quotation.id}
              className="mnx-portal-panel flex flex-col justify-between rounded-xl border border-mono-border/60 bg-mono-card p-5 shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="mnx-portal-eyebrow text-xs tracking-wider">
                    {quotation.quotationNumber}
                  </span>
                  <Badge variant="secondary">
                    {quotation.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <h3 className="mnx-portal-title-3 text-mono-text">
                  {quotation.subject || quotation.customerVisibleRemarks || "Customer quotation"}
                </h3>
                <p className="text-xs text-mono-muted">
                  Posted {formatDate(quotation.postingDate)} · Valid until{" "}
                  {formatDate(quotation.validUntil)}
                </p>
                <p className="text-sm font-medium text-mono-text">
                  {formatAccountingMoney(
                    quotation.grandTotal.toString(),
                    quotation.currencyCode,
                  )}
                </p>
              </div>
              <div className="mt-4 flex justify-end border-t border-mono-border/20 pt-4">
                <Link href={`/customer-portal/quotations/${quotation.id}`}>
                  <Button size="sm">Open quotation</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </CustomerPortalPage>
  );
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

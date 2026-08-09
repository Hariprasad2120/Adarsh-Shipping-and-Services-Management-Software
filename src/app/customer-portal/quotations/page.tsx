import { FileText } from "lucide-react";
import {
  CustomerPortalPanel,
  CustomerPortalPage,
  CustomerPortalPageHeader,
  CustomerPortalSectionHeading,
} from "@/components/monolith/customer-portal-workspace";
import { WorkspaceEmptyState } from "@/components/feedback/workspace-states";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
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

      <CustomerPortalSectionHeading
        index="01"
        title="Published quotations"
        description="Customer-visible quotations released through the Monolith commercial workflow."
      />

      {quotations.length === 0 ? (
        <CustomerPortalPanel className="mnx-customer-portal-empty">
          <div className="mnx-panel-state">
            <WorkspaceEmptyState
              title="No quotations published"
              description="Quotations shared through the Monolith commercial workflow will appear here."
            />
          </div>
        </CustomerPortalPanel>
      ) : (
        <div className="mnx-customer-portal-record-grid">
          {quotations.map((quotation) => (
            <CustomerPortalPanel
              key={quotation.id}
              className="mnx-portal-panel flex flex-col justify-between p-5"
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
                <ButtonLink href={`/customer-portal/quotations/${quotation.id}`} size="sm">
                  Open quotation
                </ButtonLink>
              </div>
            </CustomerPortalPanel>
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

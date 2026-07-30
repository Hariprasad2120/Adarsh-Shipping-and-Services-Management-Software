import {
  AccountingActionLink,
  AccountingAlert,
  AccountingMetric,
  AccountingMetrics,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingStatus,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingOperationalDashboard } from "@/modules/accounting/operational-queries";

export default async function AccountingDashboardPage() {
  const { caps, orgId } = await requireAccountingRouteAccess("/accounting");
  const dashboard = await getAccountingOperationalDashboard(orgId);
  return (
    <>
      <AccountingRoutePageHeader
        actions={
          caps["accounting.settings.manage"] ? (
            <AccountingActionLink href="/accounting/configuration">
              Configuration
            </AccountingActionLink>
          ) : undefined
        }
      />
      <AccountingAlert>
        Operational counts as of{" "}
        <strong>{new Date(dashboard.asOf).toLocaleString("en-IN")}</strong>.
        Profitability and statutory summaries are omitted until their accepted
        definitions and history are complete.
      </AccountingAlert>
      <AccountingMetrics>
        <AccountingMetric
          label="Drafts requiring action"
          value={dashboard.metrics.drafts.toLocaleString("en-IN")}
          detail="Legacy compatibility drafts awaiting canonical preparation"
          href="/accounting/sales-invoices"
          actionLabel="Open document drafts"
        />
        {(caps["accounting.document.approve"] ||
          caps["accounting.payment.approve"]) && (
          <AccountingMetric
            label="Pending approvals"
            value={dashboard.metrics.pendingApprovals.toLocaleString("en-IN")}
            detail="Canonical documents and payments"
            href="/accounting/approvals"
            actionLabel="Open approval inbox"
          />
        )}
        {caps["accounting.payment.read"] && (
          <AccountingMetric
            label="Unapplied payments"
            value={dashboard.metrics.unappliedPayments.toLocaleString("en-IN")}
            detail="Posted receipts and payments with an unapplied balance"
            href="/accounting/allocations"
            actionLabel="Open allocation workbench"
          />
        )}
        {caps["accounting.audit.read"] && (
          <AccountingMetric
            label="Posting attention"
            value={dashboard.metrics.postingAttention.toLocaleString("en-IN")}
            detail="Retryable, failed, rejected, or manual-review requests"
            href="/accounting/manual-review"
            actionLabel="Open posting attention"
          />
        )}
        {(caps["accounting.outbox.retry"] ||
          caps["accounting.outbox.manual-review"]) && (
          <AccountingMetric
            label="Outbox review"
            value={dashboard.metrics.outboxReview.toLocaleString("en-IN")}
            detail="Failed, dead-letter, or manual-review events"
            href="/accounting/outbox"
            actionLabel="Open Accounting outbox"
          />
        )}
        {caps["accounting.recurring-occurrence.process"] && (
          <AccountingMetric
            label="Scheduled attention"
            value={dashboard.metrics.scheduledAttention.toLocaleString("en-IN")}
            detail="Due or failed guarded occurrences"
            href="/accounting/recurring"
            actionLabel="Open recurring operations"
          />
        )}
      </AccountingMetrics>
      <AccountingSection
        eyebrow="Recent activity"
        title="Accounting audit timeline"
        description="Latest bounded, tenant-scoped canonical Accounting events."
      >
        <ul className="mnx-accounting-list">
          {dashboard.recentActivity.length ? (
            dashboard.recentActivity.map((event) => (
              <li className="mnx-accounting-list-row" key={event.id}>
                <div>
                  <b>{event.action.replaceAll("_", " ")}</b>
                  <small>
                    {event.entityType} · {event.actor}
                  </small>
                </div>
                <div>
                  <span>
                    {new Date(event.occurredAt).toLocaleString("en-IN")}
                  </span>
                  <AccountingStatus status="AUDITED" />
                </div>
              </li>
            ))
          ) : (
            <li>No canonical Accounting activity has been recorded.</li>
          )}
        </ul>
      </AccountingSection>
    </>
  );
}

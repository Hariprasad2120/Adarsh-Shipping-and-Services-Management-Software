import {
  AccountingActionLink,
  AccountingAlert,
  AccountingMetric,
  AccountingMetrics,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingStatus,
} from "@/components/monolith/accounting-workspace";
import {
  AccountingWorkflowCards,
  type AccountingWorkflowCardItem,
} from "@/components/monolith/accounting-workflow-cards";
import { getVisibleSectionById } from "@/lib/navigation";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingOperationalDashboard } from "@/modules/accounting/operational-queries";
import {
  BookOpenText,
  Boxes,
  BriefcaseBusiness,
  Calculator,
  ClipboardCheck,
  CreditCard,
  FileBarChart,
  FileCheck2,
  FileSpreadsheet,
  Landmark,
  ReceiptText,
  RefreshCcw,
  Repeat2,
  Settings2,
  ShieldAlert,
  ShoppingCart,
  WalletCards,
  Workflow,
  type LucideIcon,
} from "lucide-react";

const accountingWorkflowDescriptions: Record<string, string> = {
  "/accounting": "Return to the accounting command centre and current operational metrics.",
  "/accounting/approvals": "Review accounting documents, journals, and payments that need checker action.",
  "/accounting/banking": "Open the banking hub for transfers, cash movement, and settlement workflows.",
  "/accounting/payments": "Review the canonical payment register across receipts and disbursements.",
  "/accounting/payment-entries": "Prepare and review payment entries before or after allocation work.",
  "/accounting/customer-receipts": "Track customer receipts, unapplied balances, and collection activity.",
  "/accounting/vendor-payments": "Track supplier disbursements and payable settlement activity.",
  "/accounting/allocations": "Match receipts and payments to invoices, bills, and outstanding balances.",
  "/accounting/quotations": "Prepare quotations, customer notes, and conversion-ready commercial records.",
  "/accounting/sales-invoices": "Review receivables, customer invoices, and their posting lifecycle.",
  "/accounting/credit-notes": "Handle receivable-side correction documents and credit adjustments.",
  "/accounting/purchase-invoices": "Review payables, supplier bills, and purchase-side posting status.",
  "/accounting/debit-notes": "Handle payable-side correction documents and debit adjustments.",
  "/accounting/vendor-master": "Maintain the shared supplier catalogue used by payable workflows.",
  "/accounting/journal-entries": "Create and review balanced manual journals with approval controls.",
  "/accounting/general-ledger": "Inspect posted ledger activity account by account and period by period.",
  "/accounting/accounts": "Manage the chart of accounts, group structure, and ledger controls.",
  "/accounting/bulk-update": "Open controlled accountant maintenance workspaces and batch-ready admin tasks.",
  "/accounting/currency-adjustments": "Review FX readiness, exchange-rate setup, and adjustment controls.",
  "/accounting/transaction-locking": "Protect closed periods and manage transaction lock policy safely.",
  "/accounting/fixed-assets": "Inspect fixed-asset readiness and connected accounting controls.",
  "/accounting/depreciation": "Review depreciation policy gates and asset-source readiness before use.",
  "/accounting/trial-balance": "Verify debit and credit balances across the full ledger.",
  "/accounting/profit-loss": "Open the current profit and loss reporting workspace.",
  "/accounting/balance-sheet": "Open the current balance sheet reporting workspace.",
  "/accounting/reports": "Run the wider accounting statements, registers, and analysis reports.",
  "/accounting/items": "Maintain the shared accounting item and service catalogue.",
  "/accounting/jobs": "Review cargo job costing, profitability, and revenue-versus-cost performance.",
  "/accounting/recurring": "Manage recurring journal templates, due runs, and scheduled attention.",
  "/accounting/partners": "Review partner transaction readiness and partnership accounting records.",
  "/accounting/outbox": "Monitor integration events, retries, publication issues, and outbox health.",
  "/accounting/manual-review": "Resolve posting issues and investigate manual-review integration cases.",
  "/accounting/readiness": "Inspect readiness evidence, policy gates, and production authorization status.",
  "/accounting/capabilities": "Review capability policies, approvals, and governance controls.",
  "/accounting/configuration": "Manage accounting master configuration, periods, policies, and controls.",
  "/accounting/settings": "Open the legacy settings workspace and related administration controls.",
  "/accounting/invoices-sales": "Review the CRM-linked commercial sales document workspace.",
  "/accounting/sales-orders": "Track customer sales orders through the commercial document flow.",
  "/accounting/purchase-orders": "Track supplier purchase orders through the commercial document flow.",
};

const accountingWorkflowIcons: Record<string, LucideIcon> = {
  "/accounting/approvals": ClipboardCheck,
  "/accounting/banking": Landmark,
  "/accounting/payments": WalletCards,
  "/accounting/payment-entries": CreditCard,
  "/accounting/customer-receipts": ReceiptText,
  "/accounting/vendor-payments": CreditCard,
  "/accounting/allocations": Workflow,
  "/accounting/quotations": FileCheck2,
  "/accounting/sales-invoices": ReceiptText,
  "/accounting/credit-notes": RefreshCcw,
  "/accounting/purchase-invoices": ShoppingCart,
  "/accounting/debit-notes": RefreshCcw,
  "/accounting/vendor-master": Boxes,
  "/accounting/journal-entries": BookOpenText,
  "/accounting/general-ledger": BookOpenText,
  "/accounting/accounts": BookOpenText,
  "/accounting/bulk-update": Settings2,
  "/accounting/currency-adjustments": Calculator,
  "/accounting/transaction-locking": ShieldAlert,
  "/accounting/fixed-assets": Calculator,
  "/accounting/depreciation": Calculator,
  "/accounting/trial-balance": FileBarChart,
  "/accounting/profit-loss": FileBarChart,
  "/accounting/balance-sheet": FileBarChart,
  "/accounting/reports": FileSpreadsheet,
  "/accounting/items": Boxes,
  "/accounting/jobs": BriefcaseBusiness,
  "/accounting/recurring": Repeat2,
  "/accounting/partners": Workflow,
  "/accounting/outbox": Workflow,
  "/accounting/manual-review": ShieldAlert,
  "/accounting/readiness": ShieldAlert,
  "/accounting/capabilities": ShieldAlert,
  "/accounting/configuration": Settings2,
  "/accounting/settings": Settings2,
  "/accounting/invoices-sales": ReceiptText,
  "/accounting/sales-orders": FileCheck2,
  "/accounting/purchase-orders": ShoppingCart,
};

function sectionTitle(sectionLabel?: string) {
  if (!sectionLabel) return "Core workspaces";
  return `${sectionLabel} workspaces`;
}

export default async function AccountingDashboardPage() {
  const { caps, orgId } = await requireAccountingRouteAccess("/accounting");
  const dashboard = await getAccountingOperationalDashboard(orgId);
  const section = getVisibleSectionById(caps, "accounting");

  const groupedWorkflows = (section?.items ?? []).reduce<
    Array<{ label?: string; items: AccountingWorkflowCardItem[] }>
  >((groups, item) => {
    const currentGroup = groups.at(-1);
    if (!currentGroup || currentGroup.label !== item.sectionLabel) {
      groups.push({ label: item.sectionLabel, items: [] });
    }

    groups[groups.length - 1]!.items.push({
      href: item.href,
      title: item.label,
      description:
        accountingWorkflowDescriptions[item.href] ??
        "Open this accounting workspace.",
      icon: accountingWorkflowIcons[item.href] ?? ReceiptText,
    });

    return groups;
  }, []);

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

      <AccountingSection
        eyebrow="Workspace navigation"
        title="Accounting workspaces"
        description="Every Accounting route currently available to your role is listed here for direct access."
      >
        <div className="space-y-6">
          {groupedWorkflows.map((group) => (
            <section className="space-y-4" key={group.label ?? "core"}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--mnx-text-muted)]">
                {sectionTitle(group.label)}
              </h3>
              <AccountingWorkflowCards items={group.items} />
            </section>
          ))}
        </div>
      </AccountingSection>

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

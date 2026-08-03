import {
  AccountingActionLink,
  AccountingAlert,
  AccountingMetric,
  AccountingMetrics,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingStatus,
  AccountingTable,
} from "@/modules/accounting/components/accounting-workspace";
import {
  AccountingWorkflowCards,
  type AccountingWorkflowCardItem,
} from "@/components/monolith/accounting-workflow-cards";
import { getVisibleSectionById } from "@/lib/navigation";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingOperationalDashboard } from "@/modules/accounting/operational-queries";
import {
  getAccountingCurrencyControlWorkspace,
  getAccountingCustomizationWorkspace,
  getAccountingIntegrationWorkspace,
  getAccountingReportBuilderWorkspace,
  getAccountingTaxSettlementWorkspace,
} from "@/modules/accounting/phase9-workspaces";
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
  "/accounting/tax-settlement": "Review statutory filing periods, close runs, and settlement-facing controls.",
  "/accounting/report-builder": "Manage controlled accounting report outputs and delivery profiles.",
  "/accounting/integrations": "Monitor inbound and outbound accounting integration mappings and operational health.",
  "/accounting/customization": "Configure custom fields, automation rules, and optional accounting workspace modules.",
  "/accounting/communications": "Review accounting-facing publication and customer communication workspaces.",
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
  "/accounting/tax-settlement": FileSpreadsheet,
  "/accounting/report-builder": FileBarChart,
  "/accounting/integrations": Workflow,
  "/accounting/customization": Settings2,
  "/accounting/communications": Workflow,
};

function sectionTitle(sectionLabel?: string) {
  if (!sectionLabel) return "Core workspaces";
  return `${sectionLabel} workspaces`;
}

export default async function AccountingDashboardPage() {
  const { caps, orgId } = await requireAccountingRouteAccess("/accounting");
  const [
    dashboard,
    currencyWorkspace,
    taxSettlementWorkspace,
    reportBuilderWorkspace,
    integrationWorkspace,
    customizationWorkspace,
  ] = await Promise.all([
    getAccountingOperationalDashboard(orgId),
    getAccountingCurrencyControlWorkspace(orgId),
    getAccountingTaxSettlementWorkspace(orgId),
    getAccountingReportBuilderWorkspace(orgId),
    getAccountingIntegrationWorkspace(orgId),
    getAccountingCustomizationWorkspace(orgId),
  ]);
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
  const foreignCurrencyProfiles =
    currencyWorkspace.customerForeign.length +
    currencyWorkspace.vendorForeign.length;
  const activeExportProfiles = reportBuilderWorkspace.exportProfiles.filter(
    (profile) => profile.isActive,
  ).length;
  const activeSourceMappings = integrationWorkspace.sourceMappings.filter(
    (profile) => profile.isActive,
  ).length;
  const activeCustomFields = customizationWorkspace.customFields.filter(
    (field) => field.isActive,
  ).length;
  const activeAutomationRules = customizationWorkspace.automationRules.filter(
    (rule) => rule.isActive,
  ).length;

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
        The live dashboard now includes late-phase statutory, reporting,
        integration, and customization signals alongside the core operational
        queues.
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
        eyebrow="Phase 9 controls"
        title="Late-phase operational coverage"
        description="Track the higher-order Finance controls that were added later in the specification so statutory readiness, reporting setup, integrations, and workspace customization stay visible from the Accounting home route."
      >
        <AccountingMetrics>
          <AccountingMetric
            label="Foreign-currency subledgers"
            value={foreignCurrencyProfiles.toLocaleString("en-IN")}
            detail={`${currencyWorkspace.functionalCurrencyCode} functional currency baseline`}
            href="/accounting/currency-adjustments"
            actionLabel="Open currency controls"
          />
          <AccountingMetric
            label="Open filing periods"
            value={taxSettlementWorkspace.metrics.openFilingPeriods.toLocaleString(
              "en-IN",
            )}
            detail={`${taxSettlementWorkspace.metrics.activeRegistrations.toLocaleString("en-IN")} active registrations`}
            href="/accounting/tax-settlement"
            actionLabel="Open tax settlement"
          />
          <AccountingMetric
            label="Active export profiles"
            value={activeExportProfiles.toLocaleString("en-IN")}
            detail="Saved report outputs ready for controlled delivery"
            href="/accounting/report-builder"
            actionLabel="Open report builder"
          />
          <AccountingMetric
            label="Active source mappings"
            value={activeSourceMappings.toLocaleString("en-IN")}
            detail="Integration contracts currently enabled"
            href="/accounting/integrations"
            actionLabel="Open integrations"
          />
          <AccountingMetric
            label="Active custom metadata"
            value={(activeCustomFields + activeAutomationRules).toLocaleString("en-IN")}
            detail={`${activeCustomFields.toLocaleString("en-IN")} fields and ${activeAutomationRules.toLocaleString("en-IN")} automation rules`}
            href="/accounting/customization"
            actionLabel="Open customization"
          />
        </AccountingMetrics>
      </AccountingSection>

      <AccountingSection
        eyebrow="Control centre"
        title="Connected Phase 9 workspaces"
        description="These live workspaces now cover the late-phase operational slices that were previously only grounded in configuration foundations."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Workspace</th>
              <th>Live signal</th>
              <th>Coverage</th>
              <th>Route</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Currency adjustments</td>
              <td>{foreignCurrencyProfiles} foreign-currency profiles</td>
              <td>FX visibility and recent close checkpoints</td>
              <td>
                <AccountingActionLink href="/accounting/currency-adjustments">
                  Open
                </AccountingActionLink>
              </td>
            </tr>
            <tr>
              <td>Tax settlement</td>
              <td>
                {taxSettlementWorkspace.metrics.openFilingPeriods} open periods
              </td>
              <td>Registrations, GST summaries, close runs, lock date</td>
              <td>
                <AccountingActionLink href="/accounting/tax-settlement">
                  Open
                </AccountingActionLink>
              </td>
            </tr>
            <tr>
              <td>Report builder</td>
              <td>{activeExportProfiles} active export profiles</td>
              <td>Saved reporting outputs and close evidence</td>
              <td>
                <AccountingActionLink href="/accounting/report-builder">
                  Open
                </AccountingActionLink>
              </td>
            </tr>
            <tr>
              <td>Integrations</td>
              <td>{activeSourceMappings} active mappings</td>
              <td>Inbound and outbound accounting integration coverage</td>
              <td>
                <AccountingActionLink href="/accounting/integrations">
                  Open
                </AccountingActionLink>
              </td>
            </tr>
            <tr>
              <td>Customization</td>
              <td>
                {activeCustomFields + activeAutomationRules} active controls
              </td>
              <td>Custom fields, automation rules, workspace modules</td>
              <td>
                <AccountingActionLink href="/accounting/customization">
                  Open
                </AccountingActionLink>
              </td>
            </tr>
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Statutory checkpoints"
        title="Recent filing and close activity"
        description="Use the newest filing periods and close runs as the operating heartbeat for statutory and period-end follow-through."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Type</th>
              <th>Reference</th>
              <th>Window</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {taxSettlementWorkspace.filingPeriods.slice(0, 5).map((period) => (
              <tr key={`filing-${period.id}`}>
                <td>{period.returnType}</td>
                <td>{period.registration}</td>
                <td>
                  {period.periodStart} to {period.periodEnd}
                </td>
                <td>
                  <AccountingStatus status={period.status} />
                </td>
              </tr>
            ))}
            {taxSettlementWorkspace.closeRuns.slice(0, 5).map((run) => (
              <tr key={`close-${run.id}`}>
                <td>Close run</td>
                <td>{run.legalEntity}</td>
                <td>{run.closeDate}</td>
                <td>
                  <AccountingStatus status={run.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

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

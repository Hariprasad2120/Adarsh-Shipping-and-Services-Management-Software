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
  DashboardInsightCard,
  DashboardInsightGrid,
  DashboardMiniBarChart,
  DashboardSegmentList,
} from "@/components/data-display/dashboard-insights";
import {
  AccountingWorkflowCards,
  type AccountingWorkflowCardItem,
} from "@/components/monolith";
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
import { ReceiptText } from "lucide-react";
import { getAccountingWorkspaceCatalogItem } from "@/modules/accounting/workspace-catalog";

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
        getAccountingWorkspaceCatalogItem(item.href)?.description ??
        "Open this accounting workspace.",
      icon:
        getAccountingWorkspaceCatalogItem(item.href)?.workflowIcon ??
        ReceiptText,
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
          {groupedWorkflows.map((group, index) => (
            <section className="space-y-4" key={`${group.label ?? "core"}-${index}`}>
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
        eyebrow="Operational lens"
        title="Accounting dashboard focus"
        description="The command centre now adds compact visual readouts so the home route feels like a control surface before it becomes a navigation catalogue."
      >
        <DashboardInsightGrid>
          <DashboardInsightCard
            eyebrow="Queue health"
            title="Primary workload split"
            detail="A compact split of the most important accounting queues."
            chart={(
              <DashboardMiniBarChart
                items={[
                  { label: "Drafts", value: dashboard.metrics.drafts, tone: "warning" },
                  { label: "Approvals", value: dashboard.metrics.pendingApprovals, tone: "accent" },
                  { label: "Unapplied", value: dashboard.metrics.unappliedPayments, tone: "info" },
                  { label: "Outbox review", value: dashboard.metrics.outboxReview, tone: "danger" },
                ]}
              />
            )}
          />
          <DashboardInsightCard
            eyebrow="Phase 9 control"
            title="Late-phase readiness"
            detail="Newer statutory and integration layers stay visible without making the page feel like a wall of cards."
            chart={(
              <DashboardSegmentList
                items={[
                  { label: "FX profiles", value: foreignCurrencyProfiles, tone: "info" },
                  { label: "Open filing periods", value: taxSettlementWorkspace.metrics.openFilingPeriods, tone: "warning" },
                  { label: "Export profiles", value: activeExportProfiles, tone: "accent" },
                  { label: "Source mappings", value: activeSourceMappings, tone: "success" },
                ]}
              />
            )}
          />
        </DashboardInsightGrid>
      </AccountingSection>

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

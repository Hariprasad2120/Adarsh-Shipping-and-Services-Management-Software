import { BookOpenText, Calculator, RefreshCcw, Settings2 } from "lucide-react";
import {
  type AccountingWorkflowCardItem,
  AccountingWorkflowCards,
} from "@/components/monolith/accounting-workflow-cards";
import {
  AccountingActionLink,
  AccountingAlert,
  AccountingEmptyTableRow,
  AccountingMetric,
  AccountingMetrics,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingTable,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingConfigurationOverview } from "@/modules/accounting/operational-queries";

export default async function CurrencyAdjustmentsPage() {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/currency-adjustments",
  );
  const configuration = await getAccountingConfigurationOverview(orgId);
  const enabledCurrencies = configuration.currencies.filter(
    (currency) => currency.isEnabled,
  );

  const workflows = [
    {
      href: "/accounting/configuration",
      title: "Accounting Configuration",
      description:
        "Review functional currency, fiscal, and control policy settings.",
      icon: Settings2,
    },
    caps["accounting.settings.manage"] || caps["accounting.exchange_rate.maintain"]
      ? {
          href: "/accounting/configuration/admin",
          title: "FX Evidence Admin",
          description:
            "Maintain versioned exchange-rate evidence and approve it independently.",
          icon: Calculator,
        }
      : null,
    caps["accounting.journal.read"] || caps["accounting.ledger.read"]
      ? {
          href: "/accounting/journal-entries",
          title: "Manual Journals",
          description:
            "Use controlled journal drafts when an approved adjustment needs ledger impact.",
          icon: BookOpenText,
        }
      : null,
    {
      href: "/accounting/bulk-update",
      title: "Bulk Update",
      description:
        "Return to the accountant maintenance hub for adjacent controlled updates.",
      icon: RefreshCcw,
    },
  ].filter((value): value is AccountingWorkflowCardItem => value !== null);

  return (
    <>
      <AccountingRoutePageHeader
        actions={
          caps["accounting.settings.manage"] || caps["accounting.exchange_rate.maintain"] ? (
            <AccountingActionLink href="/accounting/configuration/admin">
              Manage FX evidence
            </AccountingActionLink>
          ) : undefined
        }
      />
      <AccountingMetrics>
        <AccountingMetric
          label="Functional currency"
          value={configuration.profile?.functionalCurrencyCode ?? "Not set"}
          detail="Organisation reporting currency"
        />
        <AccountingMetric
          label="Enabled currencies"
          value={enabledCurrencies.length}
          detail="Currency definitions currently available"
        />
        <AccountingMetric
          label="FX evidence rows"
          value={configuration.exchangeRates.length}
          detail="Recent approved or pending exchange-rate records"
        />
      </AccountingMetrics>
      <AccountingAlert>
        Foreign-currency adjustments remain controlled by approved FX evidence.
        This workspace surfaces the live configuration and evidence links without
        inventing unsupported automatic revaluation behavior.
      </AccountingAlert>
      <AccountingSection
        eyebrow="Accountant"
        title="Connected currency workflows"
        description="Move between the configuration, FX evidence, and journal workspaces that support controlled currency adjustments."
      >
        <AccountingWorkflowCards items={workflows} />
      </AccountingSection>
      <AccountingSection
        eyebrow="FX evidence"
        title="Recent exchange-rate records"
        description="These rates come from the current Accounting configuration overview."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Pair</th>
              <th>Rate</th>
              <th>Rate date</th>
              <th>Source</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {configuration.exchangeRates.length === 0 ? (
              <AccountingEmptyTableRow colSpan={5}>
                No exchange-rate evidence has been configured yet.
              </AccountingEmptyTableRow>
            ) : (
              configuration.exchangeRates.map((rate) => (
                <tr key={rate.id}>
                  <td>{rate.pair}</td>
                  <td>{rate.rate}</td>
                  <td>{new Date(rate.rateDate).toLocaleDateString("en-IN")}</td>
                  <td>{rate.source}</td>
                  <td>{rate.status.replaceAll("_", " ")}</td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
    </>
  );
}

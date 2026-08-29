import {
  BookOpenText,
  Calculator,
  Lock,
  RefreshCcw,
  Repeat2,
} from "lucide-react";
import { AccountingActionLink, AccountingAlert, AccountingMetric, AccountingMetrics, AccountingRoutePageHeader, AccountingSection, type AccountingWorkflowCardItem, AccountingWorkflowCards } from "@/components/monolith";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingConfigurationOverview } from "@/modules/accounting/operational-queries";

export default async function AccountingBulkUpdatePage() {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/bulk-update",
  );
  const configuration = await getAccountingConfigurationOverview(orgId);

  const workflows = [
    caps["accounting.account.read"]
      ? {
          href: "/accounting/accounts",
          title: "Chart of Accounts",
          description:
            "Maintain account hierarchy, classifications, and opening structures.",
          icon: BookOpenText,
        }
      : null,
    caps["accounting.recurring-template.admin"] ||
    caps["accounting.recurring-occurrence.process"]
      ? {
          href: "/accounting/recurring",
          title: "Recurring Journals",
          description:
            "Review and control scheduled journal generation evidence.",
          icon: Repeat2,
        }
      : null,
    caps["accounting.exchange_rate.maintain"] || caps["accounting.settings.manage"]
      ? {
          href: "/accounting/currency-adjustments",
          title: "Currency Adjustments",
          description:
            "Review currencies and approved FX evidence before adjustments are relied on.",
          icon: Calculator,
        }
      : null,
    caps["accounting.period_lock.request"] || caps["accounting.settings.manage"]
      ? {
          href: "/accounting/transaction-locking",
          title: "Transaction Locking",
          description:
            "Protect finalised periods with controlled period-lock updates.",
          icon: Lock,
        }
      : null,
    caps["accounting.depreciation.integrate"]
      ? {
          href: "/accounting/fixed-assets",
          title: "Fixed Assets",
          description:
            "Review asset-book readiness and depreciation accounting controls.",
          icon: RefreshCcw,
        }
      : null,
  ].filter((value): value is AccountingWorkflowCardItem => value !== null);

  return (
    <>
      <AccountingRoutePageHeader
        actions={
          caps["accounting.settings.manage"] ? (
            <AccountingActionLink href="/accounting/configuration/admin">
              Open config admin
            </AccountingActionLink>
          ) : undefined
        }
      />
      <AccountingMetrics>
        <AccountingMetric
          label="Legal entities"
          value={configuration.legalEntities.length}
          detail="Available accounting scopes"
        />
        <AccountingMetric
          label="Configured currencies"
          value={configuration.currencies.length}
          detail="Currency definitions available to Accounting"
        />
        <AccountingMetric
          label="Account controls"
          value={configuration.accountControlCount}
          detail="Current ledger and posting control mappings"
        />
      </AccountingMetrics>
      <AccountingAlert>
        Direct mass posting, bulk approval, and blind batch edits are not
        enabled. Use the controlled accountant workspaces below so validation,
        policy gates, and audit history continue to apply.
      </AccountingAlert>
      <AccountingSection
        eyebrow="Accountant"
        title="Controlled bulk maintenance"
        description="These connectors centralize the accountant-facing maintenance tasks that are currently supported by live Accounting workflows."
      >
        <AccountingWorkflowCards items={workflows} />
      </AccountingSection>
    </>
  );
}

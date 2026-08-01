import { BookOpenText, Calculator, RefreshCcw, Settings2 } from "lucide-react";
import { AccountingPolicyGate } from "@/components/monolith/accounting-operational-views";
import {
  type AccountingWorkflowCardItem,
  AccountingWorkflowCards,
} from "@/components/monolith/accounting-workflow-cards";
import {
  AccountingActionLink,
  AccountingAlert,
  AccountingMetric,
  AccountingMetrics,
  AccountingRoutePageHeader,
  AccountingSection,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingConfigurationOverview } from "@/modules/accounting/operational-queries";

export default async function FixedAssetsPage() {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/fixed-assets",
  );
  const configuration = await getAccountingConfigurationOverview(orgId);

  const workflows = [
    {
      href: "/accounting/depreciation",
      title: "Depreciation Runs",
      description:
        "Review current depreciation readiness and the active policy gate.",
      icon: Calculator,
    },
    caps["accounting.settings.manage"]
      ? {
          href: "/accounting/configuration/admin",
          title: "Asset Book Admin",
          description:
            "Maintain financial assets, asset books, and depreciation evidence.",
          icon: Settings2,
        }
      : null,
    caps["accounting.account.read"]
      ? {
          href: "/accounting/accounts",
          title: "Chart of Accounts",
          description:
            "Confirm depreciation expense and accumulated-depreciation mappings.",
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
          <>
            <AccountingActionLink href="/accounting/depreciation">
              Open depreciation
            </AccountingActionLink>
            {caps["accounting.settings.manage"] ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Open asset admin
              </AccountingActionLink>
            ) : null}
          </>
        }
      />
      <AccountingMetrics>
        <AccountingMetric
          label="Operational asset sources"
          value={configuration.sourceCounts.assets.toLocaleString("en-IN")}
          detail="AMS-owned candidates visible to Accounting"
        />
        <AccountingMetric
          label="Policy gate"
          value={configuration.policyGates.depreciation ? "Configured" : "Required"}
          detail="Depreciation execution remains gated without approved policy"
        />
      </AccountingMetrics>
      <AccountingAlert>
        Fixed-asset readiness is available here without inventing unsupported
        direct depreciation posting or automatic asset-book calculations.
      </AccountingAlert>
      <AccountingSection
        eyebrow="Accountant"
        title="Connected fixed-asset workflows"
        description="These connectors keep asset accounting grouped under Accountant while reusing the live depreciation and configuration foundations."
      >
        <AccountingWorkflowCards items={workflows} />
      </AccountingSection>
      <AccountingPolicyGate
        configured={configuration.policyGates.depreciation}
        readiness={configuration.capabilityReadiness.depreciation}
        title="Fixed-asset depreciation execution"
        description="The canonical rule and identity foundation exist, but Finance/CA-approved asset-book policy is still required before depreciation effects are permitted."
        requirements={[
          "AMS asset and version evidence",
          "Companies Act and Income Tax book policy",
          "Approved method, useful life, rate, and residual value",
          "Expense and accumulated-depreciation mappings",
          "Statutory rounding and correction policy",
        ]}
      />
    </>
  );
}

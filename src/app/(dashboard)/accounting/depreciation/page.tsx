import { AccountingPolicyGate } from "@/components/monolith/accounting-operational-views";
import {
  AccountingAlert,
  AccountingMetric,
  AccountingMetrics,
  AccountingRoutePageHeader,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingConfigurationOverview } from "@/modules/accounting/operational-queries";

export default async function DepreciationRunsPage() {
  const { orgId } = await requireAccountingRouteAccess(
    "/accounting/depreciation",
  );
  const configuration = await getAccountingConfigurationOverview(orgId);
  return (
    <>
      <AccountingRoutePageHeader />
      <AccountingMetrics>
        <AccountingMetric
          label="Operational asset sources"
          value={configuration.sourceCounts.assets.toLocaleString("en-IN")}
          detail="AMS-owned candidates visible to Accounting"
        />
        <AccountingMetric
          label="Approved run policy"
          value="Required"
          detail="No rate, life, method, or residual value is inferred"
        />
      </AccountingMetrics>
      <AccountingAlert>
        Source readiness is visible without calculating depreciation or creating
        financial effects.
      </AccountingAlert>
      <AccountingPolicyGate
        configured={configuration.policyGates.depreciation}
        readiness={configuration.capabilityReadiness.depreciation}
        title="Depreciation run execution"
        description="The canonical rule and identity foundation exist, but Finance/CA-approved asset-book policy is absent."
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

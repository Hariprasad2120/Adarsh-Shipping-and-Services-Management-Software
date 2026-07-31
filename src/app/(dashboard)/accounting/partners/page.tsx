import { AccountingPolicyGate } from "@/components/monolith/accounting-operational-views";
import {
  AccountingMetric,
  AccountingMetrics,
  AccountingRoutePageHeader,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingConfigurationOverview } from "@/modules/accounting/operational-queries";

export default async function PartnerTransactionsPage() {
  const { orgId } = await requireAccountingRouteAccess("/accounting/partners");
  const configuration = await getAccountingConfigurationOverview(orgId);
  return (
    <>
      <AccountingRoutePageHeader />
      <AccountingMetrics>
        <AccountingMetric
          label="Legacy partner sources"
          value={configuration.sourceCounts.partners.toLocaleString("en-IN")}
          detail="Readiness inventory only"
        />
        <AccountingMetric
          label="Posting state"
          value="Policy gated"
          detail="No deed terms or tax treatment are inferred"
        />
      </AccountingMetrics>
      <AccountingPolicyGate
        configured={configuration.policyGates.partnerTransactions}
        readiness={configuration.capabilityReadiness.partnerTransactions}
        title="Partner transaction posting"
        description="Draft preparation and posting remain blocked because effective partner terms and CA-approved control mappings are not configured."
        requirements={[
          "Canonical partner identity and effective terms",
          "Capital, current, drawings, and loan account mappings",
          "Approved remuneration, interest, appropriation, and tax treatment",
          "Independent approval and correction policy",
        ]}
      />
    </>
  );
}

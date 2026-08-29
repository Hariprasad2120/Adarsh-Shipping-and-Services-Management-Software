import { AccountingActionLink, AccountingConfigurationView, AccountingPolicyGate, AccountingRoutePageHeader } from "@/components/monolith";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingConfigurationOverview } from "@/modules/accounting/operational-queries";

export default async function AccountingConfigurationPage() {
  const { orgId } = await requireAccountingRouteAccess(
    "/accounting/configuration",
  );
  const configuration = await getAccountingConfigurationOverview(orgId);
  return (
    <>
      <AccountingRoutePageHeader
        actions={
          <>
            <AccountingActionLink href="/accounting/configuration/admin">
              Open config admin
            </AccountingActionLink>
            <AccountingActionLink href="/accounting/capabilities">
              Manage capability policies
            </AccountingActionLink>
            <AccountingActionLink href="/accounting/settings">
              Legacy settings compatibility
            </AccountingActionLink>
          </>
        }
      />
      <AccountingConfigurationView configuration={configuration} />
      <AccountingPolicyGate
        configured={configuration.policyGates.productionOutbox}
        readiness={configuration.capabilityReadiness.productionOutbox}
        title="Production integration publication"
        description="Only synthetic destinations are accepted by the canonical outbox publisher in the current phase."
        requirements={[
          "Approved destination and consumer contract",
          "Provider credentials in approved secret storage",
          "Monitoring, retry, and reconciliation acceptance",
          "Explicit production activation authorization",
        ]}
      />
    </>
  );
}

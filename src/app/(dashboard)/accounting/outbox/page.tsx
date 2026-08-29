import { AccountingOutboxTable, AccountingPolicyGate, AccountingRoutePageHeader, AccountingSection } from "@/components/monolith";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import {
  getAccountingConfigurationOverview,
  listAccountingOutbox,
} from "@/modules/accounting/operational-queries";

export default async function AccountingOutboxPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/outbox",
  );
  const { page, status } = await searchParams;
  const [outbox, configuration] = await Promise.all([
    listAccountingOutbox(orgId, {
      page: Number(page) || 1,
      status: status || undefined,
    }),
    getAccountingConfigurationOverview(orgId),
  ]);
  return (
    <>
      <AccountingRoutePageHeader />
      <AccountingPolicyGate
        configured={configuration.policyGates.productionOutbox}
        readiness={configuration.capabilityReadiness.productionOutbox}
        title="Production publication readiness"
        description="Transactional outbox events are durable, but production publication remains blocked until an approved capability policy is active."
        requirements={[
          "Approved destination contract",
          "Hash-valid capability configuration",
          "Independent approval evidence",
          "Effective activation window",
        ]}
      />
      <AccountingSection
        eyebrow="Durable events"
        title="Transactional outbox"
        description="Safe metadata, status, attempts, next eligibility, result codes, and source correlation. Payload contents are not exposed."
      >
        <AccountingOutboxTable caps={caps} data={outbox} />
      </AccountingSection>
    </>
  );
}

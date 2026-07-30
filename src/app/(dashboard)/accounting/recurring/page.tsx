import {
  AccountingPolicyGate,
  ScheduledOperationsTable,
} from "@/components/monolith/accounting-operational-views";
import {
  AccountingRoutePageHeader,
  AccountingSection,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import {
  getAccountingConfigurationOverview,
  listAccountingScheduledOperations,
} from "@/modules/accounting/operational-queries";

export default async function RecurringTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { orgId } = await requireAccountingRouteAccess("/accounting/recurring");
  const { page } = await searchParams;
  const [occurrences, configuration] = await Promise.all([
    listAccountingScheduledOperations(orgId, { page: Number(page) || 1 }),
    getAccountingConfigurationOverview(orgId),
  ]);
  return (
    <>
      <AccountingRoutePageHeader />
      <AccountingPolicyGate
        configured={configuration.policyGates.recurringGeneration}
        title="Recurring financial generation"
        description="Occurrence identity and guarded claims are implemented; catch-up, skip, template approval, and generated-document policy are not approved."
        requirements={[
          "Versioned template and immutable snapshot",
          "Approved catch-up and skip behavior",
          "Generated canonical document policy",
          "Independent approval before posting",
        ]}
      />
      <AccountingSection
        eyebrow="Occurrence history"
        title="Guarded scheduled operations"
        description="Deterministic occurrence identity prevents duplicate processing."
      >
        <ScheduledOperationsTable data={occurrences} />
      </AccountingSection>
    </>
  );
}

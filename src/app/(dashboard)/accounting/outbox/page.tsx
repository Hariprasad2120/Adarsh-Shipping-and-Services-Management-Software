import { AccountingOutboxTable } from "@/components/monolith/accounting-operational-views";
import {
  AccountingRoutePageHeader,
  AccountingSection,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { listAccountingOutbox } from "@/modules/accounting/operational-queries";

export default async function AccountingOutboxPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/outbox",
  );
  const { page, status } = await searchParams;
  const outbox = await listAccountingOutbox(orgId, {
    page: Number(page) || 1,
    status: status || undefined,
  });
  return (
    <>
      <AccountingRoutePageHeader />
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

import { AccountingOutboxTable } from "@/components/monolith/accounting-operational-views";
import {
  AccountingRoutePageHeader,
  AccountingSection,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { listAccountingOutbox } from "@/modules/accounting/operational-queries";

export default async function AccountingManualReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/manual-review",
  );
  const { page } = await searchParams;
  const outbox = await listAccountingOutbox(orgId, {
    page: Number(page) || 1,
    manualReviewOnly: true,
  });
  return (
    <>
      <AccountingRoutePageHeader />
      <AccountingSection
        eyebrow="Exception queue"
        title="Events requiring a reasoned decision"
        description="Failed, dead-letter, and manual-review events. Retry is idempotent and never edits the payload."
      >
        <AccountingOutboxTable caps={caps} data={outbox} />
      </AccountingSection>
    </>
  );
}

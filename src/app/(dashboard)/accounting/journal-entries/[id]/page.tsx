import { notFound } from "next/navigation";

import { BreadcrumbLabel } from "@/components/navigation/breadcrumb-label";
import { AccountingJournalApprovalAction, AccountingJournalDraftActions, CanonicalJournalDetailView } from "@/components/monolith";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
} from "@/modules/accounting/components/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getCanonicalJournalDetail } from "@/modules/accounting/operational-queries";

export default async function JournalEntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { caps, orgId, userId } = await requireAccountingRouteAccess(
    `/accounting/journal-entries/${id}`,
  );
  const journal = await getCanonicalJournalDetail(orgId, id);
  if (!journal) notFound();
  const canEditDraft =
    journal.status === "DRAFT" &&
    journal.createdById === userId &&
    caps["accounting.journal.prepare"] === true;
  const canApprove =
    journal.status === "SUBMITTED" &&
    journal.createdById !== userId &&
    caps["accounting.journal.approve"] === true &&
    caps["accounting.post"] === true;
  return (
    <>
      <BreadcrumbLabel segment={id} label={journal.voucherNo} />
      <AccountingRoutePageHeader
        title={`Journal ${journal.voucherNo}`}
        description={`${journal.journalType ?? "Journal entry"} · ${journal.status}`}
        actions={
          <div className="mnx-accounting-inline-actions">
            {canEditDraft ? (
              <AccountingJournalDraftActions
                editHref={`/accounting/journal-entries/new?edit=${journal.id}`}
                expectedVersion={journal.rowVersion}
                id={journal.id}
              />
            ) : null}
            {canApprove ? (
              <AccountingJournalApprovalAction
                expectedVersion={journal.rowVersion}
                id={journal.id}
              />
            ) : null}
            <AccountingActionLink href="/accounting/journal-entries">
              Back to journal register
            </AccountingActionLink>
          </div>
        }
      />
      <CanonicalJournalDetailView journal={journal} />
    </>
  );
}

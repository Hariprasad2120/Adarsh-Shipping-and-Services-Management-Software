import {
  AccountingRoutePageHeader,
  AccountingSection,
} from "@/components/monolith/accounting-workspace";
import {
  CanonicalDocumentRegister,
  CanonicalJournalRegister,
  CanonicalPaymentRegister,
} from "@/components/monolith/accounting-operational-views";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import {
  listCanonicalAccountingDocuments,
  listCanonicalAccountingPayments,
  listCanonicalJournals,
} from "@/modules/accounting/operational-queries";

export default async function AccountingApprovalsPage() {
  const { caps, orgId } =
    await requireAccountingRouteAccess("/accounting/approvals");
  const emptyPage = { page: 1, pageSize: 50, total: 0, rows: [] };
  const [documents, payments, journals] = await Promise.all([
    caps["accounting.document.approve"]
      ? listCanonicalAccountingDocuments(orgId, {
          status: "PENDING_APPROVAL",
          pageSize: 50,
        })
      : Promise.resolve(emptyPage),
    caps["accounting.payment.approve"]
      ? listCanonicalAccountingPayments(orgId, {
          status: "PENDING_APPROVAL",
          pageSize: 50,
        })
      : Promise.resolve(emptyPage),
    caps["accounting.journal.approve"]
      ? listCanonicalJournals(orgId, {
          status: "DRAFT",
          pageSize: 50,
        })
      : Promise.resolve(emptyPage),
  ]);
  return (
    <>
      <AccountingRoutePageHeader />
      <AccountingSection
        eyebrow="Documents"
        title="Documents awaiting independent review"
        description={`${documents.total} canonical document versions require review. Open a record before acting; bulk approval is unavailable.`}
      >
        <CanonicalDocumentRegister
          basePath="/accounting/approvals"
          data={documents}
          emptyMessage="No documents are awaiting approval."
        />
      </AccountingSection>
      <AccountingSection
        eyebrow="Payments"
        title="Payments awaiting independent review"
        description={`${payments.total} canonical payment versions require review. Accounting posting does not imply external transfer.`}
      >
        <CanonicalPaymentRegister
          basePath="/accounting/approvals"
          data={payments}
          emptyMessage="No payments are awaiting approval."
        />
      </AccountingSection>
      <AccountingSection
        eyebrow="Manual journals"
        title="Journal drafts awaiting independent review"
        description={`${journals.total} manual journal drafts require a separate approver. Open a draft to inspect exact debit and credit lines before posting.`}
      >
        <CanonicalJournalRegister data={journals} />
      </AccountingSection>
    </>
  );
}

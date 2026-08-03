import {
  AccountingRoutePageHeader,
  AccountingSection,
} from "@/components/monolith/accounting-workspace";
import {
  CanonicalDocumentRegister,
  CanonicalJournalRegister,
  CanonicalPaymentRegister,
  resolveCanonicalDocumentQueueHref,
} from "@/components/monolith/accounting-operational-views";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import {
  listCanonicalAccountingDocuments,
  listCanonicalAccountingPayments,
  listCanonicalJournals,
} from "@/modules/accounting/operational-queries";
import { getAccountingApprovalWorkflowSummary } from "@/modules/accounting/phase9-workspaces";

export default async function AccountingApprovalsPage() {
  const { caps, orgId } =
    await requireAccountingRouteAccess("/accounting/approvals");
  const emptyPage = { page: 1, pageSize: 50, total: 0, rows: [] };
  const [documents, payments, journals, summary] = await Promise.all([
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
          status: "SUBMITTED",
          pageSize: 50,
        })
      : Promise.resolve(emptyPage),
    getAccountingApprovalWorkflowSummary(orgId),
  ]);
  return (
    <>
      <AccountingRoutePageHeader />
      <AccountingSection
        eyebrow="Workflow coverage"
        title="Approval policy and queue summary"
        description={`${summary.activePolicyCount} active approval policies currently govern ${summary.pendingDocuments.length} document queues, ${summary.pendingPayments.length} payment queues, and ${summary.submittedJournals} submitted journals.`}
      >
        <CanonicalDocumentRegister
          actionLabel="Open queue"
          basePath="/accounting/approvals"
          data={{
            page: 1,
            pageSize: summary.pendingDocuments.length || 1,
            total: summary.pendingDocuments.reduce((sum, row) => sum + row.count, 0),
            rows: summary.pendingDocuments.map((row) => ({
              id: row.documentType,
              documentType: row.documentType,
              status: "PENDING_APPROVAL",
              legalEntityId: row.documentType,
              legalEntity: "Approval queue",
              counterparty: `${row.count} pending`,
              documentDate: new Date().toISOString(),
              postingDate: new Date().toISOString(),
              dueDate: null,
              currencyCode: "—",
              subtotal: "0",
              taxAmount: "0",
              totalAmount: String(row.count),
              makerId: "policy",
              maker: "Workflow summary",
              approvedBy: null,
              approvedAt: null,
              rowVersion: 1,
              journalEntryId: null,
              correctionOfId: null,
              lineCount: 0,
              allocationCount: 0,
              correctionCount: 0,
              createdAt: new Date().toISOString(),
            })),
          }}
          emptyMessage="No document-type queues currently require approval."
          resolveHref={resolveCanonicalDocumentQueueHref}
        />
      </AccountingSection>
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
        title="Submitted journals awaiting independent review"
        description={`${journals.total} submitted manual journals require a separate approver. Open a submitted journal to approve it for posting or reject it as cancelled.`}
      >
        <CanonicalJournalRegister data={journals} />
      </AccountingSection>
    </>
  );
}

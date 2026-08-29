import { CheckCircle2, LockKeyhole } from "lucide-react";

import type { Caps } from "@/lib/rbac";
import { resolveAccountingDocumentQueuePath } from "@/modules/accounting/legacy-record-type-routes";
import type { AccountingCapabilityReadiness } from "@/modules/accounting/capability-policies";
import {
  deriveAccountingActionState,
  formatDecimalString,
} from "@/modules/accounting/operational-helpers";
import type {
  getAccountingConfigurationOverview,
  getCanonicalAccountingDocument,
  getCanonicalAccountingPayment,
  getCanonicalJournalDetail,
  getGeneralLedgerOperationalView,
  listAccountingAllocations,
  listAccountingOutbox,
  listAccountingScheduledOperations,
  listCanonicalAccountingDocuments,
  listCanonicalAccountingPayments,
  listCanonicalJournals,
  listLegacyAccountingDrafts,
} from "@/modules/accounting/operational-queries";
import {
  AccountingActionLink,
  AccountingAlert,
  AccountingBadge,
  AccountingDetail,
  AccountingDetailList,
  AccountingEmptyTableRow,
  AccountingMoney,
  AccountingSection,
  AccountingStatus,
  AccountingTable,
} from "./accounting-workspace";
import {
  AccountingFinancialActions,
  AccountingOutboxActions,
} from "./accounting-operational-actions";

type DocumentList = Awaited<
  ReturnType<typeof listCanonicalAccountingDocuments>
>;
type PaymentList = Awaited<
  ReturnType<typeof listCanonicalAccountingPayments>
>;
type LegacyDraftList = Awaited<ReturnType<typeof listLegacyAccountingDrafts>>;
type AllocationList = Awaited<ReturnType<typeof listAccountingAllocations>>;
type JournalList = Awaited<ReturnType<typeof listCanonicalJournals>>;
type LedgerView = Awaited<ReturnType<typeof getGeneralLedgerOperationalView>>;
type ScheduledList = Awaited<
  ReturnType<typeof listAccountingScheduledOperations>
>;
type OutboxList = Awaited<ReturnType<typeof listAccountingOutbox>>;
type Configuration = Awaited<
  ReturnType<typeof getAccountingConfigurationOverview>
>;
type DocumentDetail = NonNullable<
  Awaited<ReturnType<typeof getCanonicalAccountingDocument>>
>;
type PaymentDetail = NonNullable<
  Awaited<ReturnType<typeof getCanonicalAccountingPayment>>
>;
type JournalDetail = NonNullable<
  Awaited<ReturnType<typeof getCanonicalJournalDetail>>
>;

function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
}

function formatDateTime(value: string | null) {
  return value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
}

function formatJournalMethod(
  sourceType: string | null | undefined,
  journalType: string | null | undefined,
) {
  const raw = sourceType ?? journalType ?? "MANUAL_JOURNAL";
  return raw.replaceAll("_", " ");
}

export function AccountingPagination({
  basePath,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="mnx-accounting-pagination" aria-label="Pagination">
      <span>
        Page {page} of {pages} · {total} records
      </span>
      <div>
        {page > 1 ? (
          <AccountingActionLink
            className="mnx-button-compact"
            href={`${basePath}?page=${page - 1}`}
          >
            Previous
          </AccountingActionLink>
        ) : null}
        {page < pages ? (
          <AccountingActionLink
            className="mnx-button-compact"
            href={`${basePath}?page=${page + 1}`}
          >
            Next
          </AccountingActionLink>
        ) : null}
      </div>
    </nav>
  );
}

export function CanonicalDocumentRegister({
  actionLabel = "Review",
  basePath,
  data,
  emptyMessage = "No canonical documents match this view.",
  resolveHref,
}: {
  actionLabel?: string;
  basePath: string;
  data: DocumentList;
  emptyMessage?: string;
  resolveHref?: (document: DocumentList["rows"][number]) => string | null;
}) {
  return (
    <>
      <AccountingTable>
        <thead>
          <tr>
            <th>Type</th>
            <th>Counterparty</th>
            <th>Legal entity</th>
            <th>Posting date</th>
            <th>Amount</th>
            <th>Maker</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.length === 0 ? (
            <AccountingEmptyTableRow colSpan={8}>
              {emptyMessage}
            </AccountingEmptyTableRow>
          ) : (
            data.rows.map((document) => (
              <tr key={document.id}>
                {(() => {
                  const href =
                    resolveHref?.(document) ??
                    `/accounting/documents/${document.id}`;

                  return (
                    <>
                <td>
                  <AccountingBadge>
                    {document.documentType.replaceAll("_", " ")}
                  </AccountingBadge>
                </td>
                <td>{document.counterparty}</td>
                <td>{document.legalEntity}</td>
                <td>{formatDate(document.postingDate)}</td>
                <td>
                  <AccountingMoney
                    amount={document.totalAmount}
                    currencyCode={document.currencyCode}
                  />
                </td>
                <td>{document.maker}</td>
                <td>
                  <AccountingStatus status={document.status} />
                </td>
                <td>
                  {href ? (
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={href}
                    >
                      {actionLabel}
                    </AccountingActionLink>
                  ) : (
                    "—"
                  )}
                </td>
                    </>
                  );
                })()}
              </tr>
            ))
          )}
        </tbody>
      </AccountingTable>
      <AccountingPagination
        basePath={basePath}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
      />
    </>
  );
}

export function resolveCanonicalDocumentReviewHref(
  document: DocumentList["rows"][number],
) {
  return `/accounting/documents/${document.id}`;
}

export function resolveCanonicalDocumentQueueHref(
  document: DocumentList["rows"][number],
) {
  return resolveAccountingDocumentQueuePath(document.documentType);
}

export function LegacyAccountingDraftRegister({
  data,
  detailPath,
}: {
  data: LegacyDraftList;
  detailPath: string;
}) {
  return (
    <AccountingTable>
      <thead>
        <tr>
          <th>Reference</th>
          <th>Counterparty</th>
          <th>Posting date</th>
          <th>Amount</th>
          <th>Updated</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {data.rows.length === 0 ? (
          <AccountingEmptyTableRow colSpan={7}>
            No editable compatibility drafts remain.
          </AccountingEmptyTableRow>
        ) : (
          data.rows.map((draft) => (
            <tr key={draft.id}>
              <td>{draft.reference}</td>
              <td>{draft.party}</td>
              <td>{formatDate(draft.postingDate)}</td>
              <td>
                <AccountingMoney
                  amount={draft.amount}
                  currencyCode={draft.currencyCode}
                />
              </td>
              <td>{formatDateTime(draft.updatedAt)}</td>
              <td>
                <AccountingStatus status="DRAFT" />
              </td>
              <td>
                <AccountingActionLink
                  className="mnx-button-compact"
                  href={`${detailPath}/${draft.id}`}
                >
                  Prepare
                </AccountingActionLink>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </AccountingTable>
  );
}

export function CanonicalPaymentRegister({
  basePath,
  data,
  emptyMessage = "No canonical payments match this view.",
}: {
  basePath: string;
  data: PaymentList;
  emptyMessage?: string;
}) {
  return (
    <>
      <AccountingTable>
        <thead>
          <tr>
            <th>Type</th>
            <th>Party</th>
            <th>Legal entity</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Applied</th>
            <th>Unapplied</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.length === 0 ? (
            <AccountingEmptyTableRow colSpan={9}>
              {emptyMessage}
            </AccountingEmptyTableRow>
          ) : (
            data.rows.map((payment) => (
              <tr key={payment.id}>
                <td>{payment.paymentType.replaceAll("_", " ")}</td>
                <td>{payment.party}</td>
                <td>{payment.legalEntity}</td>
                <td>{formatDate(payment.transactionDate)}</td>
                <td>
                  <AccountingMoney
                    amount={payment.amount}
                    currencyCode={payment.currencyCode}
                  />
                </td>
                <td>
                  <AccountingMoney
                    amount={payment.allocatedAmount}
                    currencyCode={payment.currencyCode}
                  />
                </td>
                <td>
                  <AccountingMoney
                    amount={payment.unappliedAmount}
                    currencyCode={payment.currencyCode}
                  />
                </td>
                <td>
                  <AccountingStatus status={payment.status} />
                </td>
                <td>
                  <AccountingActionLink
                    className="mnx-button-compact"
                    href={`/accounting/payments/${payment.id}`}
                  >
                    Review
                  </AccountingActionLink>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AccountingTable>
      <AccountingPagination
        basePath={basePath}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
      />
    </>
  );
}

export function AccountingAllocationRegister({
  data,
}: {
  data: AllocationList;
}) {
  return (
    <>
      <AccountingAlert>
        Allocations are frozen into the canonical payment contract before
        approval. Reversal releases active allocations atomically; this view
        does not edit posted allocation rows.
      </AccountingAlert>
      <AccountingTable>
        <thead>
          <tr>
            <th>Payment</th>
            <th>Party</th>
            <th>Target</th>
            <th>Version</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.length === 0 ? (
            <AccountingEmptyTableRow colSpan={7}>
              No canonical allocations have been recorded.
            </AccountingEmptyTableRow>
          ) : (
            data.rows.map((allocation) => (
              <tr key={allocation.id}>
                <td>
                  <a
                    className="mnx-accounting-record-link"
                    href={`/accounting/payments/${allocation.payment.id}`}
                  >
                    {allocation.payment.paymentType.replaceAll("_", " ")}
                  </a>
                </td>
                <td>{allocation.payment.party}</td>
                <td>
                  {allocation.targetDocument ? (
                    <a
                      className="mnx-accounting-record-link"
                      href={`/accounting/documents/${allocation.targetDocument.id}`}
                    >
                      {allocation.targetDocument.documentType.replaceAll("_", " ")}
                    </a>
                  ) : (
                    "Approved source snapshot"
                  )}
                </td>
                <td>{allocation.targetVersion}</td>
                <td>
                  <AccountingMoney
                    amount={allocation.amount}
                    currencyCode={
                      allocation.targetDocument?.transactionCurrencyCode ??
                      allocation.payment.transactionCurrencyCode
                    }
                  />
                </td>
                <td>
                  <AccountingStatus status={allocation.status} />
                </td>
                <td>{formatDateTime(allocation.createdAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </AccountingTable>
      <AccountingPagination
        basePath="/accounting/allocations"
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
      />
    </>
  );
}

export function CanonicalJournalRegister({
  basePath = "/accounting/journal-entries",
  data,
  emptyMessage = "No journal entries match this view.",
  variant = "standard",
}: {
  basePath?: string;
  data: JournalList;
  emptyMessage?: string;
  variant?: "standard" | "manual-journal";
}) {
  if (variant === "manual-journal") {
    return (
      <>
        <AccountingTable>
          <thead>
            <tr>
              <th>Date</th>
              <th>Location</th>
              <th>Journal #</th>
              <th>Reference number</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Amount</th>
              <th>Created by</th>
              <th>Reporting method</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <AccountingEmptyTableRow colSpan={9}>
                {emptyMessage}
              </AccountingEmptyTableRow>
            ) : (
              data.rows.map((journal) => (
                <tr key={journal.id}>
                  <td>{formatDate(journal.postingDate)}</td>
                  <td>{journal.branchName ?? "Organisation-wide"}</td>
                  <td>
                    <a
                      className="mnx-accounting-record-link"
                      href={`/accounting/journal-entries/${journal.id}`}
                    >
                      <strong>{journal.voucherNo}</strong>
                      <span>{journal.legalEntity}</span>
                    </a>
                  </td>
                  <td>{journal.sourceId ?? "—"}</td>
                  <td>
                    <AccountingStatus status={journal.status} />
                  </td>
                  <td>{journal.remarks ?? "—"}</td>
                  <td>
                    <AccountingMoney
                      amount={journal.totalDebit}
                      currencyCode={journal.currencyCode}
                    />
                  </td>
                  <td>{journal.createdBy}</td>
                  <td>
                    {formatJournalMethod(journal.sourceType, journal.journalType)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
        <AccountingPagination
          basePath={basePath}
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
        />
      </>
    );
  }

  return (
    <>
      <AccountingTable>
        <thead>
          <tr>
            <th>Voucher</th>
            <th>Date</th>
            <th>Legal entity</th>
            <th>Source</th>
            <th>Debit</th>
            <th>Credit</th>
            <th>Lines</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.length === 0 ? (
            <AccountingEmptyTableRow colSpan={8}>
              {emptyMessage}
            </AccountingEmptyTableRow>
          ) : (
            data.rows.map((journal) => (
              <tr key={journal.id}>
                <td>
                  <a
                    className="mnx-accounting-record-link"
                    href={`/accounting/journal-entries/${journal.id}`}
                  >
                    {journal.voucherNo}
                  </a>
                </td>
                <td>{formatDate(journal.postingDate)}</td>
                <td>{journal.legalEntity}</td>
                <td>{journal.sourceType ?? journal.journalType ?? "Legacy"}</td>
                <td>
                  <AccountingMoney
                    amount={journal.totalDebit}
                    currencyCode={journal.currencyCode}
                  />
                </td>
                <td>
                  <AccountingMoney
                    amount={journal.totalCredit}
                    currencyCode={journal.currencyCode}
                  />
                </td>
                <td>{journal.lineCount}</td>
                <td>
                  <AccountingStatus status={journal.status} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AccountingTable>
      <AccountingPagination
        basePath={basePath}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
      />
    </>
  );
}

export function OperationalLedgerTable({ data }: { data: LedgerView }) {
  return (
    <>
      {data.openingComplete ? (
        <AccountingAlert>
          Opening balance for the selected account and start date:{" "}
          <strong>{formatDecimalString(data.openingBalance ?? "0")}</strong>.
        </AccountingAlert>
      ) : (
        <AccountingAlert variant="warning">
          Select one account and a start date to calculate an exact opening
          balance. The register remains deterministically ordered.
        </AccountingAlert>
      )}
      <AccountingTable>
        <thead>
          <tr>
            <th>Date</th>
            <th>Account</th>
            <th>Voucher</th>
            <th>Remarks</th>
            <th>Debit</th>
            <th>Credit</th>
            <th>Running balance</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.length === 0 ? (
            <AccountingEmptyTableRow colSpan={7}>
              No ledger facts match these filters.
            </AccountingEmptyTableRow>
          ) : (
            data.rows.map((entry) => (
              <tr key={entry.id}>
                <td>{formatDate(entry.postingDate)}</td>
                <td>{entry.account}</td>
                <td>
                  {entry.journal ? (
                    <a
                      className="mnx-accounting-record-link"
                      href={`/accounting/journal-entries/${entry.journal.id}`}
                    >
                      {entry.journal.voucherNo}
                    </a>
                  ) : (
                    entry.voucherType
                  )}
                </td>
                <td>{entry.remarks ?? "—"}</td>
                <td className="mnx-accounting-amount">
                  {formatDecimalString(entry.debit)}
                </td>
                <td className="mnx-accounting-amount">
                  {formatDecimalString(entry.credit)}
                </td>
                <td className="mnx-accounting-amount">
                  {formatDecimalString(entry.runningBalance)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AccountingTable>
      <AccountingPagination
        basePath="/accounting/general-ledger"
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
      />
    </>
  );
}

export function ScheduledOperationsTable({ data }: { data: ScheduledList }) {
  return (
    <>
      <AccountingTable>
        <thead>
          <tr>
            <th>Template</th>
            <th>Version</th>
            <th>Legal entity</th>
            <th>Scheduled for</th>
            <th>Generated record</th>
            <th>Failure</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.length === 0 ? (
            <AccountingEmptyTableRow colSpan={7}>
              No guarded scheduled occurrences are registered.
            </AccountingEmptyTableRow>
          ) : (
            data.rows.map((occurrence) => (
              <tr key={occurrence.id}>
                <td>
                  {occurrence.templateType.replaceAll("_", " ")}
                  <small>{occurrence.templateId}</small>
                </td>
                <td>{occurrence.templateVersion}</td>
                <td>{occurrence.legalEntity}</td>
                <td>{formatDate(occurrence.scheduledFor)}</td>
                <td>
                  {occurrence.generatedRecordType
                    ? `${occurrence.generatedRecordType} · ${occurrence.generatedRecordId}`
                    : "—"}
                </td>
                <td>{occurrence.failureCode ?? "—"}</td>
                <td>
                  <AccountingStatus status={occurrence.status} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AccountingTable>
      <AccountingPagination
        basePath="/accounting/recurring"
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
      />
    </>
  );
}

export function AccountingOutboxTable({
  caps,
  data,
}: {
  caps: Caps;
  data: OutboxList;
}) {
  return (
    <>
      <AccountingAlert>
        Event payloads and idempotency identity are immutable. These controls do
        not contact a provider; publication remains restricted to guarded
        synthetic destinations.
      </AccountingAlert>
      <AccountingTable>
        <thead>
          <tr>
            <th>Event</th>
            <th>Aggregate</th>
            <th>Destination</th>
            <th>Attempts</th>
            <th>Next attempt</th>
            <th>Result / error</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.length === 0 ? (
            <AccountingEmptyTableRow colSpan={8}>
              No outbox events match this view.
            </AccountingEmptyTableRow>
          ) : (
            data.rows.map((event) => (
              <tr key={event.id}>
                <td>
                  {event.eventType}
                  <small>{formatDateTime(event.createdAt)}</small>
                </td>
                <td>
                  {event.aggregateType}
                  <small>{event.aggregateId}</small>
                </td>
                <td>{event.destination}</td>
                <td>{event.attempts}</td>
                <td>{formatDateTime(event.availableAt)}</td>
                <td>
                  {event.lastErrorCode ??
                    event.publicationResultCode ??
                    "No error recorded"}
                </td>
                <td>
                  <AccountingStatus status={event.status} />
                </td>
                <td>
                  <AccountingOutboxActions
                    id={event.id}
                    expectedVersion={event.rowVersion}
                    canRetry={
                      ["MANUAL_REVIEW", "DEAD_LETTER", "FAILED"].includes(
                        event.status,
                      ) && caps["accounting.outbox.retry"]
                    }
                    canMoveToReview={
                      event.status !== "PROCESSED" &&
                      caps["accounting.outbox.manual-review"]
                    }
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AccountingTable>
      <AccountingPagination
        basePath="/accounting/outbox"
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
      />
    </>
  );
}

export function AccountingPolicyGate({
  configured,
  readiness,
  description,
  requirements,
  title,
}: {
  configured?: boolean;
  readiness?: AccountingCapabilityReadiness;
  description: string;
  requirements: string[];
  title: string;
}) {
  const effectiveConfigured = readiness?.enabled ?? configured ?? false;
  const eyebrow = readiness
    ? readiness.uiStatus === "READY"
      ? "Ready"
      : readiness.uiStatus === "PARTIALLY_CONFIGURED"
        ? "Partially configured"
        : readiness.uiStatus === "AWAITING_APPROVAL"
          ? "Awaiting approval"
          : readiness.uiStatus === "EXPIRED"
            ? "Expired"
            : readiness.uiStatus === "INVALID_CONFIGURATION"
              ? "Invalid configuration"
              : "Configuration required"
    : effectiveConfigured
      ? "Configured"
      : "Policy required";
  const summary = readiness
    ? readiness.uiStatus === "READY"
      ? "The approved capability policy is active and effective."
      : readiness.uiStatus === "AWAITING_APPROVAL"
        ? "An independent approval is still required before this workflow can run."
        : readiness.uiStatus === "EXPIRED"
          ? "The last approved capability policy expired and the workflow is fail-closed."
          : readiness.uiStatus === "INVALID_CONFIGURATION"
            ? "The stored capability policy is invalid and the workflow is fail-closed."
            : readiness.uiStatus === "PARTIALLY_CONFIGURED"
              ? "The policy exists, but additional approved configuration is still required."
              : "No effective approved capability policy is available."
    : effectiveConfigured
      ? "The canonical configuration evidence is active."
      : "Posting and financial generation remain fail-closed.";
  const blockerRows = readiness?.blockers ?? [];
  const warningRows = readiness?.warnings ?? [];
  const allRows =
    blockerRows.length || warningRows.length
      ? [
          ...blockerRows.map((blocker) => ({
            key: `blocker:${blocker}`,
            label: blocker,
            status: "REQUIRED",
          })),
          ...warningRows.map((warning) => ({
            key: `warning:${warning}`,
            label: warning,
            status: "WARNING",
          })),
        ]
      : requirements.map((requirement) => ({
          key: `requirement:${requirement}`,
          label: requirement,
          status: effectiveConfigured ? "CONFIGURED" : "REQUIRED",
        }));
  return (
    <AccountingSection
      eyebrow={eyebrow}
      title={title}
      description={description}
    >
      <AccountingAlert variant={effectiveConfigured ? "success" : "warning"}>
        {effectiveConfigured ? (
          <CheckCircle2 aria-hidden="true" size={18} />
        ) : (
          <LockKeyhole aria-hidden="true" size={18} />
        )}
        {summary}
      </AccountingAlert>
      <ul className="mnx-accounting-list">
        {allRows.map((row) => (
          <li className="mnx-accounting-list-row" key={row.key}>
            <span>{row.label}</span>
            <AccountingStatus status={row.status} />
          </li>
        ))}
      </ul>
    </AccountingSection>
  );
}

export function AccountingConfigurationView({
  configuration,
}: {
  configuration: Configuration;
}) {
  return (
    <>
      <AccountingSection
        eyebrow="Foundation"
        title="Organisation and legal entities"
        description="Canonical configuration is displayed without inferred statutory values."
      >
        {configuration.profile ? (
          <AccountingDetailList>
            <AccountingDetail
              label="Functional currency"
              value={configuration.profile.functionalCurrencyCode}
            />
            <AccountingDetail
              label="Financial year start"
              value={`${configuration.profile.fiscalYearStartDay}/${configuration.profile.fiscalYearStartMonth}`}
            />
            <AccountingDetail
              label="Inventory mode"
              value={configuration.profile.inventoryMode.replaceAll("_", " ")}
            />
            <AccountingDetail
              label="Money / quantity scale"
              value={`${configuration.profile.moneyScale} / ${configuration.profile.quantityScale}`}
            />
            <AccountingDetail
              label="Rounding"
              value={configuration.profile.roundingMode.replaceAll("_", " ")}
            />
            <AccountingDetail
              label="Correction policy"
              value={
                configuration.profile.correctionPolicyConfigured
                  ? "Configured"
                  : "Required"
              }
            />
          </AccountingDetailList>
        ) : (
          <AccountingAlert variant="warning">
            The Accounting organisation profile is not configured.
          </AccountingAlert>
        )}
        <AccountingTable>
          <thead>
            <tr>
              <th>Code</th>
              <th>Legal name</th>
              <th>Type</th>
              <th>Registrations</th>
              <th>Default</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {configuration.legalEntities.map((entity) => (
              <tr key={entity.id}>
                <td>{entity.code}</td>
                <td>{entity.legalName}</td>
                <td>{entity.entityType}</td>
                <td>{entity.taxRegistrationCount}</td>
                <td>{entity.isDefault ? "Yes" : "No"}</td>
                <td>
                  <AccountingStatus status={entity.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Posting calendar"
        title="Accounting periods"
        description="Closed and locked periods are read-only; reopening requires the accepted maker-checker flow."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Period</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {configuration.periods.map((period) => (
              <tr key={period.id}>
                <td>{period.name}</td>
                <td>{formatDate(period.startDate)}</td>
                <td>{formatDate(period.endDate)}</td>
                <td>
                  <AccountingStatus status={period.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Currency controls"
        title="Currencies and approved rates"
        description="Foreign-currency posting requires immutable approved exchange-rate evidence."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Currency / pair</th>
              <th>Precision / rate</th>
              <th>Date</th>
              <th>Source</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {configuration.currencies.map((currency) => (
              <tr key={currency.id}>
                <td>
                  {currency.code} — {currency.name}
                </td>
                <td>{currency.decimalPlaces} decimal places</td>
                <td>—</td>
                <td>{currency.isFunctional ? "Functional" : "Enabled"}</td>
                <td>
                  <AccountingStatus
                    status={currency.isEnabled ? "ACTIVE" : "INACTIVE"}
                  />
                </td>
              </tr>
            ))}
            {configuration.exchangeRates.map((rate) => (
              <tr key={rate.id}>
                <td>{rate.pair}</td>
                <td>{formatDecimalString(rate.rate)}</td>
                <td>{formatDate(rate.rateDate)}</td>
                <td>{rate.source}</td>
                <td>
                  <AccountingStatus status={rate.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="Policies and numbering"
        title="Document controls"
        description={`${configuration.accountControlCount} accounts have canonical posting controls.`}
      >
        <div className="mnx-accounting-split-grid">
          <AccountingTable>
            <thead>
              <tr>
                <th>Document policy</th>
                <th>Entity</th>
                <th>Version</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {configuration.documentPolicies.map((policy) => (
                <tr key={policy.id}>
                  <td>{policy.documentType.replaceAll("_", " ")}</td>
                  <td>{policy.legalEntityCode}</td>
                  <td>{policy.version}</td>
                  <td>
                    <AccountingStatus
                      status={policy.isActive ? "ACTIVE" : "INACTIVE"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </AccountingTable>
          <AccountingTable>
            <thead>
              <tr>
                <th>Number series</th>
                <th>Template</th>
                <th>Next</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {configuration.numberSeries.map((series) => (
                <tr key={series.id}>
                  <td>{series.documentType}</td>
                  <td>{series.prefixTemplate}</td>
                  <td>{series.nextNumber}</td>
                  <td>
                    <AccountingStatus
                      status={series.isActive ? "ACTIVE" : "INACTIVE"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </AccountingTable>
        </div>
      </AccountingSection>
    </>
  );
}

export function CanonicalDocumentDetailView({
  caps,
  document,
  userId,
}: {
  caps: Caps;
  document: DocumentDetail;
  userId: string;
}) {
  const typeApprovePermission =
    document.documentType === "SALES_INVOICE"
      ? "accounting.sales-invoice.approve"
      : document.documentType === "PURCHASE_INVOICE"
        ? "accounting.purchase-invoice.approve"
        : document.correctionOf || document.correctionReason
          ? "accounting.correction.approve"
          : "accounting.document.approve";
  const actionState = deriveAccountingActionState({
    status: document.status,
    isMaker: document.makerId === userId,
    hasApprovePermission:
      Boolean(caps["accounting.document.approve"]) &&
      Boolean(caps[typeApprovePermission]),
    hasPostPermission: Boolean(caps["accounting.post"]),
    hasPreparePermission: false,
    hasReversePermission:
      Boolean(caps["accounting.reverse"]) &&
      Boolean(caps["accounting.correction.approve"]),
  });
  return (
    <>
      {actionState.reason ? (
        <AccountingAlert
          variant={
            document.status === "PENDING_APPROVAL" ? "warning" : "info"
          }
        >
          {actionState.reason}
        </AccountingAlert>
      ) : null}
      <AccountingFinancialActions
        canApprove={actionState.canApprove}
        canReverse={actionState.canReverse}
        expectedVersion={document.rowVersion}
        id={document.id}
        kind="document"
      />
      <AccountingSection
        eyebrow="Canonical document"
        title={document.documentType.replaceAll("_", " ")}
        description="Server-authoritative totals, immutable source identity, and legal-entity scope."
      >
        <AccountingDetailList>
          <AccountingDetail label="Status" value={<AccountingStatus status={document.status} />} />
          <AccountingDetail label="Legal entity" value={document.legalEntity} />
          <AccountingDetail label="Counterparty" value={document.counterparty} />
          <AccountingDetail label="Document date" value={formatDate(document.documentDate)} />
          <AccountingDetail label="Posting date" value={formatDate(document.postingDate)} />
          <AccountingDetail label="Due date" value={formatDate(document.dueDate)} />
          <AccountingDetail label="Maker" value={document.maker} />
          <AccountingDetail label="Approved by" value={document.approvedBy} />
          <AccountingDetail label="Row version" value={document.rowVersion} />
          <AccountingDetail label="Correlation" value={document.correlationId} />
        </AccountingDetailList>
      </AccountingSection>
      <AccountingSection
        eyebrow="Document lines"
        title="Computed source totals"
        description="The server recalculates and validates these values before canonical preparation."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Line</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit amount</th>
              <th>Tax</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {document.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.lineNumber}</td>
                <td>{line.description}</td>
                <td>{formatDecimalString(line.quantity)}</td>
                <td><AccountingMoney amount={line.unitAmount} currencyCode={document.currencyCode} /></td>
                <td><AccountingMoney amount={line.taxAmount} currencyCode={document.currencyCode} /></td>
                <td><AccountingMoney amount={line.totalAmount} currencyCode={document.currencyCode} /></td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
        <AccountingDetailList>
          <AccountingDetail label="Subtotal" value={<AccountingMoney amount={document.subtotal} currencyCode={document.currencyCode} />} />
          <AccountingDetail label="Discount" value={<AccountingMoney amount={document.discountAmount} currencyCode={document.currencyCode} />} />
          <AccountingDetail label="Tax" value={<AccountingMoney amount={document.taxAmount} currencyCode={document.currencyCode} />} />
          <AccountingDetail label="Total" value={<AccountingMoney amount={document.totalAmount} currencyCode={document.currencyCode} />} />
        </AccountingDetailList>
      </AccountingSection>
      <AccountingSection
        eyebrow="Journal effect"
        title="Canonical posting"
        description="Journal lines are read-only and can only be created by the canonical posting engine."
      >
        {document.journal ? (
          <>
            <AccountingAlert variant="success">
              Voucher {document.journal.voucherNo} is linked to this document.
            </AccountingAlert>
            <AccountingTable>
              <thead><tr><th>Account</th><th>Remarks</th><th>Debit</th><th>Credit</th></tr></thead>
              <tbody>
                {document.journal.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.account}</td>
                    <td>{line.remarks ?? "—"}</td>
                    <td><AccountingMoney amount={line.debit} currencyCode={document.baseCurrencyCode} /></td>
                    <td><AccountingMoney amount={line.credit} currencyCode={document.baseCurrencyCode} /></td>
                  </tr>
                ))}
              </tbody>
            </AccountingTable>
          </>
        ) : (
          <AccountingAlert variant="warning">
            No ledger effect exists. Pending approval is not a posting.
          </AccountingAlert>
        )}
      </AccountingSection>
      <AccountingSection
        eyebrow="Lineage"
        title="Corrections and allocations"
        description="Source, correction, allocation, and reversal relationships remain explicit."
      >
        <AccountingDetailList>
          <AccountingDetail label="Source system" value={document.sourceSnapshot.sourceSystem} />
          <AccountingDetail label="Source type" value={document.sourceSnapshot.sourceType} />
          <AccountingDetail label="Source version" value={document.sourceSnapshot.sourceVersion} />
          <AccountingDetail label="Correction of" value={document.correctionOf?.id} />
          <AccountingDetail label="Corrections" value={document.corrections.length} />
          <AccountingDetail label="Active allocations" value={document.allocations.length} />
        </AccountingDetailList>
        {document.corrections.map((correction) => (
          <a className="mnx-accounting-record-link" href={`/accounting/documents/${correction.id}`} key={correction.id}>
            <strong>{correction.documentType.replaceAll("_", " ")}</strong>
            <span>{correction.correctionReason ?? "Correction document"} · {correction.status}</span>
          </a>
        ))}
      </AccountingSection>
      <AccountingSection
        eyebrow="Audit"
        title="Activity history"
        description="Immutable Accounting audit events for this document and its journal."
      >
        <ul className="mnx-accounting-list">
          {document.audit.length ? document.audit.map((event) => (
            <li className="mnx-accounting-list-row" key={event.id}>
              <div><b>{event.action.replaceAll("_", " ")}</b><small>{event.actor}</small></div>
              <span>{formatDateTime(event.occurredAt)}</span>
            </li>
          )) : <li>No audit events are available.</li>}
        </ul>
      </AccountingSection>
    </>
  );
}

export function CanonicalPaymentDetailView({
  caps,
  payment,
  userId,
}: {
  caps: Caps;
  payment: PaymentDetail;
  userId: string;
}) {
  const actionState = deriveAccountingActionState({
    status: payment.status,
    isMaker: payment.makerId === userId,
    hasApprovePermission: Boolean(caps["accounting.payment.approve"]),
    hasPostPermission: Boolean(caps["accounting.payment.post"]),
    hasPreparePermission: false,
    hasReversePermission:
      Boolean(caps["accounting.payment.reverse"]) &&
      Boolean(caps["accounting.reverse"]),
  });
  return (
    <>
      {actionState.reason ? (
        <AccountingAlert variant={payment.status === "PENDING_APPROVAL" ? "warning" : "info"}>
          {actionState.reason}
        </AccountingAlert>
      ) : null}
      <AccountingFinancialActions
        canApprove={actionState.canApprove}
        canReverse={actionState.canReverse}
        expectedVersion={payment.rowVersion}
        id={payment.id}
        kind="payment"
      />
      <AccountingSection
        eyebrow="Canonical payment"
        title={payment.paymentType.replaceAll("_", " ")}
        description="Approval, Accounting posting, and external fund execution are separate states."
      >
        <AccountingAlert>
          A posted Accounting payment records ledger effect only. It does not
          assert bank transfer or external settlement.
        </AccountingAlert>
        <AccountingDetailList>
          <AccountingDetail label="Status" value={<AccountingStatus status={payment.status} />} />
          <AccountingDetail label="Legal entity" value={payment.legalEntity} />
          <AccountingDetail label="Party" value={payment.party} />
          <AccountingDetail label="Date" value={formatDate(payment.transactionDate)} />
          <AccountingDetail label="Method" value={payment.paymentMethod} />
          <AccountingDetail label="Reference" value={payment.externalReference} />
          <AccountingDetail label="Maker" value={payment.maker} />
          <AccountingDetail label="Approved by" value={payment.approvedBy} />
          <AccountingDetail label="Row version" value={payment.rowVersion} />
        </AccountingDetailList>
        <AccountingDetailList>
          <AccountingDetail label="Amount" value={<AccountingMoney amount={payment.amount} currencyCode={payment.currencyCode} />} />
          <AccountingDetail label="Allocated" value={<AccountingMoney amount={payment.allocatedAmount} currencyCode={payment.currencyCode} />} />
          <AccountingDetail label="Unapplied" value={<AccountingMoney amount={payment.unappliedAmount} currencyCode={payment.currencyCode} />} />
        </AccountingDetailList>
      </AccountingSection>
      <AccountingSection
        eyebrow="Allocation history"
        title="Eligible targets"
        description="Partial and multi-document allocations are preserved with target versions."
      >
        <AccountingTable>
          <thead><tr><th>Target</th><th>Version</th><th>Amount</th><th>Reversal</th><th>Status</th></tr></thead>
          <tbody>
            {payment.allocations.length ? payment.allocations.map((allocation) => (
              <tr key={allocation.id}>
                <td>
                  {allocation.targetDocument ? (
                    <a className="mnx-accounting-record-link" href={`/accounting/documents/${allocation.targetDocument.id}`}>
                      {allocation.targetDocument.documentType.replaceAll("_", " ")}
                    </a>
                  ) : "Approved source snapshot"}
                </td>
                <td>{allocation.targetVersion}</td>
                <td><AccountingMoney amount={allocation.amount} currencyCode={payment.currencyCode} /></td>
                <td>{allocation.reversalCount ? `${allocation.reversalCount} linked` : "—"}</td>
                <td><AccountingStatus status={allocation.status} /></td>
              </tr>
            )) : <AccountingEmptyTableRow colSpan={5}>This payment is entirely on account.</AccountingEmptyTableRow>}
          </tbody>
        </AccountingTable>
      </AccountingSection>
      <AccountingSection
        eyebrow="Journal effect"
        title="Canonical posting"
        description="Read-only ledger effect and reversal lineage."
      >
        {payment.journal ? (
          <AccountingTable>
            <thead><tr><th>Account</th><th>Remarks</th><th>Debit</th><th>Credit</th></tr></thead>
            <tbody>{payment.journal.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.account}</td><td>{line.remarks ?? "—"}</td>
                <td><AccountingMoney amount={line.debit} currencyCode={payment.baseCurrencyCode} /></td>
                <td><AccountingMoney amount={line.credit} currencyCode={payment.baseCurrencyCode} /></td>
              </tr>
            ))}</tbody>
          </AccountingTable>
        ) : <AccountingAlert variant="warning">No ledger effect exists yet.</AccountingAlert>}
      </AccountingSection>
      <AccountingSection
        eyebrow="Audit"
        title="Activity history"
        description="Canonical payment and journal audit events."
      >
        <ul className="mnx-accounting-list">
          {payment.audit.length ? payment.audit.map((event) => (
            <li className="mnx-accounting-list-row" key={event.id}>
              <div><b>{event.action.replaceAll("_", " ")}</b><small>{event.actor}</small></div>
              <span>{formatDateTime(event.occurredAt)}</span>
            </li>
          )) : <li>No audit events are available.</li>}
        </ul>
      </AccountingSection>
    </>
  );
}

export function CanonicalJournalDetailView({
  journal,
}: {
  journal: JournalDetail;
}) {
  return (
    <>
      <AccountingAlert>
        Journal facts and dimensions are read-only. Corrections create linked
        reversals or replacements; direct line editing is unavailable.
      </AccountingAlert>
      <AccountingSection
        eyebrow="Journal header"
        title={journal.voucherNo}
        description="Canonical posting identity, scope, approval, and source lineage."
      >
        <AccountingDetailList>
          <AccountingDetail
            label="Status"
            value={<AccountingStatus status={journal.status} />}
          />
          <AccountingDetail label="Type" value={journal.journalType} />
          <AccountingDetail label="Posting date" value={formatDate(journal.postingDate)} />
          <AccountingDetail label="Legal entity" value={journal.legalEntity} />
          <AccountingDetail
            label="Period"
            value={
              journal.period
                ? `${journal.period.name} · ${journal.period.status}`
                : "Legacy / unresolved"
            }
          />
          <AccountingDetail label="Created by" value={journal.createdBy} />
          <AccountingDetail label="Approved by" value={journal.approvedBy} />
          <AccountingDetail label="Posted by" value={journal.postedBy} />
          <AccountingDetail label="Row version" value={journal.rowVersion} />
          <AccountingDetail label="Correlation" value={journal.correlationId} />
        </AccountingDetailList>
      </AccountingSection>
      <AccountingSection
        eyebrow="Double entry"
        title="Journal lines"
        description="Exact Decimal debit and credit facts in deterministic line order."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Account</th>
              <th>Party</th>
              <th>Dimensions</th>
              <th>Remarks</th>
              <th>Debit</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            {journal.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.account}</td>
                <td>
                  {line.partyType
                    ? `${line.partyType} · ${line.partyId ?? "—"}`
                    : "—"}
                </td>
                <td>
                  {line.dimensions.length
                    ? line.dimensions
                        .map(
                          (dimension) =>
                            `${dimension.definition}: ${dimension.value}`,
                        )
                        .join(" · ")
                    : "—"}
                </td>
                <td>{line.remarks ?? "—"}</td>
                <td>
                  <AccountingMoney
                    amount={line.debit}
                    currencyCode={journal.currencyCode}
                  />
                </td>
                <td>
                  <AccountingMoney
                    amount={line.credit}
                    currencyCode={journal.currencyCode}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
        <AccountingDetailList>
          <AccountingDetail
            label="Total debit"
            value={
              <AccountingMoney
                amount={journal.totalDebit}
                currencyCode={journal.currencyCode}
              />
            }
          />
          <AccountingDetail
            label="Total credit"
            value={
              <AccountingMoney
                amount={journal.totalCredit}
                currencyCode={journal.currencyCode}
              />
            }
          />
        </AccountingDetailList>
      </AccountingSection>
      <AccountingSection
        eyebrow="Lineage"
        title="Source and corrections"
        description="Originating documents, payments, reversals, and replacements."
      >
        <AccountingDetailList>
          <AccountingDetail
            label="Source"
            value={
              journal.sourceSnapshot
                ? `${journal.sourceSnapshot.sourceSystem} · ${journal.sourceSnapshot.sourceType}`
                : "Legacy / unavailable"
            }
          />
          <AccountingDetail
            label="Source version"
            value={journal.sourceSnapshot?.sourceVersion}
          />
          <AccountingDetail label="Reversal of" value={journal.reversalOf?.voucherNo} />
          <AccountingDetail label="Reversals" value={journal.reversals.length} />
          <AccountingDetail label="Replacement of" value={journal.replacementOf?.voucherNo} />
          <AccountingDetail label="Replacements" value={journal.replacements.length} />
          <AccountingDetail label="Source documents" value={journal.documents.length} />
          <AccountingDetail label="Source payments" value={journal.payments.length} />
        </AccountingDetailList>
        {[...journal.documents, ...journal.payments].map((source) => {
          const isDocument = "documentType" in source;
          return (
            <a
              className="mnx-accounting-record-link"
              href={
                isDocument
                  ? `/accounting/documents/${source.id}`
                  : `/accounting/payments/${source.id}`
              }
              key={`${isDocument ? "document" : "payment"}-${source.id}`}
            >
              <strong>
                {isDocument
                  ? source.documentType.replaceAll("_", " ")
                  : source.paymentType.replaceAll("_", " ")}
              </strong>
              <span>{source.status}</span>
            </a>
          );
        })}
      </AccountingSection>
      <AccountingSection
        eyebrow="Audit"
        title="Journal activity"
        description="Canonical audit events for this immutable journal."
      >
        <ul className="mnx-accounting-list">
          {journal.audit.length ? (
            journal.audit.map((event) => (
              <li className="mnx-accounting-list-row" key={event.id}>
                <div>
                  <b>{event.action.replaceAll("_", " ")}</b>
                  <small>{event.actor}</small>
                </div>
                <span>{formatDateTime(event.occurredAt)}</span>
              </li>
            ))
          ) : (
            <li>No audit events are available.</li>
          )}
        </ul>
      </AccountingSection>
    </>
  );
}

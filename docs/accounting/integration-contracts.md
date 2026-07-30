# Accounting Integration Contracts

Status: Phase 2 versioned contract design. No external provider connection or production event flow is authorized.

## Transport-independent envelope

```json
{
  "eventId": "globally-stable-id",
  "eventType": "crm.invoice-request.approved",
  "eventVersion": 1,
  "occurredAt": "2027-04-01T00:00:00.000Z",
  "orgId": "tenant-id",
  "aggregate": {
    "type": "CRM_INVOICE_REQUEST",
    "id": "canonical-id",
    "version": 4
  },
  "idempotencyKey": "CRM:invoice-request-id:4",
  "correlationId": "workflow-id",
  "payload": {}
}
```

`orgId` is validated against the authenticated producer identity, not trusted from payload alone. Payload hashes, schema version, processing state, attempts and error code are retained in `AccountingIntegrationInbox`. Results are emitted atomically through `AccountingIntegrationOutbox`.

## Producer/consumer contracts

### CRM → Accounting: approved invoice request

Required: canonical customer ID, request ID/version, approved commercial source IDs, service lines with Decimal-string quantity/rate/discount, currency, requested dates, branch, tax-relevant customer/address snapshots and optional canonical `ChaJob.id`. CRM approval must be immutable.

Accounting validates and either creates an Accounting-owned draft or rejects with stable reasons. It does not let CRM select a journal/account ID or statutory number.

Accounting → CRM returns request status, Accounting document ID/version, statutory number only after assignment, posting/reversal status, billed/credited/collected summaries and reconciliation watermark.

### HRMS → Accounting: approved payroll run

Required: run ID/version, period, approval identity/time, currency, Decimal-string totals, employee/component subledger detail, liabilities/deductions, payment grouping and payload hash. Sensitive detail is encrypted/restricted and minimized for consumers.

Accounting returns accepted/rejected, journal/reversal IDs, payable/payment states and reconciliation exceptions. Accounting never recalculates salary or modifies the HRMS run.

### HRMS/CHA → Accounting: approved claim

Required: claim ID/version, claimant canonical employee/vendor ID, owner module, approval lineage, expense/tax classification inputs, branch, canonical `ChaJob.id` where applicable, Decimal amount/currency and document references.

Accounting owns payable, advance/loan/recovery treatment, payment and financial settlement. It returns accepted/posting/payment/reversal status. Source modules never mark financial settlement independently.

### AMS → Accounting: asset candidate/lifecycle

Required: AMS asset ID/version, acquisition/source document references, operational class/location/custodian and lifecycle event. Accounting applies its own approved capitalization and book policy, returning financial asset ID, book value, depreciation/disposal status and exceptions.

### CHA → Accounting: job dimension

`ChaJob.id` is the only future canonical job ID. CHA provides versioned job identity/customer/branch/status. Accounting stores the canonical reference on financial facts and publishes billed/cost/receipt/payment/profitability read models. `JobCosting` is a legacy mapping target, not a second source.

### Accounting → Communication/portals

Accounting emits immutable document version/hash and recipient/party authorization context. Communication owns delivery attempts, not financial content. Portal users can view authorized immutable documents, submit remittance/query/dispute/KYC/bank-change requests, and never post or mutate journal facts.

## Delivery, retries and errors

- Inbox uniqueness is `(orgId, sourceSystem, idempotencyKey)`.
- Outbox uniqueness is `(orgId, destination, idempotencyKey)`.
- Consumers claim pending work with row locking/skip-locked semantics.
- Retries use bounded exponential backoff; permanent schema/authorization failures go to dead letter.
- Processing and Accounting mutation occur in one transaction where local. External publication uses transactional outbox.
- Replay with the same key and payload hash is a no-op success. A different hash is an idempotency conflict.
- Compensation never edits posted lines; it submits a versioned reversal/correction command.

## Reconciliation

| Flow | Required equality |
|---|---|
| CRM request | One accepted active Accounting draft/posting lineage per request version |
| Sales | Requested, invoiced, credited, received and outstanding totals bridge by canonical IDs |
| Payroll | Approved HRMS run totals = Accounting subledger totals = journals; payments bridge separately |
| Claims | Approved claim amount = payable/advance/recovery disposition + rejected exception |
| Assets | Capitalized source cost and lifecycle events bridge to each Accounting book |
| CHA job | Source documents and allocations bridge to job-tagged revenue/cost/AR/AP/cash |
| Portals | Party-visible document/payment status matches Accounting watermark |

Reconciliation jobs are read-only except for durable exception records and acknowledgements. They never repair journals directly.

## Schema evolution

Event versions are integers. Additive compatible fields do not change meaning; breaking changes publish a new version and retain the previous consumer during transition. Producers cannot remove required fields until consumer metrics prove the old version drained and an explicit contract migration is approved.

## Security and privacy

- Service identity is tenant-scoped and least privilege.
- Payroll, bank and tax identifiers are field-restricted and never included in general events.
- Credentials and provider secrets live outside payloads, logs, source control and database exports.
- No contract currently authorizes Zoho, bank API, GST filing, e-invoice or e-way-bill connections.

## Phase 3 implemented envelopes and adapters

Envelope v1 contains organization/legal entity, source system/type/id/version, request and idempotency IDs, immutable payload/hash, occurred/approval evidence, actor scope, posting/document dates, currency/rate evidence, rule, lines/dimensions, policy/number/rounding versions, documents and correlation/causation IDs.

- Bank transfer preparation validates active same-tenant bank/cash accounts and exact Decimal amount, then persists a `PENDING` immutable request. A separate Accounting poster supplies approval evidence and invokes the canonical engine.
- CRM won-deal conversion now creates only an idempotent immutable Accounting invoice request. CRM permission does not grant Accounting draft/post authority, and the adapter does not inject tax, account, due-date or statutory-number examples.
- HRMS payroll acceptance stores an immutable approved run/version and allocation detail. Accounting checks exact balance, accounts, dimensions, period, approval and authorization but does not calculate salary. Accrual posting uses a distinct deterministic request ID while retaining the HRMS event as causation.

Inbox outcomes are `PENDING`, `PROCESSING`, `PROCESSED`, `REJECTED`, `RETRYABLE`, or `MANUAL_REVIEW`; attempt number and safe classification are retained. The transactional outbox is sufficient for this phase and no external broker/provider is connected.

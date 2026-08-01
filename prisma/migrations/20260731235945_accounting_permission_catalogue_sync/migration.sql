-- Synchronize the Accounting permission catalogue and system Admin grants.
-- This migration is additive and intentionally leaves non-Admin roles unchanged.

WITH "accountingPermissionCatalogue" ("key", "label") AS (
  VALUES
    ('accounting.dashboard.view', 'View accounting dashboard'),
    ('accounting.account.read', 'View Chart of Accounts'),
    ('accounting.account.create', 'Create ledger accounts'),
    ('accounting.account.update', 'Update ledger accounts'),
    ('accounting.journal.read', 'View Journal Entries'),
    ('accounting.journal.create', 'Create Journal Entries'),
    ('accounting.journal.submit', 'Submit Journal Entries'),
    ('accounting.journal.cancel', 'Cancel Journal Entries'),
    ('accounting.invoice.read', 'View Sales & Purchase Invoices'),
    ('accounting.invoice.create', 'Create Invoices'),
    ('accounting.invoice.update', 'Update Invoices'),
    ('accounting.invoice.submit', 'Submit/Post Invoices'),
    ('accounting.invoice.cancel', 'Cancel/Reverse Invoices'),
    ('accounting.payment.read', 'View Payments'),
    ('accounting.payment.create', 'Create Payments'),
    ('accounting.payment.submit', 'Submit Payments'),
    ('accounting.reports.view', 'View Financial Reports'),
    ('accounting.settings.manage', 'Manage Accounting Settings'),
    ('accounting.draft.create', 'Create Accounting drafts'),
    ('accounting.journal.prepare', 'Prepare journal entries'),
    ('accounting.journal.approve', 'Approve journal entries'),
    ('accounting.post', 'Post approved Accounting requests'),
    ('accounting.reverse', 'Reverse posted Accounting journals'),
    ('accounting.replace', 'Replace reversed Accounting journals'),
    ('accounting.period_lock.request', 'Request Accounting period locks or reopening'),
    ('accounting.period_lock.approve', 'Approve Accounting period locks or reopening'),
    ('accounting.exchange_rate.maintain', 'Maintain Accounting exchange rates'),
    ('accounting.rounding_policy.admin', 'Administer Accounting rounding policies'),
    ('accounting.approval_policy.admin', 'Administer Accounting approval policies'),
    ('accounting.number_series.admin', 'Administer Accounting number series'),
    ('accounting.integration.post', 'Post through a trusted Accounting integration'),
    ('accounting.integration.retry', 'Retry or review Accounting integration requests'),
    ('accounting.integration.manual-review', 'Review Accounting integration failures'),
    ('accounting.ledger.read', 'Read the Accounting ledger'),
    ('accounting.audit.read', 'Read Accounting audit lineage'),
    ('accounting.document.read', 'Read canonical Accounting documents'),
    ('accounting.document.approve', 'Approve canonical Accounting documents'),
    ('accounting.sales-invoice.prepare', 'Prepare sales invoices'),
    ('accounting.sales-invoice.approve', 'Approve sales invoices'),
    ('accounting.purchase-invoice.prepare', 'Prepare purchase invoices'),
    ('accounting.purchase-invoice.approve', 'Approve purchase invoices'),
    ('accounting.receipt.prepare', 'Prepare customer receipts'),
    ('accounting.payment.prepare', 'Prepare Accounting payments'),
    ('accounting.payment.approve', 'Approve Accounting payments'),
    ('accounting.payment.post', 'Post approved Accounting payments'),
    ('accounting.payment.allocate', 'Allocate Accounting payments'),
    ('accounting.payment.reverse', 'Reverse posted Accounting payments'),
    ('accounting.credit-note.prepare', 'Prepare Accounting credit notes'),
    ('accounting.debit-note.prepare', 'Prepare Accounting debit notes'),
    ('accounting.correction.approve', 'Approve Accounting corrections'),
    ('accounting.payroll-payment.integrate', 'Consume approved payroll payments'),
    ('accounting.payroll-correction.integrate', 'Consume approved payroll corrections'),
    ('accounting.payroll-payment.sensitive.read', 'Read sensitive payroll payment detail'),
    ('accounting.depreciation.integrate', 'Consume approved depreciation runs'),
    ('accounting.recurring-template.admin', 'Administer recurring Accounting templates'),
    ('accounting.recurring-occurrence.process', 'Process recurring Accounting occurrences'),
    ('accounting.partner-transaction.prepare', 'Prepare partner transactions'),
    ('accounting.outbox.retry', 'Retry Accounting outbox publication'),
    ('accounting.outbox.manual-review', 'Review Accounting outbox publication'),
    ('accounting.capability-policy.read', 'Read Accounting capability policies'),
    ('accounting.capability-policy.manage', 'Manage Accounting capability policy drafts'),
    ('accounting.capability-policy.approve', 'Approve Accounting capability policies'),
    ('accounting.migration.read', 'Read Accounting migration evidence'),
    ('accounting.migration.execute', 'Execute guarded Accounting migration preparation'),
    ('accounting.migration.mapping.manage', 'Manage Accounting migration mappings'),
    ('accounting.migration.exception.manage', 'Resolve Accounting migration exceptions'),
    ('accounting.readiness.read', 'Read Accounting production-readiness evidence')
)
INSERT INTO "Permission" ("id", "key", "label", "group")
SELECT
  'perm_' || md5("key"),
  "key",
  "label",
  'Accounting'
FROM "accountingPermissionCatalogue"
ON CONFLICT ("key") DO UPDATE
SET
  "label" = EXCLUDED."label",
  "group" = EXCLUDED."group";

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT
  role."id",
  permission."id"
FROM "Role" AS role
CROSS JOIN "Permission" AS permission
WHERE
  role."name" = 'Admin'
  AND role."isSystem" = true
  AND permission."key" LIKE 'accounting.%'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

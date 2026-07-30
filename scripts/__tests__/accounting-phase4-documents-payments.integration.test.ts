import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

import { db } from "@/lib/db";
import {
  approveAndPostAccountingDocument,
  approveAndPostAccountingPayment,
  prepareLegacyCustomerNote,
  prepareLegacyPayment,
  prepareLegacySalesInvoice,
} from "@/modules/accounting/document-adapters";
import {
  claimAccountingOutbox,
  publishClaimedSyntheticOutbox,
} from "@/modules/accounting/outbox-operations";
import { payloadHash } from "@/modules/accounting/request-integrity";
import {
  claimAccountingScheduledOccurrences,
  registerAccountingScheduledOccurrence,
  settleAccountingScheduledOccurrence,
} from "@/modules/accounting/scheduled-operations";
import {
  assertExactStagingEnvironment,
  verifyExactStagingDatabaseIdentity,
} from "../staging-target";

const orgId = "stg_org_monolith_accounting";
const legalEntityId = "stg_accounting_legal_entity";
const makerId = "stg_user_accounting_maker";
const checkerId = "stg_user_accounting_checker";
const makerRoleId = "stg_role_accounting_maker";
const checkerRoleId = "stg_role_accounting_checker";
const salesInvoiceId = "p4test-sales-invoice";
const paymentEntryId = "p4test-customer-receipt";
const salesPolicyId = "p4test-policy-sales";
let client: Client;

const phase4Permissions = {
  maker: [
    "accounting.sales-invoice.prepare",
    "accounting.receipt.prepare",
    "accounting.credit-note.prepare",
    "accounting.recurring-occurrence.process",
  ],
  checker: [
    "accounting.document.approve",
    "accounting.sales-invoice.approve",
    "accounting.correction.approve",
    "accounting.payment.approve",
    "accounting.payment.post",
    "accounting.outbox.retry",
    "accounting.outbox.manual-review",
  ],
};

async function cleanupPhase4Fixtures() {
  await client.query("BEGIN");
  try {
    await client.query(
      `SELECT set_config('monolith.accounting_seed_fixture', 'on', true)`,
    );
    await client.query(
      `DELETE FROM "RolePermission"
       WHERE "roleId" = $1
         AND "permissionId" IN (
           SELECT id FROM "Permission"
           WHERE key IN (
             'accounting.document.approve',
             'accounting.sales-invoice.approve',
             'accounting.post'
           )
         )`,
      [makerRoleId],
    );
    await client.query(
      `DELETE FROM "AccountingScheduledOccurrence"
       WHERE "orgId" = $1 AND "templateId" LIKE 'p4test-%'`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "AccountingSourceSnapshot"
       WHERE "orgId" = $1
         AND "sourceSystem" = 'ACCOUNTING'
         AND payload->>'templateId' LIKE 'p4test-%'`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "AccountingIntegrationOutbox"
       WHERE "orgId" = $1
         AND "aggregateId" IN (
           SELECT id FROM "JournalEntry"
           WHERE "orgId" = $1 AND "sourceId" LIKE 'p4test-%'
         )`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "GeneralLedgerEntry"
       WHERE "journalEntryId" IN (
         SELECT id FROM "JournalEntry"
         WHERE "orgId" = $1 AND "sourceId" LIKE 'p4test-%'
       )`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "AccountingPostingAttempt"
       WHERE "orgId" = $1 AND "requestId" LIKE 'ACCOUNTING:%p4test-%'`,
      [orgId],
    );
    await client.query(
      `UPDATE "AccountingDocument"
       SET "journalEntryId" = NULL
       WHERE "orgId" = $1 AND "sourceId" LIKE 'p4test-%'`,
      [orgId],
    );
    await client.query(
      `UPDATE "AccountingPayment"
       SET "journalEntryId" = NULL
       WHERE "orgId" = $1 AND "sourceId" LIKE 'p4test-%'`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "JournalEntryLine"
       WHERE "journalEntryId" IN (
         SELECT id FROM "JournalEntry"
         WHERE "orgId" = $1 AND "sourceId" LIKE 'p4test-%'
       )`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "JournalEntry"
       WHERE "orgId" = $1 AND "sourceId" LIKE 'p4test-%'`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "AccountingPaymentAllocation"
       WHERE "paymentId" IN (
         SELECT id FROM "AccountingPayment"
         WHERE "orgId" = $1 AND "sourceId" LIKE 'p4test-%'
       )`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "AccountingPayment"
       WHERE "orgId" = $1 AND "sourceId" LIKE 'p4test-%'`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "AccountingDocumentLine"
       WHERE "documentId" IN (
         SELECT id FROM "AccountingDocument"
         WHERE "orgId" = $1 AND "sourceId" LIKE 'p4test-%'
       )`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "AccountingDocument"
       WHERE "orgId" = $1 AND "sourceId" LIKE 'p4test-%'`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "AccountingIntegrationInbox"
       WHERE "orgId" = $1 AND (
         "requestId" LIKE 'ACCOUNTING:%p4test-%'
         OR "idempotencyKey" LIKE 'ACCOUNTING:%p4test-%'
       )`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "AccountingSourceSnapshot"
       WHERE "orgId" = $1 AND "sourceId" LIKE 'p4test-%'`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "PaymentAllocation"
       WHERE "paymentEntryId" LIKE 'p4test-%'`,
    );
    await client.query(
      `DELETE FROM "PaymentEntry" WHERE "orgId" = $1 AND id LIKE 'p4test-%'`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "CustomerNoteItem"
       WHERE "customerNoteId" LIKE 'p4test-%'`,
    );
    await client.query(
      `DELETE FROM "CustomerNote" WHERE "orgId" = $1 AND id LIKE 'p4test-%'`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "SalesInvoiceItem" WHERE "invoiceId" LIKE 'p4test-%'`,
    );
    await client.query(
      `DELETE FROM "SalesInvoice" WHERE "orgId" = $1 AND id LIKE 'p4test-%'`,
      [orgId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function configurePhase4Fixtures() {
  for (const [id, partyType, partyId] of [
    ["p4test-customer-entity-scope", "CUSTOMER", "stg_crm_customer"],
    ["p4test-supplier-entity-scope", "SUPPLIER", "stg_crm_vendor"],
  ] as const) {
    await db.accountingCounterpartyEntityScope.upsert({
      where: { id },
      update: { isActive: true },
      create: {
        id,
        orgId,
        legalEntityId,
        partyType,
        partyId,
        version: 1,
        isActive: true,
        effectiveFrom: new Date("2027-04-01T00:00:00.000Z"),
        approvedById: checkerId,
        approvedAt: new Date("2027-04-01T00:00:00.000Z"),
      },
    });
  }
  for (const [roleId, keys] of [
    [makerRoleId, phase4Permissions.maker],
    [checkerRoleId, phase4Permissions.checker],
  ] as const) {
    for (const key of keys) {
      const permission = await db.permission.upsert({
        where: { key },
        update: {},
        create: { key, label: `STAGING ${key}`, group: "Accounting" },
      });
      await db.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId, permissionId: permission.id },
        },
        update: {},
        create: { roleId, permissionId: permission.id },
      });
    }
  }
  for (const [id, documentType, prefix] of [
    ["p4test-approval-sales", "SALES_INVOICE", "P4-SI"],
    ["p4test-approval-payment", "PAYMENT_ENTRY", "P4-PAY"],
    ["p4test-approval-customer-note", "CUSTOMER_NOTE", "P4-CN"],
  ] as const) {
    await db.accountingApprovalPolicy.upsert({
      where: { id },
      update: { isActive: true },
      create: {
        id,
        orgId,
        code: id,
        documentType,
        version: 1,
        configuration: { makerChecker: true, synthetic: true },
        isActive: true,
        effectiveFrom: new Date("2027-04-01T00:00:00.000Z"),
      },
    });
    await db.accountingNumberSeries.upsert({
      where: { id: `${id}-series` },
      update: { nextNumber: 1, isActive: true },
      create: {
        id: `${id}-series`,
        orgId,
        documentType,
        prefixTemplate: `${prefix}/{FY}/`,
        nextNumber: 1,
        padding: 4,
        effectiveFrom: new Date("2027-04-01T00:00:00.000Z"),
      },
    });
  }
  const salesConfiguration = {
    currencyCode: "INR",
    receivableAccountId: "stg_account_receivable",
    revenueAccountId: "stg_account_sales",
    taxRate: "0",
    allowZeroTax: true,
  };
  const receiptConfiguration = {
    currencyCode: "INR",
    receivableAccountId: "stg_account_receivable",
    paymentMethod: "SYNTHETIC_BANK",
    allowUnappliedPayments: false,
  };
  const creditConfiguration = {
    currencyCode: "INR",
    receivableAccountId: "stg_account_receivable",
    revenueAccountId: "stg_account_sales",
    preserveOriginalPolicyId: salesPolicyId,
  };
  for (const [id, documentType, configuration] of [
    [salesPolicyId, "SALES_INVOICE", salesConfiguration],
    ["p4test-policy-receipt", "CUSTOMER_RECEIPT", receiptConfiguration],
    ["p4test-policy-credit", "CUSTOMER_CREDIT_NOTE", creditConfiguration],
  ] as const) {
    await db.accountingDocumentPolicy.upsert({
      where: {
        orgId_legalEntityId_documentType_version: {
          orgId,
          legalEntityId,
          documentType,
          version: 1,
        },
      },
      update: {
        configuration,
        configurationHash: payloadHash(configuration),
        isActive: true,
      },
      create: {
        id,
        orgId,
        legalEntityId,
        documentType,
        version: 1,
        configuration,
        configurationHash: payloadHash(configuration),
        statutoryValidated: false,
        approvedById: checkerId,
        approvedAt: new Date("2027-04-01T00:00:00.000Z"),
        effectiveFrom: new Date("2027-04-01T00:00:00.000Z"),
        isActive: true,
      },
    });
  }
}

beforeAll(async () => {
  await verifyExactStagingDatabaseIdentity("Phase 4 documents and payments test");
  const { connectionString } = assertExactStagingEnvironment(
    "Phase 4 documents and payments test",
  );
  client = new Client({
    connectionString,
    application_name: "monolith-accounting-phase4-documents-payments",
  });
  await client.connect();
  await cleanupPhase4Fixtures();
  await configurePhase4Fixtures();
  await db.salesInvoice.create({
    data: {
      id: salesInvoiceId,
      orgId,
      invoiceNumber: "P4TEST-SI-1",
      customerId: "stg_crm_customer",
      postingDate: new Date("2027-04-10T00:00:00.000Z"),
      dueDate: new Date("2027-04-20T00:00:00.000Z"),
      status: "DRAFT",
      grandTotal: "100",
      outstandingAmount: "100",
      createdById: makerId,
      items: {
        create: {
          id: "p4test-sales-line",
          itemName: "Synthetic service",
          qty: 1,
          rate: "100",
          amount: "100",
        },
      },
    },
  });
});

afterAll(async () => {
  if (!client) return;
  try {
    await cleanupPhase4Fixtures();
  } finally {
    await client.end();
    await db.$disconnect();
  }
});

describe("Accounting Phase 4 canonical documents and payments", () => {
  it("prepares a sales invoice idempotently and posts through an independent checker", async () => {
    const first = await prepareLegacySalesInvoice({
      orgId,
      invoiceId: salesInvoiceId,
      makerId,
    });
    const replay = await prepareLegacySalesInvoice({
      orgId,
      invoiceId: salesInvoiceId,
      makerId,
    });
    expect(replay.id).toBe(first.id);
    const result = await approveAndPostAccountingDocument({
      orgId,
      documentId: first.id,
      approverId: checkerId,
    });
    expect(result.replayed).toBe(false);
    const posted = await db.accountingDocument.findUnique({
      where: { id: first.id },
    });
    expect(posted).toMatchObject({ status: "POSTED", journalEntryId: result.journalEntryId });
  });

  it("uses exact allocations, rejects over-allocation, and protects posted allocations", async () => {
    await db.paymentEntry.create({
      data: {
        id: "p4test-overallocated-receipt",
        orgId,
        paymentType: "RECEIVE",
        postingDate: new Date("2027-04-10T00:00:00.000Z"),
        partyType: "CUSTOMER",
        partyId: "stg_crm_customer",
        paidFromAccountId: "stg_account_receivable",
        paidToAccountId: "stg_account_bank",
        amount: "101",
        referenceNo: "P4TEST-OVERALLOCATED",
        createdById: makerId,
        allocations: {
          create: {
            id: "p4test-overallocated-line",
            salesInvoiceId,
            allocatedAmount: "101",
          },
        },
      },
    });
    await expect(
      prepareLegacyPayment({
        orgId,
        paymentEntryId: "p4test-overallocated-receipt",
        makerId,
      }),
    ).rejects.toThrow(/eligible open balance|over-allocated/i);

    await db.paymentEntry.create({
      data: {
        id: paymentEntryId,
        orgId,
        paymentType: "RECEIVE",
        postingDate: new Date("2027-04-10T00:00:00.000Z"),
        partyType: "CUSTOMER",
        partyId: "stg_crm_customer",
        paidFromAccountId: "stg_account_receivable",
        paidToAccountId: "stg_account_bank",
        amount: "100",
        referenceNo: "P4TEST-RECEIPT-1",
        createdById: makerId,
        allocations: {
          create: {
            id: "p4test-receipt-line",
            salesInvoiceId,
            allocatedAmount: "100",
          },
        },
      },
    });
    const prepared = await prepareLegacyPayment({
      orgId,
      paymentEntryId,
      makerId,
    });
    await approveAndPostAccountingPayment({
      orgId,
      paymentId: prepared.id,
      approverId: checkerId,
    });
    await expect(
      db.accountingPaymentAllocation.updateMany({
        where: { paymentId: prepared.id },
        data: { amount: "99" },
      }),
    ).rejects.toThrow(/immutable/i);
  });

  it("enforces concurrent correction capacity against the immutable original", async () => {
    for (const [id, total] of [
      ["p4test-credit-note-1", "60"],
      ["p4test-credit-note-2", "50"],
    ] as const) {
      await db.customerNote.create({
        data: {
          id,
          orgId,
          noteNumber: id.toUpperCase(),
          noteType: "CREDIT",
          customerId: "stg_crm_customer",
          originalInvoiceId: salesInvoiceId,
          postingDate: new Date("2027-04-10T00:00:00.000Z"),
          reason: "SYNTHETIC_PRICE_CORRECTION",
          taxableAmount: total,
          grandTotal: total,
          createdById: makerId,
          items: {
            create: {
              id: `${id}-line`,
              itemName: "Synthetic correction",
              qty: 1,
              rate: total,
              amount: total,
              taxRate: 0,
              taxAmount: 0,
            },
          },
        },
      });
    }
    await prepareLegacyCustomerNote({
      orgId,
      noteId: "p4test-credit-note-1",
      makerId,
    });
    await expect(
      prepareLegacyCustomerNote({
        orgId,
        noteId: "p4test-credit-note-2",
        makerId,
      }),
    ).rejects.toThrow(/correction_capacity_exceeded/i);
  });

  it("claims each synthetic outbox event once and publishes without an external provider", async () => {
    const [left, right] = await Promise.all([
      claimAccountingOutbox({ orgId, workerId: "p4test-worker-a", limit: 20 }),
      claimAccountingOutbox({ orgId, workerId: "p4test-worker-b", limit: 20 }),
    ]);
    const all = [...left, ...right];
    expect(new Set(all.map(({ id }) => id)).size).toBe(all.length);
    const event = all.find(({ destination }) => destination.startsWith("SYNTHETIC_"));
    expect(event).toBeDefined();
    const published = await publishClaimedSyntheticOutbox(event!, async () => ({
      outcome: "PUBLISHED",
      resultCode: "SYNTHETIC_ACCEPTED",
    }));
    expect(published.status).toBe("PROCESSED");
  });

  it("registers, claims, and terminally protects a recurring occurrence", async () => {
    const registered = await registerAccountingScheduledOccurrence({
      orgId,
      legalEntityId,
      actorId: makerId,
      templateType: "RECURRING_EXPENSE",
      templateId: "p4test-recurring-template",
      templateVersion: 3,
      scheduledFor: "2026-07-01T00:00:00.000Z",
      templateSnapshot: { synthetic: true, amount: "10.00" },
    });
    const replay = await registerAccountingScheduledOccurrence({
      orgId,
      legalEntityId,
      actorId: makerId,
      templateType: "RECURRING_EXPENSE",
      templateId: "p4test-recurring-template",
      templateVersion: 3,
      scheduledFor: "2026-07-01T00:00:00.000Z",
      templateSnapshot: { synthetic: true, amount: "10.00" },
    });
    expect(replay.id).toBe(registered.id);
    const [left, right] = await Promise.all([
      claimAccountingScheduledOccurrences({
        orgId,
        actorId: makerId,
        workerId: "p4test-occurrence-a",
        limit: 1,
      }),
      claimAccountingScheduledOccurrences({
        orgId,
        actorId: makerId,
        workerId: "p4test-occurrence-b",
        limit: 1,
      }),
    ]);
    const claims = [...left, ...right].filter(({ id }) => id === registered.id);
    expect(claims).toHaveLength(1);
    const settled = await settleAccountingScheduledOccurrence({
      orgId,
      actorId: makerId,
      occurrenceId: registered.id,
      workerId: claims[0].claimedBy!,
      outcome: {
        status: "GENERATED",
        generatedRecordType: "AccountingDocument",
        generatedRecordId: "p4test-generated-draft",
      },
    });
    expect(settled.status).toBe("GENERATED");
    await expect(
      db.accountingScheduledOccurrence.update({
        where: { id: registered.id },
        data: { status: "PENDING" },
      }),
    ).rejects.toThrow(/immutable/i);
  });
});

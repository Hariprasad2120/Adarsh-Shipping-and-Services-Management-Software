import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

import { db } from "@/lib/db";
import {
  acceptApprovedPayrollRun,
  approveAndPostPreparedRequest,
  postApprovedPayrollRun,
  prepareBankTransferRequest,
  prepareCrmDealInvoiceRequest,
} from "@/modules/accounting/integration-adapters";
import {
  AccountingPostingError,
  postCanonicalAccountingRequest,
  reverseCanonicalJournal,
  type CanonicalPostingRequest,
} from "@/modules/accounting/posting-engine";
import {
  assertExactStagingEnvironment,
  verifyExactStagingDatabaseIdentity,
} from "../staging-target";

const orgId = "stg_org_monolith_accounting";
const legalEntityId = "stg_accounting_legal_entity";
const makerId = "stg_user_accounting_maker";
const checkerId = "stg_user_accounting_checker";
const approvalPolicyId = "stg_approval_policy_journal";
const roundingPolicyId = "stg_rounding_policy_non_statutory";
const numberSeriesId = "stg_number_series_journal";
const expenseAccountId = "stg_account_expense";
const bankAccountId = "stg_account_bank";
const payableAccountId = "stg_account_payable";
let client: Client;

function canonicalRequest(
  suffix: string,
  overrides: Partial<CanonicalPostingRequest> = {},
): CanonicalPostingRequest {
  const requestId = `p3test-request-${suffix}`;
  return {
    requestId,
    requestVersion: 1,
    idempotencyKey: `P3TEST:${suffix}`,
    orgId,
    legalEntityId,
    source: {
      system: "P3_TEST",
      type: "SYNTHETIC_POSTING",
      id: `p3test-source-${suffix}`,
      version: 1,
      occurredAt: "2027-04-10T00:00:00.000Z",
      payload: { synthetic: true, suffix },
    },
    actor: {
      kind: "USER",
      actorId: checkerId,
      authenticatedOrgId: orgId,
    },
    makerId,
    postingDate: "2027-04-10T00:00:00.000Z",
    documentDate: "2027-04-09T00:00:00.000Z",
    journalType: "JOURNAL_ENTRY",
    ruleId: "GL-MANUAL-JOURNAL-v1",
    narration: `Phase 3 synthetic posting ${suffix}`,
    transactionCurrencyCode: "INR",
    baseCurrencyCode: "INR",
    exchangeRate: null,
    approval: {
      policyId: approvalPolicyId,
      policyVersion: 1,
      approvedById: checkerId,
      approvedAt: "2027-04-10T00:00:00.000Z",
    },
    numberSeriesId,
    roundingPolicy: {
      id: roundingPolicyId,
      version: 1,
    },
    lines: [
      {
        accountId: expenseAccountId,
        debit: "100.00",
        credit: "0",
      },
      {
        accountId: bankAccountId,
        debit: "0",
        credit: "100.00",
      },
    ],
    correlationId: `p3test-correlation-${suffix}`,
    ...overrides,
  };
}

async function cleanupPhase3Tests() {
  await client.query("BEGIN");
  try {
    await client.query(
      `SELECT set_config('monolith.accounting_seed_fixture', 'on', true)`,
    );
    await client.query(
      `DELETE FROM "PayrollBatch"
       WHERE "orgId" = $1 AND "sourceRunId" LIKE 'P3TEST-%'`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "AccountingPostingAttempt"
       WHERE "orgId" = $1
         AND ("requestId" LIKE 'p3test-%' OR "requestId" LIKE 'P3TEST-%')`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "AccountingIntegrationOutbox"
       WHERE "orgId" = $1
         AND "aggregateId" IN (
           SELECT id FROM "JournalEntry"
           WHERE "orgId" = $1
             AND ("sourceSystem" = 'P3_TEST'
                  OR "requestId" LIKE 'p3test-%'
                  OR "requestId" LIKE 'P3TEST-%')
         )`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "GeneralLedgerEntry"
       WHERE "journalEntryId" IN (
         SELECT id FROM "JournalEntry"
         WHERE "orgId" = $1
           AND ("sourceSystem" = 'P3_TEST'
                OR "requestId" LIKE 'p3test-%'
                OR "requestId" LIKE 'P3TEST-%')
       )`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "AccountingJournalLineDimension"
       WHERE "journalEntryLineId" IN (
         SELECT l.id
         FROM "JournalEntryLine" l
         JOIN "JournalEntry" j ON j.id = l."journalEntryId"
         WHERE j."orgId" = $1
           AND (j."sourceSystem" = 'P3_TEST'
                OR j."requestId" LIKE 'p3test-%'
                OR j."requestId" LIKE 'P3TEST-%')
       )`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "JournalEntryLine"
       WHERE "journalEntryId" IN (
         SELECT id FROM "JournalEntry"
         WHERE "orgId" = $1
           AND ("sourceSystem" = 'P3_TEST'
                OR "requestId" LIKE 'p3test-%'
                OR "requestId" LIKE 'P3TEST-%')
       )`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "JournalEntry"
       WHERE "orgId" = $1
         AND ("sourceSystem" = 'P3_TEST'
              OR "requestId" LIKE 'p3test-%'
              OR "requestId" LIKE 'P3TEST-%')`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "AccountingPayrollRunSnapshot"
       WHERE "orgId" = $1 AND "runId" LIKE 'P3TEST-%'`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "AccountingIntegrationInbox"
       WHERE "orgId" = $1
         AND ("idempotencyKey" LIKE 'P3TEST:%'
              OR "idempotencyKey" LIKE 'ACCOUNTING:P3TEST:%'
              OR "idempotencyKey" LIKE 'CRM:DEAL_INVOICE_REQUEST:p3test-%'
              OR "idempotencyKey" LIKE 'HRMS:PAYROLL_RUN:P3TEST-%')`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "AccountingSourceSnapshot"
       WHERE "orgId" = $1
         AND ("sourceSystem" = 'P3_TEST'
              OR "sourceId" LIKE 'P3TEST-%'
              OR "sourceId" LIKE 'p3test-%'
              OR "requestId" LIKE 'p3test-%'
              OR "requestId" LIKE 'P3TEST-%')`,
      [orgId],
    );
    await client.query(
      `DELETE FROM "AccountingAuditLog"
       WHERE "orgId" = $1
         AND "action" IN (
           'POST_CANONICAL_JOURNAL',
           'POST_CANONICAL_REVERSAL',
           'PREPARE_BANK_TRANSFER_REQUEST',
           'PREPARE_CRM_INVOICE_REQUEST'
         )
         AND (
           "afterValues"->>'requestId' LIKE 'p3test-%'
           OR "afterValues"->>'requestId' LIKE 'P3TEST-%'
           OR "afterValues"->>'requestId' LIKE 'CRM-DEAL-p3test-%'
         )`,
      [orgId],
    );
    await client.query(
      `UPDATE "AccountingNumberSeries"
       SET "nextNumber" = 1, "rowVersion" = "rowVersion" + 1, "updatedAt" = now()
       WHERE id = $1`,
      [numberSeriesId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

beforeAll(async () => {
  await verifyExactStagingDatabaseIdentity("Phase 3 canonical posting integration test");
  const { connectionString } = assertExactStagingEnvironment(
    "Phase 3 canonical posting integration test",
  );
  client = new Client({
    connectionString,
    application_name: "monolith-accounting-phase3-canonical-posting",
  });
  await client.connect();
  await cleanupPhase3Tests();
  await client.query(
    `INSERT INTO "CrmDeal"
      (id, "orgId", "ownerId", "accountId", name, stage, amount, probability,
       tags, "createdById", "updatedById", "createdAt", "updatedAt")
     VALUES
      ('p3test-crm-deal', $1, $2, 'stg_crm_customer',
       'P3TEST won deal', 'WON', 1250, 100, ARRAY['p3test'], $2, $2,
       TIMESTAMP '2027-04-01 00:00:00', TIMESTAMP '2027-04-01 00:00:00')
     ON CONFLICT (id) DO UPDATE SET
       stage = 'WON',
       "accountId" = 'stg_crm_customer',
       amount = 1250,
       "updatedAt" = TIMESTAMP '2027-04-01 00:00:00'`,
    [orgId, makerId],
  );
});

afterAll(async () => {
  if (!client) return;
  try {
    await cleanupPhase3Tests();
    await client.query(`DELETE FROM "CrmDeal" WHERE id = 'p3test-crm-deal'`);
  } finally {
    await client.end();
    await db.$disconnect();
  }
});

describe("Accounting Phase 3 canonical posting engine", () => {
  it("posts a balanced request atomically with inbox, journal, GL, audit and outbox lineage", async () => {
    const result = await postCanonicalAccountingRequest(canonicalRequest("balanced"));
    expect(result.replayed).toBe(false);

    const [journal, inbox, outbox, attempts, glCount] = await Promise.all([
      db.journalEntry.findUnique({
        where: { id: result.journalEntryId },
        include: { lines: true },
      }),
      db.accountingIntegrationInbox.findUnique({
        where: {
          orgId_sourceSystem_idempotencyKey: {
            orgId,
            sourceSystem: "P3_TEST",
            idempotencyKey: "P3TEST:balanced",
          },
        },
      }),
      db.accountingIntegrationOutbox.findFirst({
        where: { orgId, aggregateId: result.journalEntryId },
      }),
      db.accountingPostingAttempt.findMany({
        where: { journalEntryId: result.journalEntryId },
      }),
      db.generalLedgerEntry.count({
        where: { journalEntryId: result.journalEntryId },
      }),
    ]);
    expect(journal).toMatchObject({
      status: "POSTED",
      requestId: "p3test-request-balanced",
      sourceSnapshotId: expect.any(String),
      accountingPeriodId: "stg_period_2027_28_1",
      legalEntityId,
      postedById: checkerId,
    });
    expect(journal?.lines).toHaveLength(2);
    expect(journal?.totalDebit.eq(journal.totalCredit)).toBe(true);
    expect(inbox).toMatchObject({
      status: "PROCESSED",
      processedRecordId: result.journalEntryId,
    });
    expect(outbox).toMatchObject({ status: "PENDING", payloadHash: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe("POSTED");
    expect(glCount).toBe(2);
  });

  it("preserves exact decimal amounts through the database round trip", async () => {
    const result = await postCanonicalAccountingRequest(
      canonicalRequest("decimal-round-trip", {
        lines: [
          { accountId: expenseAccountId, debit: "0.10", credit: "0" },
          { accountId: bankAccountId, debit: "0", credit: "0.10" },
        ],
      }),
    );
    const journal = await db.journalEntry.findUniqueOrThrow({
      where: { id: result.journalEntryId },
      include: { lines: { orderBy: { debit: "desc" } } },
    });
    expect(journal.totalDebit.toFixed(2)).toBe("0.10");
    expect(journal.totalCredit.toFixed(2)).toBe("0.10");
    expect(journal.lines[0].debit.toFixed(2)).toBe("0.10");
    expect(journal.lines[1].credit.toFixed(2)).toBe("0.10");
  });

  it("rejects an unbalanced request without partial journal effects", async () => {
    const request = canonicalRequest("unbalanced", {
      lines: [
        { accountId: expenseAccountId, debit: "100.00", credit: "0" },
        { accountId: bankAccountId, debit: "0", credit: "99.99" },
      ],
    });
    await expect(postCanonicalAccountingRequest(request)).rejects.toMatchObject({
      code: "UNBALANCED_ENTRY",
    });
    expect(
      await db.journalEntry.count({ where: { orgId, requestId: request.requestId } }),
    ).toBe(0);
    const failedInbox = await db.accountingIntegrationInbox.findUniqueOrThrow({
      where: {
        orgId_sourceSystem_idempotencyKey: {
          orgId,
          sourceSystem: request.source.system,
          idempotencyKey: request.idempotencyKey,
        },
      },
    });
    expect(failedInbox).toMatchObject({
      status: "REJECTED",
      attemptCount: 1,
      lastErrorCode: "UNBALANCED_ENTRY",
    });
    expect(
      await db.accountingPostingAttempt.findUnique({
        where: {
          inboxId_attemptNumber: {
            inboxId: failedInbox.id,
            attemptNumber: 1,
          },
        },
      }),
    ).toMatchObject({ status: "REJECTED", errorCode: "UNBALANCED_ENTRY" });
  });

  it("replays the same request and rejects a conflicting payload", async () => {
    const request = canonicalRequest("replay");
    const first = await postCanonicalAccountingRequest(request);
    const second = await postCanonicalAccountingRequest(request);
    expect(second).toMatchObject({
      replayed: true,
      journalEntryId: first.journalEntryId,
    });
    await expect(
      postCanonicalAccountingRequest({
        ...request,
        narration: "Conflicting narration",
      }),
    ).rejects.toBeInstanceOf(AccountingPostingError);
    expect(
      await db.journalEntry.count({ where: { orgId, idempotencyKey: request.idempotencyKey } }),
    ).toBe(1);
  });

  it("allows only one journal under concurrent duplicate delivery", async () => {
    const suffix = `concurrent-${randomUUID()}`;
    const request = canonicalRequest(suffix);
    const settled = await Promise.allSettled(
      Array.from({ length: 6 }, () => postCanonicalAccountingRequest(request)),
    );
    expect(settled.some((result) => result.status === "fulfilled")).toBe(true);
    expect(
      await db.journalEntry.count({ where: { orgId, idempotencyKey: request.idempotencyKey } }),
    ).toBe(1);
  });

  it("allocates unique journal numbers for concurrent distinct requests", async () => {
    async function postWithRetry(suffix: string) {
      const request = canonicalRequest(`number-series-${suffix}`);
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          return await postCanonicalAccountingRequest(request);
        } catch (error) {
          if (
            !(error instanceof AccountingPostingError) ||
            !["SERIALIZATION_RETRY", "CONCURRENT_POSTING_RETRY"].includes(error.code)
          ) {
            throw error;
          }
        }
      }
      throw new Error(`Posting ${suffix} did not complete after bounded retries`);
    }

    const results = await Promise.all(
      Array.from({ length: 6 }, (_, index) => postWithRetry(String(index))),
    );
    const journals = await db.journalEntry.findMany({
      where: { id: { in: results.map(({ journalEntryId }) => journalEntryId) } },
      select: { voucherNo: true },
    });
    expect(new Set(journals.map(({ voucherNo }) => voucherNo)).size).toBe(6);
  });

  it("enforces Accounting authorization and maker-checker separation", async () => {
    await expect(
      postCanonicalAccountingRequest(
        canonicalRequest("unauthorized", {
          actor: {
            kind: "USER",
            actorId: makerId,
            authenticatedOrgId: orgId,
          },
        }),
      ),
    ).rejects.toMatchObject({ code: "ACCOUNTING_PERMISSION_REQUIRED" });
    await expect(
      postCanonicalAccountingRequest(
        canonicalRequest("self-approval", {
          makerId: checkerId,
        }),
      ),
    ).rejects.toMatchObject({ code: "MAKER_CHECKER_VIOLATION" });
  });

  it("rejects closed-period posting and cross-tenant scope", async () => {
    await client.query(
      `UPDATE "AccountingPeriod" SET status = 'HARD_LOCKED' WHERE id = 'stg_period_2027_28_2'`,
    );
    try {
      await expect(
        postCanonicalAccountingRequest(
          canonicalRequest("closed-period", {
            postingDate: "2027-05-10T00:00:00.000Z",
          }),
        ),
      ).rejects.toMatchObject({ code: "ACCOUNTING_PERIOD_CLOSED" });
    } finally {
      await client.query(
        `UPDATE "AccountingPeriod" SET status = 'OPEN' WHERE id = 'stg_period_2027_28_2'`,
      );
    }

    await expect(
      postCanonicalAccountingRequest(
        canonicalRequest("tenant-crossing", {
          actor: {
            kind: "USER",
            actorId: checkerId,
            authenticatedOrgId: "another-tenant",
          },
        }),
      ),
    ).rejects.toMatchObject({ code: "TENANT_SCOPE_MISMATCH" });
  });

  it("rejects a legal entity owned by another organization", async () => {
    await client.query(
      `INSERT INTO "Organisation" (id, name, slug, active, "createdAt", "updatedAt")
       VALUES ('p3test-foreign-org', 'P3TEST Foreign Org', 'p3test-foreign-org', true, now(), now())`,
    );
    await client.query(
      `INSERT INTO "AccountingLegalEntity"
        (id, "orgId", code, "legalName", "entityType", status, "isDefault", "effectiveFrom", "createdAt", "updatedAt")
       VALUES
        ('p3test-foreign-entity', 'p3test-foreign-org', 'P3FOREIGN', 'P3TEST Foreign Entity',
         'COMPANY', 'ACTIVE', true, DATE '2027-04-01', now(), now())`,
    );
    try {
      await expect(
        postCanonicalAccountingRequest(
          canonicalRequest("foreign-legal-entity", {
            legalEntityId: "p3test-foreign-entity",
          }),
        ),
      ).rejects.toMatchObject({ code: "LEGAL_ENTITY_INVALID" });
    } finally {
      await client.query(`DELETE FROM "AccountingLegalEntity" WHERE id = 'p3test-foreign-entity'`);
      await client.query(`DELETE FROM "Organisation" WHERE id = 'p3test-foreign-org'`);
    }
  });

  it("rejects inactive accounts and missing required dimensions", async () => {
    await client.query(`UPDATE "Account" SET "isActive" = false WHERE id = $1`, [
      expenseAccountId,
    ]);
    try {
      await expect(
        postCanonicalAccountingRequest(canonicalRequest("inactive-account")),
      ).rejects.toMatchObject({ code: "ACCOUNT_NOT_POSTABLE" });
    } finally {
      await client.query(`UPDATE "Account" SET "isActive" = true WHERE id = $1`, [
        expenseAccountId,
      ]);
    }

    await client.query(
      `UPDATE "AccountingDimensionDefinition" SET "isRequired" = true
       WHERE id = 'stg_dimension_cost_centre'`,
    );
    try {
      await expect(
        postCanonicalAccountingRequest(canonicalRequest("missing-dimension")),
      ).rejects.toMatchObject({ code: "REQUIRED_DIMENSION_MISSING" });
    } finally {
      await client.query(
        `UPDATE "AccountingDimensionDefinition" SET "isRequired" = false
         WHERE id = 'stg_dimension_cost_centre'`,
      );
    }
  });

  it("rolls back journal, GL and outbox after an injected failure", async () => {
    const request = canonicalRequest("rollback", { injectFailureAfterJournal: true });
    await expect(postCanonicalAccountingRequest(request)).rejects.toMatchObject({
      code: "INJECTED_FAILURE",
    });
    expect(
      await db.journalEntry.count({ where: { orgId, requestId: request.requestId } }),
    ).toBe(0);
    expect(
      await db.accountingIntegrationOutbox.count({
        where: { orgId, idempotencyKey: { contains: request.requestId } },
      }),
    ).toBe(0);
  });

  it("creates an exact linked reversal and database guards block mutation", async () => {
    const original = await postCanonicalAccountingRequest(canonicalRequest("reversal-original"));
    const reversal = await reverseCanonicalJournal({
      orgId,
      legalEntityId,
      journalEntryId: original.journalEntryId,
      reason: "Synthetic correction",
      requestId: "p3test-reversal-request",
      idempotencyKey: "P3TEST:reversal",
      actor: {
        kind: "USER",
        actorId: checkerId,
        authenticatedOrgId: orgId,
      },
      makerId,
      approval: {
        policyId: approvalPolicyId,
        policyVersion: 1,
        approvedById: checkerId,
        approvedAt: "2027-04-11T00:00:00.000Z",
      },
      numberSeriesId,
      roundingPolicy: { id: roundingPolicyId, version: 1 },
      correlationId: "p3test-reversal-correlation",
    });
    const pair = await db.journalEntry.findMany({
      where: { id: { in: [original.journalEntryId, reversal.journalEntryId] } },
      include: { lines: { orderBy: { accountId: "asc" } } },
    });
    const originalJournal = pair.find((journal) => journal.id === original.journalEntryId)!;
    const reversalJournal = pair.find((journal) => journal.id === reversal.journalEntryId)!;
    expect(reversalJournal.reversalOfId).toBe(originalJournal.id);
    expect(reversalJournal.lines.map((line) => line.debit.toString())).toEqual(
      originalJournal.lines.map((line) => line.credit.toString()),
    );
    await expect(
      db.journalEntry.update({
        where: { id: original.journalEntryId },
        data: { remarks: "Forbidden mutation" },
      }),
    ).rejects.toThrow(/immutable/i);
    await expect(
      reverseCanonicalJournal({
        orgId,
        legalEntityId,
        journalEntryId: original.journalEntryId,
        reason: "Second reversal",
        requestId: "p3test-second-reversal",
        idempotencyKey: "P3TEST:second-reversal",
        actor: {
          kind: "USER",
          actorId: checkerId,
          authenticatedOrgId: orgId,
        },
        makerId,
        approval: {
          policyId: approvalPolicyId,
          policyVersion: 1,
          approvedById: checkerId,
          approvedAt: "2027-04-12T00:00:00.000Z",
        },
        numberSeriesId,
        roundingPolicy: { id: roundingPolicyId, version: 1 },
        correlationId: "p3test-second-reversal-correlation",
      }),
    ).rejects.toMatchObject({ code: "DUPLICATE_REVERSAL" });
  });

  it("transitions bank transfer through immutable request, approval and canonical posting", async () => {
    const inbox = await prepareBankTransferRequest({
      orgId,
      makerId,
      fromAccountId: bankAccountId,
      toAccountId: "stg_account_cash",
      amount: "25.00",
      postingDate: "2027-04-15T00:00:00.000Z",
      remarks: "P3TEST bank transfer",
      requestId: "p3test-bank-transfer",
      idempotencyKey: "P3TEST:BANK_TRANSFER",
    });
    expect(inbox.status).toBe("PENDING");
    expect(
      await db.journalEntry.count({ where: { orgId, requestId: "p3test-bank-transfer" } }),
    ).toBe(0);
    const result = await approveAndPostPreparedRequest({
      orgId,
      inboxId: inbox.id,
      approverId: checkerId,
    });
    expect(
      await db.journalEntry.findUnique({ where: { id: result.journalEntryId } }),
    ).toMatchObject({ status: "POSTED", sourceType: "BANK_TRANSFER" });
  });

  it("prepares CRM invoice requests without CRM policy examples or ledger effects", async () => {
    const request = await prepareCrmDealInvoiceRequest({
      orgId,
      actorId: makerId,
      dealId: "p3test-crm-deal",
    });
    expect(request).toMatchObject({
      sourceSystem: "CRM",
      status: "PROCESSED",
      processedRecordType: "AccountingInvoiceRequest",
    });
    expect(
      await db.journalEntry.count({
        where: { orgId, sourceSystem: "CRM", sourceId: "p3test-crm-deal" },
      }),
    ).toBe(0);
  });

  it("does not let a CRM-only actor create an Accounting invoice request", async () => {
    const crmPermission = await db.permission.findUniqueOrThrow({
      where: { key: "crm.invoice.manage" },
    });
    await db.role.create({
      data: {
        id: "p3test-crm-only-role",
        orgId,
        name: "P3TEST CRM Only",
        permissions: {
          create: { permissionId: crmPermission.id },
        },
        userRoles: {
          create: { userId: "stg_user_employee" },
        },
      },
    });
    try {
      await expect(
        prepareCrmDealInvoiceRequest({
          orgId,
          actorId: "stg_user_employee",
          dealId: "p3test-crm-deal",
        }),
      ).rejects.toThrow(/accounting\.invoice\.create/);
    } finally {
      await db.userRole.deleteMany({ where: { roleId: "p3test-crm-only-role" } });
      await db.rolePermission.deleteMany({ where: { roleId: "p3test-crm-only-role" } });
      await db.role.deleteMany({ where: { id: "p3test-crm-only-role" } });
    }
  });

  it("consumes an immutable approved HRMS payroll run without recalculation", async () => {
    const runId = "P3TEST-PAYROLL-APRIL";
    const snapshot = await acceptApprovedPayrollRun({
      orgId,
      actorId: checkerId,
      runId,
      runVersion: 1,
      payPeriodStart: "2027-04-01T00:00:00.000Z",
      payPeriodEnd: "2027-04-30T00:00:00.000Z",
      currencyCode: "INR",
      approvedById: makerId,
      approvedAt: "2027-04-30T00:00:00.000Z",
      eventId: "P3TEST-PAYROLL-EVENT-1",
      correlationId: "P3TEST-PAYROLL-CORRELATION",
      lines: [
        {
          employeeId: "stg_user_employee",
          componentCode: "HRMS_APPROVED_GROSS",
          accountId: expenseAccountId,
          debit: "500.00",
          credit: "0",
        },
        {
          employeeId: "stg_user_employee",
          componentCode: "HRMS_APPROVED_PAYABLE",
          accountId: payableAccountId,
          debit: "0",
          credit: "500.00",
        },
      ],
    });
    expect(snapshot.totalDebit.eq(snapshot.totalCredit)).toBe(true);
    const posted = await postApprovedPayrollRun({
      orgId,
      runId,
      runVersion: 1,
      posterId: checkerId,
      approval: {
        approvedById: checkerId,
        approvedAt: "2027-04-30T01:00:00.000Z",
      },
    });
    expect(
      await db.journalEntry.findUnique({ where: { id: posted.journalEntryId } }),
    ).toMatchObject({
      status: "POSTED",
      sourceSystem: "HRMS",
      sourceType: "APPROVED_PAYROLL_RUN",
      sourceId: runId,
      sourceVersion: 1,
    });
  });
});

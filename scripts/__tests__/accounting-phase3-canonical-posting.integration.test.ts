import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

import { db } from "@/lib/db";
import {
  acceptApprovedPayrollRun,
  approveAndPostPreparedRequest,
  moveAccountingRequestToManualReview,
  postApprovedPayrollRun,
  prepareBankTransferRequest,
  prepareCrmDealInvoiceRequest,
  recoverStaleAccountingRequest,
} from "@/modules/accounting/integration-adapters";
import {
  AccountingPostingError,
  postCanonicalAccountingRequest,
  replaceCanonicalJournal,
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
let stagingConnectionString: string;

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
           'PREPARE_CRM_INVOICE_REQUEST',
           'RECOVER_ACCOUNTING_INTEGRATION_REQUEST',
           'MOVE_ACCOUNTING_REQUEST_TO_MANUAL_REVIEW'
         )
         AND (
           "afterValues"->>'requestId' LIKE 'p3test-%'
           OR "afterValues"->>'requestId' LIKE 'P3TEST-%'
           OR "afterValues"->>'requestId' LIKE 'CRM-DEAL-p3test-%'
           OR "entityId" LIKE 'p3test-%'
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
  stagingConnectionString = connectionString;
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
    await client.query(
      `UPDATE "AccountingCurrency"
       SET "decimalPlaces" = 8
       WHERE "orgId" = $1 AND code = 'INR'`,
      [orgId],
    );
    try {
      const result = await postCanonicalAccountingRequest(
        canonicalRequest("decimal-round-trip", {
          lines: [
            { accountId: expenseAccountId, debit: "0.12345678", credit: "0" },
            { accountId: bankAccountId, debit: "0", credit: "0.12345678" },
          ],
        }),
      );
      const journal = await db.journalEntry.findUniqueOrThrow({
        where: { id: result.journalEntryId },
        include: { lines: { orderBy: { debit: "desc" } } },
      });
      expect(journal.totalDebit.toFixed(8)).toBe("0.12345678");
      expect(journal.totalCredit.toFixed(8)).toBe("0.12345678");
      expect(journal.lines[0].debit.toFixed(8)).toBe("0.12345678");
      expect(journal.lines[1].credit.toFixed(8)).toBe("0.12345678");
    } finally {
      await client.query(
        `UPDATE "AccountingCurrency"
         SET "decimalPlaces" = 2
         WHERE "orgId" = $1 AND code = 'INR'`,
        [orgId],
      );
    }
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
    await expect(postCanonicalAccountingRequest(request)).rejects.toMatchObject({
      code: "UNBALANCED_ENTRY",
    });
    const terminalReplay = await db.accountingIntegrationInbox.findUniqueOrThrow({
      where: { id: failedInbox.id },
      include: { postingAttempts: true },
    });
    expect(terminalReplay.attemptCount).toBe(1);
    expect(terminalReplay.postingAttempts).toHaveLength(1);
  });

  it("rejects unregistered posting rules and invalid source versions", async () => {
    await expect(
      postCanonicalAccountingRequest(
        canonicalRequest("unknown-rule", {
          ruleId: "P3-UNREGISTERED-RULE-v1",
        }),
      ),
    ).rejects.toMatchObject({ code: "POSTING_RULE_UNSUPPORTED" });

    await expect(
      postCanonicalAccountingRequest(
        canonicalRequest("invalid-source-version", {
          source: {
            ...canonicalRequest("invalid-source-version").source,
            version: 0,
          },
        }),
      ),
    ).rejects.toMatchObject({ code: "SOURCE_IDENTITY_INVALID" });
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

  it("serializes posting against a concurrent period lock", async () => {
    const lockClient = new Client({
      connectionString: stagingConnectionString,
      application_name: "monolith-accounting-phase3-period-lock-race",
    });
    await lockClient.connect();
    try {
      await lockClient.query("BEGIN");
      await lockClient.query(
        `UPDATE "AccountingPeriod"
         SET status = 'HARD_LOCKED'
         WHERE id = 'stg_period_2027_28_1'`,
      );
      const posting = postCanonicalAccountingRequest(
        canonicalRequest(`period-lock-race-${randomUUID()}`),
      ).then(
        (result) => ({ result, error: null }),
        (error: unknown) => ({ result: null, error }),
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      await lockClient.query("COMMIT");
      const outcome = await posting;
      expect(outcome.result).toBeNull();
      expect(outcome.error).toMatchObject({
        code: expect.stringMatching(/ACCOUNTING_PERIOD_CLOSED|SERIALIZATION_RETRY/),
      });
    } finally {
      try {
        await lockClient.query("ROLLBACK");
      } catch {
        // The transaction may already be committed.
      }
      await lockClient.end();
      await client.query(
        `UPDATE "AccountingPeriod"
         SET status = 'OPEN'
         WHERE id = 'stg_period_2027_28_1'`,
      );
    }
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

  it("rejects accounts assigned to a different legal entity", async () => {
    await client.query(
      `INSERT INTO "AccountingLegalEntity"
        (id, "orgId", code, "legalName", "entityType", status, "isDefault",
         "effectiveFrom", "createdAt", "updatedAt")
       VALUES
        ('p3test-second-entity', $1, 'P3SECOND', 'P3TEST Second Entity',
         'COMPANY', 'ACTIVE', false, DATE '2027-04-01', now(), now())`,
      [orgId],
    );
    try {
      await expect(
        postCanonicalAccountingRequest(
          canonicalRequest("cross-legal-entity-account", {
            legalEntityId: "p3test-second-entity",
          }),
        ),
      ).rejects.toMatchObject({ code: "ACCOUNT_NOT_POSTABLE" });
    } finally {
      await client.query(
        `DELETE FROM "AccountingLegalEntity" WHERE id = 'p3test-second-entity'`,
      );
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

    await expect(
      postCanonicalAccountingRequest(
        canonicalRequest("protected-control-account", {
          lines: [
            { accountId: payableAccountId, debit: "100", credit: "0" },
            { accountId: bankAccountId, debit: "0", credit: "100" },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: "CONTROL_ACCOUNT_RESTRICTED" });

    await expect(
      postCanonicalAccountingRequest(
        canonicalRequest("invalid-party", {
          lines: [
            {
              accountId: expenseAccountId,
              debit: "100",
              credit: "0",
              partyType: "CUSTOMER",
              partyId: "p3test-cross-tenant-customer",
            },
            { accountId: bankAccountId, debit: "0", credit: "100" },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: "PARTY_REFERENCE_INVALID" });

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

  it("database tenant guards validate every source and legal-entity reference", async () => {
    await client.query(
      `INSERT INTO "Organisation" (id, name, slug, active, "createdAt", "updatedAt")
       VALUES ('p3test-guard-foreign-org', 'P3TEST Guard Foreign', 'p3test-guard-foreign', true, now(), now())`,
    );
    await client.query(
      `INSERT INTO "AccountingLegalEntity"
        (id, "orgId", code, "legalName", "entityType", status, "isDefault",
         "effectiveFrom", "createdAt", "updatedAt")
       VALUES
        ('p3test-guard-foreign-entity', 'p3test-guard-foreign-org', 'P3GUARD',
         'P3TEST Guard Foreign Entity', 'COMPANY', 'ACTIVE', true,
         DATE '2027-04-01', now(), now()),
        ('p3test-guard-second-entity', $1, 'P3GUARD2',
         'P3TEST Guard Second Entity', 'COMPANY', 'ACTIVE', false,
         DATE '2027-04-01', now(), now())`,
      [orgId],
    );
    await client.query(
      `INSERT INTO "AccountingSourceSnapshot"
        (id, "orgId", "legalEntityId", "sourceSystem", "sourceType", "sourceId",
         "sourceVersion", "requestId", payload, "payloadHash", "occurredAt", "createdAt")
       VALUES
        ('p3test-guard-foreign-snapshot', 'p3test-guard-foreign-org',
         'p3test-guard-foreign-entity', 'P3_TEST', 'SYNTHETIC_POSTING',
         'p3test-guard-foreign-source', 1, 'p3test-guard-foreign-request',
         '{}'::jsonb, repeat('a', 64), now(), now()),
        ('p3test-guard-second-entity-snapshot', $1,
         'p3test-guard-second-entity', 'P3_TEST', 'SYNTHETIC_POSTING',
         'p3test-guard-second-source', 1, 'p3test-guard-second-request',
         '{}'::jsonb, repeat('b', 64), now(), now())`,
      [orgId],
    );

    try {
      await expect(
        client.query(
          `INSERT INTO "AccountingIntegrationInbox"
            (id, "orgId", "legalEntityId", "sourceSystem", "messageType",
             "messageVersion", "idempotencyKey", payload, "payloadHash",
             "sourceSnapshotId", status, "availableAt", "receivedAt",
             "attemptCount", "rowVersion", "createdAt", "updatedAt")
           VALUES
            ('p3test-guard-cross-inbox', $1, $2, 'P3_TEST', 'SYNTHETIC_POSTING',
             1, 'P3TEST:GUARD:CROSS-INBOX', '{}'::jsonb, repeat('c', 64),
             'p3test-guard-foreign-snapshot', 'PENDING', now(), now(),
             0, 1, now(), now())`,
          [orgId, legalEntityId],
        ),
      ).rejects.toThrow(/outside its organization or legal entity/i);

      await expect(
        client.query(
          `INSERT INTO "JournalEntry"
            (id, "orgId", "legalEntityId", "voucherNo", "journalType",
             "postingDate", status, "totalDebit", "totalCredit", "createdById",
             "sourceSnapshotId", "rowVersion", "createdAt", "updatedAt")
           VALUES
            ('p3test-guard-cross-entity-journal', $1, $2, 'P3-GUARD-CROSS',
             'JOURNAL_ENTRY', DATE '2027-04-10', 'DRAFT', 0, 0, $3,
             'p3test-guard-second-entity-snapshot', 1, now(), now())`,
          [orgId, legalEntityId, makerId],
        ),
      ).rejects.toThrow(/outside its organization or legal entity/i);
    } finally {
      await client.query("BEGIN");
      try {
        await client.query(
          `SELECT set_config('monolith.accounting_seed_fixture', 'on', true)`,
        );
        await client.query(
          `DELETE FROM "AccountingSourceSnapshot"
           WHERE id IN ('p3test-guard-foreign-snapshot', 'p3test-guard-second-entity-snapshot')`,
        );
        await client.query(
          `DELETE FROM "AccountingLegalEntity"
           WHERE id IN ('p3test-guard-foreign-entity', 'p3test-guard-second-entity')`,
        );
        await client.query(
          `DELETE FROM "Organisation" WHERE id = 'p3test-guard-foreign-org'`,
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  });

  it("rolls back journal, GL and outbox after an injected failure", async () => {
    const request = canonicalRequest("rollback", { injectFailureAfterJournal: true });
    const seriesBefore = await db.accountingNumberSeries.findUniqueOrThrow({
      where: { id: numberSeriesId },
      select: { nextNumber: true },
    });
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
    expect(
      await db.accountingNumberSeries.findUniqueOrThrow({
        where: { id: numberSeriesId },
        select: { nextNumber: true },
      }),
    ).toEqual(seriesBefore);
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

  it("allows only one reversal under concurrent correction requests", async () => {
    const original = await postCanonicalAccountingRequest(
      canonicalRequest(`concurrent-reversal-original-${randomUUID()}`),
    );
    const results = await Promise.allSettled(
      ["a", "b"].map((suffix) =>
        reverseCanonicalJournal({
          orgId,
          legalEntityId,
          journalEntryId: original.journalEntryId,
          reason: `Synthetic concurrent reversal ${suffix}`,
          requestId: `p3test-concurrent-reversal-${suffix}-${randomUUID()}`,
          idempotencyKey: `P3TEST:concurrent-reversal:${suffix}:${randomUUID()}`,
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
          correlationId: `p3test-concurrent-reversal-${suffix}`,
        }),
      ),
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(
      await db.journalEntry.count({
        where: {
          orgId,
          reversalOfId: original.journalEntryId,
          status: "POSTED",
        },
      }),
    ).toBe(1);
  });

  it("recovers stale inbox claims and supports audited manual review", async () => {
    const inbox = await db.accountingIntegrationInbox.create({
      data: {
        id: `p3test-stale-inbox-${randomUUID()}`,
        orgId,
        legalEntityId,
        sourceSystem: "P3_TEST",
        messageType: "SYNTHETIC_STALE_REQUEST",
        messageVersion: 1,
        requestId: `p3test-stale-request-${randomUUID()}`,
        idempotencyKey: `P3TEST:stale:${randomUUID()}`,
        payload: { synthetic: true },
        payloadHash: "a".repeat(64),
        correlationId: `p3test-stale-correlation-${randomUUID()}`,
        status: "PROCESSING",
        attemptCount: 1,
        processingAt: new Date("2027-04-01T00:00:00.000Z"),
      },
    });
    const recovered = await recoverStaleAccountingRequest({
      orgId,
      inboxId: inbox.id,
      actorId: checkerId,
      staleBefore: "2027-04-02T00:00:00.000Z",
    });
    expect(recovered).toMatchObject({
      status: "RETRYABLE",
      processingAt: null,
      lastErrorCode: "STALE_PROCESSING_CLAIM_RECOVERED",
    });
    const reviewed = await moveAccountingRequestToManualReview({
      orgId,
      inboxId: inbox.id,
      actorId: checkerId,
      reasonCode: "SYNTHETIC_OPERATOR_REVIEW",
    });
    expect(reviewed).toMatchObject({
      status: "MANUAL_REVIEW",
      lastErrorCode: "SYNTHETIC_OPERATOR_REVIEW",
    });
    expect(
      await db.accountingAuditLog.count({
        where: {
          orgId,
          entityId: inbox.id,
          action: {
            in: [
              "RECOVER_ACCOUNTING_INTEGRATION_REQUEST",
              "MOVE_ACCOUNTING_REQUEST_TO_MANUAL_REVIEW",
            ],
          },
        },
      }),
    ).toBe(2);
  });

  it("preserves approved FX evidence and dimensions through reversal and replacement", async () => {
    const suffix = "foreign-original";
    const original = await postCanonicalAccountingRequest(
      canonicalRequest(suffix, {
        transactionCurrencyCode: "USD",
        baseCurrencyCode: "INR",
        exchangeRate: {
          id: "stg_exchange_rate_usd_inr_approved",
          rate: "83.5000000000",
          source: "SYNTHETIC_APPROVED",
          effectiveDate: "2027-04-01T00:00:00.000Z",
        },
        lines: [
          {
            accountId: expenseAccountId,
            debit: "100.20",
            credit: "0",
            transactionDebit: "1.20",
            transactionCredit: "0",
            dimensions: [
              {
                definitionId: "stg_dimension_branch",
                dimensionValueId: "stg_dimension_value_branch_demo",
              },
            ],
          },
          {
            accountId: bankAccountId,
            debit: "0",
            credit: "100.20",
            transactionDebit: "0",
            transactionCredit: "1.20",
            dimensions: [
              {
                definitionId: "stg_dimension_branch",
                dimensionValueId: "stg_dimension_value_branch_demo",
              },
            ],
          },
        ],
      }),
    );
    const reversal = await reverseCanonicalJournal({
      orgId,
      legalEntityId,
      journalEntryId: original.journalEntryId,
      reason: "Synthetic foreign-currency correction",
      requestId: "p3test-foreign-reversal-request",
      idempotencyKey: "P3TEST:foreign-reversal",
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
      correlationId: "p3test-foreign-reversal-correlation",
    });
    const reversed = await db.journalEntry.findUniqueOrThrow({
      where: { id: reversal.journalEntryId },
      include: {
        lines: {
          include: { accountingDimensions: true },
          orderBy: { accountId: "asc" },
        },
      },
    });
    expect(reversed.exchangeRateId).toBe("stg_exchange_rate_usd_inr_approved");
    expect(reversed.lines.every((line) => line.accountingDimensions.length === 1)).toBe(true);
    expect(reversed.lines.map((line) => line.transactionDebit?.toString())).toEqual([
      "1.2",
      "0",
    ]);

    const replacement = await replaceCanonicalJournal({
      originalJournalEntryId: original.journalEntryId,
      request: canonicalRequest("foreign-replacement", {
        transactionCurrencyCode: "USD",
        baseCurrencyCode: "INR",
        exchangeRate: {
          id: "stg_exchange_rate_usd_inr_approved",
          rate: "83.5000000000",
          source: "SYNTHETIC_APPROVED",
          effectiveDate: "2027-04-01T00:00:00.000Z",
        },
        lines: [
          {
            accountId: expenseAccountId,
            debit: "108.55",
            credit: "0",
            transactionDebit: "1.30",
            transactionCredit: "0",
          },
          {
            accountId: bankAccountId,
            debit: "0",
            credit: "108.55",
            transactionDebit: "0",
            transactionCredit: "1.30",
          },
        ],
      }),
    });
    expect(
      await db.journalEntry.findUniqueOrThrow({
        where: { id: replacement.journalEntryId },
        select: { replacementOfId: true, originalEffectiveDate: true },
      }),
    ).toMatchObject({
      replacementOfId: original.journalEntryId,
      originalEffectiveDate: new Date("2027-04-10T00:00:00.000Z"),
    });
    await expect(
      replaceCanonicalJournal({
        originalJournalEntryId: original.journalEntryId,
        request: canonicalRequest("foreign-second-replacement"),
      }),
    ).rejects.toMatchObject({ code: "DUPLICATE_REPLACEMENT" });
  });

  it("database guards reject draft promotion and inserted posted child facts", async () => {
    const posted = await postCanonicalAccountingRequest(canonicalRequest("database-write-guards"));
    const postedJournal = await db.journalEntry.findUniqueOrThrow({
      where: { id: posted.journalEntryId },
      include: { lines: true },
    });
    const draftId = `p3test-draft-${randomUUID()}`;
    await db.journalEntry.create({
      data: {
        id: draftId,
        orgId,
        legalEntityId,
        voucherNo: `P3TEST-DRAFT-${randomUUID()}`,
        postingDate: new Date("2027-04-10T00:00:00.000Z"),
        status: "DRAFT",
        totalDebit: "1",
        totalCredit: "1",
        createdById: makerId,
        requestId: draftId,
        lines: {
          create: [
            { accountId: expenseAccountId, debit: "1", credit: "0" },
            { accountId: bankAccountId, debit: "0", credit: "1" },
          ],
        },
      },
    });

    await expect(
      client.query(`UPDATE "JournalEntry" SET status = 'POSTED' WHERE id = $1`, [draftId]),
    ).rejects.toThrow(/canonical Accounting posting engine/i);
    await expect(
      client.query(
        `INSERT INTO "JournalEntryLine"
          (id, "journalEntryId", "accountId", debit, credit)
         VALUES ($1, $2, $3, 1, 0)`,
        [`p3test-line-${randomUUID()}`, posted.journalEntryId, expenseAccountId],
      ),
    ).rejects.toThrow(/canonical Accounting posting engine/i);
    await expect(
      client.query(
        `INSERT INTO "GeneralLedgerEntry"
          (id, "orgId", "postingDate", "accountId", "voucherType", "voucherId",
           debit, credit, "createdById")
         VALUES ($1, $2, DATE '2027-04-10', $3, 'JOURNAL_ENTRY', $4, 1, 0, $5)`,
        [
          `p3test-gl-${randomUUID()}`,
          orgId,
          expenseAccountId,
          posted.journalEntryId,
          checkerId,
        ],
      ),
    ).rejects.toThrow(/canonical Accounting posting engine/i);
    await expect(
      client.query(
        `INSERT INTO "AccountingJournalLineDimension"
          (id, "orgId", "journalEntryLineId", "definitionId", "dimensionValueId")
         VALUES ($1, $2, $3, $4, $5)`,
        [
          `p3test-dimension-${randomUUID()}`,
          orgId,
          postedJournal.lines[0].id,
          "stg_dimension_branch",
          "stg_dimension_value_branch_demo",
        ],
      ),
    ).rejects.toThrow(/immutable/i);
    await expect(
      db.journalEntryLine.delete({
        where: { id: postedJournal.lines[0].id },
      }),
    ).rejects.toThrow(/immutable/i);
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

    await expect(
      acceptApprovedPayrollRun({
        orgId,
        actorId: checkerId,
        runId,
        runVersion: 2,
        payPeriodStart: "2027-04-01T00:00:00.000Z",
        payPeriodEnd: "2027-04-30T00:00:00.000Z",
        currencyCode: "INR",
        approvedById: makerId,
        approvedAt: "2027-05-01T00:00:00.000Z",
        eventId: "P3TEST-PAYROLL-EVENT-2",
        correlationId: "P3TEST-PAYROLL-CORRECTION",
        lines: [
          {
            employeeId: "stg_user_employee",
            componentCode: "HRMS_APPROVED_GROSS",
            accountId: expenseAccountId,
            debit: "510.00",
            credit: "0",
          },
          {
            employeeId: "stg_user_employee",
            componentCode: "HRMS_APPROVED_PAYABLE",
            accountId: payableAccountId,
            debit: "0",
            credit: "510.00",
          },
        ],
      }),
    ).rejects.toThrow(/PAYROLL_CORRECTION_WORKFLOW_REQUIRED/);
    expect(
      await db.accountingPayrollRunSnapshot.count({
        where: { orgId, runId, runVersion: 2 },
      }),
    ).toBe(0);
    expect(
      await db.payrollBatch.findUnique({
        where: {
          orgId_month: {
            orgId,
            month: new Date("2027-04-01T00:00:00.000Z"),
          },
        },
      }),
    ).toMatchObject({
      sourceRunId: runId,
      sourceRunVersion: 1,
      journalEntryId: posted.journalEntryId,
    });
  });
});

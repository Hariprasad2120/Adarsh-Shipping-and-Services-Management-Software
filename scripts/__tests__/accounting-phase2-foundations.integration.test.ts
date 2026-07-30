import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import {
  assertExactStagingEnvironment,
  verifyExactStagingDatabaseIdentity,
} from "../staging-target";

const stagingOrgId = "stg_org_monolith_accounting";
const concurrencyDocumentPrefix = "TEST_CONCURRENCY_";
let client: Client;

async function expectDatabaseRejection(
  statement: string,
  parameters: unknown[] = [],
) {
  await client.query("BEGIN");
  try {
    await expect(client.query(statement, parameters)).rejects.toBeDefined();
  } finally {
    await client.query("ROLLBACK");
  }
}

beforeAll(async () => {
  await verifyExactStagingDatabaseIdentity("Phase 2 integration test");
  const { connectionString } = assertExactStagingEnvironment(
    "Phase 2 integration test",
  );
  client = new Client({
    connectionString,
    application_name: "monolith-accounting-phase2-invariants",
  });
  await client.connect();
  await client.query(
    `DELETE FROM "AccountingNumberSeries"
     WHERE "orgId" = $1 AND "documentType" LIKE $2`,
    [stagingOrgId, `${concurrencyDocumentPrefix}%`],
  );
});

afterAll(async () => {
  if (!client) return;
  try {
    await client.query(
      `DELETE FROM "AccountingNumberSeries"
       WHERE "orgId" = $1 AND "documentType" LIKE $2`,
      [stagingOrgId, `${concurrencyDocumentPrefix}%`],
    );
  } finally {
    await client.end();
  }
});

describe("Accounting Phase 2 database foundations", () => {
  it("preserves populated legacy HR letter file keys", async () => {
    const result = await client.query<{ fileKey: string | null }>(
      `SELECT "fileKey"
       FROM "HRLetterRequest"
       WHERE id = 'stg_legacy_letter_request'`,
    );
    expect(result.rows).toEqual([
      { fileKey: "legacy/staging/preserved-letter-artifact.pdf" },
    ]);
  });

  it("rejects cross-tenant legal-entity links", async () => {
    await client.query("BEGIN");
    try {
      await client.query(
        `INSERT INTO "Organisation" (id, name, slug, active, "crmCallRetentionDays", "createdAt", "updatedAt")
         VALUES ('stg_other_org', 'STAGING Other Tenant', 'staging-other-tenant', true, 90, now(), now())`,
      );
      await client.query(
        `INSERT INTO "AccountingLegalEntity"
          (id, "orgId", code, "legalName", "entityType", status, "isDefault", "createdAt", "updatedAt")
         VALUES
          ('stg_other_entity', 'stg_other_org', 'OTHER', 'STAGING Other Entity', 'TEST', 'DRAFT', false, now(), now())`,
      );
      await expect(
        client.query(
          `INSERT INTO "AccountingTaxRegistration"
            (id, "orgId", "legalEntityId", "registrationCode", "registrationType", "isActive", "createdAt", "updatedAt")
           VALUES
            ('stg_cross_tenant_tax', $1, 'stg_other_entity', 'CROSS-TENANT', 'TEST', false, now(), now())`,
          [stagingOrgId],
        ),
      ).rejects.toThrow(/tenant boundary violation/i);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("enforces positive exchange rates and one functional currency", async () => {
    await expectDatabaseRejection(
      `INSERT INTO "AccountingExchangeRate"
        (id, "orgId", "fromCurrencyId", "toCurrencyId", "rateDate", rate, source, status, "createdAt", "updatedAt")
       VALUES
        ('stg_negative_rate', $1, 'stg_currency_usd', 'stg_currency_inr', DATE '2027-04-02', -1, 'TEST', 'DRAFT', now(), now())`,
      [stagingOrgId],
    );
    await expectDatabaseRejection(
      `INSERT INTO "AccountingCurrency"
        (id, "orgId", code, name, "decimalPlaces", "isFunctional", "isEnabled", "createdAt", "updatedAt")
       VALUES
        ('stg_second_functional', $1, 'EUR', 'Euro', 2, true, true, now(), now())`,
      [stagingOrgId],
    );
  });

  it("enforces independent maker-checker decisions", async () => {
    await expectDatabaseRejection(
      `INSERT INTO "AccountingPeriodLockRequest"
        (id, "orgId", "periodId", "requestedById", "decidedById", reason, status, "requestedAt", "rowVersion")
       VALUES
        ('stg_self_approval', $1, 'stg_period_2027_28_1', 'stg_user_accounting_maker',
         'stg_user_accounting_maker', 'must fail', 'APPROVED', now(), 1)`,
      [stagingOrgId],
    );
  });

  it("allocates number-series values atomically under concurrency", async () => {
    const { connectionString } = assertExactStagingEnvironment(
      "Phase 2 concurrency test",
    );
    const id = `stg_number_series_${randomUUID()}`;
    const documentType = `${concurrencyDocumentPrefix}${randomUUID()}`;
    await client.query(
      `INSERT INTO "AccountingNumberSeries"
        (id, "orgId", "documentType", "prefixTemplate", "nextNumber", padding,
         "effectiveFrom", "isActive", "rowVersion", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'TEST/', 1, 1, DATE '2027-04-01', true, 1, now(), now())`,
      [id, stagingOrgId, documentType],
    );

    const workers = Array.from(
      { length: 6 },
      () =>
        new Client({
          connectionString,
          application_name: "monolith-accounting-number-series-concurrency",
        }),
    );
    try {
      await Promise.all(workers.map((worker) => worker.connect()));
      const allocations = await Promise.all(
        workers.map((worker) =>
          worker.query<{ allocated: string }>(
            `UPDATE "AccountingNumberSeries"
             SET "nextNumber" = "nextNumber" + 1,
                 "rowVersion" = "rowVersion" + 1,
                 "updatedAt" = now()
             WHERE id = $1
             RETURNING ("nextNumber" - 1)::text AS allocated`,
            [id],
          ),
        ),
      );
      const values = allocations.map(({ rows }) => rows[0].allocated).sort();
      expect(values).toEqual(["1", "2", "3", "4", "5", "6"]);
    } finally {
      await Promise.all(workers.map((worker) => worker.end()));
      await client.query(`DELETE FROM "AccountingNumberSeries" WHERE id = $1`, [
        id,
      ]);
    }
  });
});

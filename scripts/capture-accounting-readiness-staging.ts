import { Client } from "pg";

import { assertStagingOutboundDeliveryDisabled } from "./staging-login-policy";
import {
  assertExactStagingEnvironment,
  verifyExactStagingDatabaseIdentity,
} from "./staging-target";
import {
  evaluateAccountingReadiness,
  summarizeReadiness,
  type AccountingReadinessSnapshot,
} from "../src/modules/accounting/migration/readiness";
import { boundedSafeMessage } from "../src/modules/accounting/migration/security";

const REQUIRED_PERMISSIONS = [
  "accounting.migration.read",
  "accounting.migration.execute",
  "accounting.migration.mapping.manage",
  "accounting.migration.exception.manage",
  "accounting.readiness.read",
];

function argument(name: string) {
  const direct = process.argv.find((entry) => entry.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const orgId = argument("--org-id");
  const legalEntityId = argument("--legal-entity-id");
  if (
    !orgId ||
    !legalEntityId ||
    !/^[A-Za-z0-9_-]{3,128}$/.test(orgId) ||
    !/^[A-Za-z0-9_-]{3,128}$/.test(legalEntityId)
  ) {
    throw new Error("READINESS_ORGANIZATION_AND_LEGAL_ENTITY_REQUIRED");
  }
  const { connectionString } = assertExactStagingEnvironment(
    "Accounting readiness capture",
  );
  assertStagingOutboundDeliveryDisabled(process.env);
  await verifyExactStagingDatabaseIdentity("Accounting readiness capture");
  const client = new Client({
    connectionString,
    application_name: "accounting-phase6-readiness",
  });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const tableState = await client.query<{
      migration_batch: string | null;
      migration_record: string | null;
    }>(`
      SELECT
        to_regclass('"AccountingMigrationBatch"')::text AS migration_batch,
        to_regclass('"AccountingMigrationRecord"')::text AS migration_record
    `);
    const phase6SchemaReady =
      Boolean(tableState.rows[0]?.migration_batch) &&
      Boolean(tableState.rows[0]?.migration_record);
    const migrationState = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM "_prisma_migrations"
       WHERE migration_name = $1
         AND finished_at IS NOT NULL
         AND rolled_back_at IS NULL`,
      ["20260730230000_accounting_phase6_migration_control"],
    );
    const phase6MigrationApplied =
      Number(migrationState.rows[0]?.count ?? 0) === 1;
    const scalar = async (sql: string, values: unknown[] = []) => {
      const result = await client.query<{ count: string }>(sql, values);
      return Number(result.rows[0]?.count ?? 0);
    };
    const permissionResult = await client.query<{ key: string }>(
      `SELECT key FROM "Permission" WHERE key = ANY($1::text[])`,
      [REQUIRED_PERMISSIONS],
    );
    const organizationProfiles = await scalar(
      `SELECT COUNT(*)::text AS count
       FROM "AccountingOrganisationProfile"
       WHERE "orgId" = $1`,
      [orgId],
    );
    const legalEntities = await scalar(
      `SELECT COUNT(*)::text AS count
       FROM "AccountingLegalEntity"
       WHERE id = $1 AND "orgId" = $2 AND status = 'ACTIVE'`,
      [legalEntityId, orgId],
    );
    const numberSeries = await scalar(
      `SELECT COUNT(*)::text AS count
       FROM "AccountingNumberSeries"
       WHERE "orgId" = $1 AND "isActive" = true`,
      [orgId],
    );
    const openPeriods = await scalar(
      `SELECT COUNT(*)::text AS count
       FROM "AccountingPeriod"
       WHERE "orgId" = $1 AND status = 'OPEN'`,
      [orgId],
    );
    const activePostingAccounts = await scalar(
      `SELECT COUNT(*)::text AS count
       FROM "Account"
       WHERE "orgId" = $1
         AND "legalEntityId" = $2
         AND "isActive" = true
         AND "isGroup" = false`,
      [orgId, legalEntityId],
    );
    const unmappedAccounts = await scalar(`
      SELECT COUNT(*)::text AS count
      FROM "Account" a
      LEFT JOIN "AccountingAccountControl" c
        ON c."accountId" = a.id AND c."orgId" = a."orgId"
      WHERE a."orgId" = $1
        AND a."legalEntityId" = $2
        AND a."isActive" = true
        AND a."isGroup" = false
        AND c.id IS NULL
    `, [orgId, legalEntityId]);
    const statutoryPolicies = await scalar(
      `SELECT COUNT(*)::text AS count
       FROM "AccountingDocumentPolicy"
       WHERE "orgId" = $1
         AND "legalEntityId" = $2
         AND "isActive" = true
         AND "statutoryValidated" = true`,
      [orgId, legalEntityId],
    );
    const unsafeOutbox = await scalar(
      `SELECT COUNT(*)::text AS count
       FROM "AccountingIntegrationOutbox"
       WHERE "orgId" = $1
         AND ("legalEntityId" IS NULL OR "legalEntityId" = $2)
         AND destination NOT LIKE 'SYNTHETIC\\_%' ESCAPE '\\'`,
      [orgId, legalEntityId],
    );
    const incompleteBatches = phase6SchemaReady
      ? await scalar(
          `SELECT COUNT(*)::text AS count
           FROM "AccountingMigrationBatch"
           WHERE "orgId" = $1
             AND "legalEntityId" = $2
             AND status <> 'COMPLETED'`,
          [orgId, legalEntityId],
        )
      : 0;
    const snapshot: AccountingReadinessSnapshot = {
      schemaConsistent: phase6SchemaReady,
      migrationsCurrent: phase6SchemaReady && phase6MigrationApplied,
      requiredPermissionsPresent:
        permissionResult.rows.length === REQUIRED_PERMISSIONS.length,
      organizationConfigured: organizationProfiles > 0,
      legalEntitiesConfigured: legalEntities > 0,
      numberSeriesConfigured: numberSeries > 0,
      openPeriodsConfigured: openPeriods > 0,
      accountMappingsComplete:
        activePostingAccounts > 0 && unmappedAccounts === 0,
      currencyPolicyAccepted: false,
      exchangeRatePolicyAccepted: false,
      openingBalancePolicyAccepted: false,
      taxPolicyAccepted: statutoryPolicies > 0,
      depreciationPolicyAccepted: false,
      partnerPolicyAccepted: false,
      providersDisabled:
        process.env.ACCOUNTING_PROVIDER_MODE === "disabled" &&
        process.env.EMAIL_PROVIDER !== "smtp" &&
        process.env.EMAIL_PROVIDER !== "resend",
      schedulerState: "SYNTHETIC_STAGING_ONLY",
      outboxUnsafeDestinations: unsafeOutbox,
      migrationIncompleteBatches: incompleteBatches,
      backupVerified: false,
      unresolvedPolicyGates: [
        "CURRENCY_POLICY",
        "OPENING_BALANCE_POLICY",
        "EXCHANGE_RATE_POLICY",
        ...(statutoryPolicies > 0 ? [] : ["TAX_POLICY"]),
        "DEPRECIATION_POLICY",
        "PARTNER_POLICY",
        "BACKUP_VERIFICATION",
      ],
    };
    await client.query("ROLLBACK");
    const result = summarizeReadiness(evaluateAccountingReadiness(snapshot));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.ready ? 0 : 2;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({ status: "FAILED", error: boundedSafeMessage(error) })}\n`,
  );
  process.exitCode = 1;
});

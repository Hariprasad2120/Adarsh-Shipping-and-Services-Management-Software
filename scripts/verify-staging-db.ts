import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";
import {
  assertExactStagingEnvironment,
  STAGING_DATABASE_HOST,
  STAGING_DATABASE_MARKER,
  STAGING_DATABASE_NAME,
  STAGING_DATABASE_PORT,
  STAGING_DATABASE_USER,
} from "./staging-target";
import {
  assertAllowedStagingFixtureIdentities,
  assertStagingMakerAuthorization,
  assertStagingOutboundDeliveryDisabled,
  STAGING_CHECKER_USER_ID,
  STAGING_LOGIN_IDENTITY,
} from "./staging-login-policy";

const expectedOrgSlug = "staging-monolith-accounting";

function assertEnvironment() {
  const target = assertExactStagingEnvironment("Staging verification");
  assertStagingOutboundDeliveryDisabled(process.env);
  return target.connectionString;
}

async function verify() {
  const client = new Client({
    connectionString: assertEnvironment(),
    application_name: "monolith-accounting-staging-verifier",
  });
  await client.connect();

  try {
    const identity = await client.query<{
      database: string;
      username: string;
      address: string;
      port: number;
      marker: string;
    }>(`
      SELECT
        current_database() AS database,
        current_user AS username,
        COALESCE(inet_server_addr()::text, '') AS address,
        inet_server_port() AS port,
        COALESCE(shobj_description(oid, 'pg_database'), '') AS marker
      FROM pg_database
      WHERE datname = current_database()
    `);
    const target = identity.rows[0];
    const serverAddress = target?.address.split("/")[0] ?? "";
    if (
      !target ||
      target.database !== STAGING_DATABASE_NAME ||
      target.username !== STAGING_DATABASE_USER ||
      serverAddress !== STAGING_DATABASE_HOST ||
      String(target.port) !== STAGING_DATABASE_PORT ||
      target.marker !== STAGING_DATABASE_MARKER
    ) {
      throw new Error("Database identity verification failed.");
    }

    const migrationDirectories = (
      await readdir(resolve(process.cwd(), "prisma/migrations"), {
        withFileTypes: true,
      })
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const migrations = await client.query<{
      migration_name: string;
      finished: boolean;
      rolled_back: boolean;
    }>(`
      SELECT
        migration_name,
        finished_at IS NOT NULL AS finished,
        rolled_back_at IS NOT NULL AS rolled_back
      FROM "_prisma_migrations"
      ORDER BY migration_name
    `);
    const failed = migrations.rows.filter(
      ({ finished, rolled_back }) => !finished && !rolled_back,
    );
    const successful = new Set(
      migrations.rows
        .filter(({ finished }) => finished)
        .map(({ migration_name }) => migration_name),
    );
    const pending = migrationDirectories.filter(
      (migration) => !successful.has(migration),
    );
    if (failed.length || pending.length) {
      throw new Error(
        `Migration history is not clean: ${failed.length} failed and ${pending.length} pending migration record(s).`,
      );
    }

    const fixtureIdentities = await client.query<{
      id: string;
      email: string;
    }>(
      `
        SELECT id, email
        FROM "User"
        WHERE "orgId" = (
          SELECT id FROM "Organisation" WHERE slug = $1
        )
        ORDER BY id
      `,
      [expectedOrgSlug],
    );
    assertAllowedStagingFixtureIdentities(fixtureIdentities.rows);

    const makerAuthorization = await client.query<{
      id: string;
      email: string;
      is_platform_admin: boolean;
      role_ids: string[];
      role_names: string[];
      permission_keys: string[];
      checker_user_id: string | null;
      checker_role_ids: string[];
    }>(
      `
        SELECT
          maker.id,
          maker.email,
          maker."isPlatformAdmin" AS is_platform_admin,
          COALESCE(
            array_agg(DISTINCT maker_role.id)
              FILTER (WHERE maker_role.id IS NOT NULL),
            ARRAY[]::text[]
          ) AS role_ids,
          COALESCE(
            array_agg(DISTINCT maker_role.name)
              FILTER (WHERE maker_role.name IS NOT NULL),
            ARRAY[]::text[]
          ) AS role_names,
          COALESCE(
            array_agg(DISTINCT maker_permission.key)
              FILTER (WHERE maker_permission.key IS NOT NULL),
            ARRAY[]::text[]
          ) AS permission_keys,
          (
            SELECT checker.id
            FROM "User" checker
            WHERE checker.id = $3
              AND checker."orgId" = maker."orgId"
          ) AS checker_user_id,
          COALESCE(
            (
              SELECT array_agg(checker_role.id ORDER BY checker_role.id)
              FROM "UserRole" checker_user_role
              JOIN "Role" checker_role
                ON checker_role.id = checker_user_role."roleId"
              WHERE checker_user_role."userId" = $3
            ),
            ARRAY[]::text[]
          ) AS checker_role_ids
        FROM "User" maker
        LEFT JOIN "UserRole" maker_user_role
          ON maker_user_role."userId" = maker.id
        LEFT JOIN "Role" maker_role
          ON maker_role.id = maker_user_role."roleId"
        LEFT JOIN "RolePermission" maker_role_permission
          ON maker_role_permission."roleId" = maker_role.id
        LEFT JOIN "Permission" maker_permission
          ON maker_permission.id = maker_role_permission."permissionId"
        WHERE maker.id = $2
          AND maker."orgId" = (
            SELECT id FROM "Organisation" WHERE slug = $1
          )
        GROUP BY maker.id, maker.email, maker."isPlatformAdmin", maker."orgId"
      `,
      [
        expectedOrgSlug,
        STAGING_LOGIN_IDENTITY.id,
        STAGING_CHECKER_USER_ID,
      ],
    );
    if (makerAuthorization.rows.length !== 1) {
      throw new Error("[STAGING_MAKER_FIXTURE_MISSING]");
    }
    const maker = makerAuthorization.rows[0];
    assertStagingMakerAuthorization({
      id: maker.id,
      email: maker.email,
      isPlatformAdmin: maker.is_platform_admin,
      roleIds: maker.role_ids,
      roleNames: maker.role_names,
      permissionKeys: maker.permission_keys,
      checkerUserId: maker.checker_user_id,
      checkerRoleIds: maker.checker_role_ids,
    });

    const externalConnections = await client.query<{
      google_workspace_connections: string;
    }>(
      `
        SELECT COUNT(*)::text AS google_workspace_connections
        FROM "GoogleWorkspaceConnection"
        WHERE "orgId" = (
          SELECT id FROM "Organisation" WHERE slug = $1
        )
      `,
      [expectedOrgSlug],
    );
    if (
      externalConnections.rows[0]?.google_workspace_connections !== "0"
    ) {
      throw new Error("[STAGING_EXTERNAL_CONNECTION_PRESENT]");
    }

    const synthetic = await client.query<{
      organisations: string;
      users: string;
      journals: string;
      unbalanced_journals: string;
      accounting_profiles: string;
      legal_entities: string;
      configured_gstins: string;
      currencies: string;
      functional_currencies: string;
      periods: string;
      overlapping_periods: string;
      preserved_legacy_file_keys: string;
      journal_lineage: string;
    }>(`
      SELECT
        (SELECT COUNT(*)::text FROM "Organisation" WHERE slug = $1) AS organisations,
        (
          SELECT COUNT(*)::text
          FROM "User"
          WHERE "orgId" = (
            SELECT id FROM "Organisation" WHERE slug = $1
          )
        ) AS users,
        (
          SELECT COUNT(*)::text
          FROM "JournalEntry"
          WHERE "orgId" = (
            SELECT id FROM "Organisation" WHERE slug = $1
          )
        ) AS journals,
        (
          SELECT COUNT(*)::text
          FROM (
            SELECT j.id
            FROM "JournalEntry" j
            JOIN "JournalEntryLine" l ON l."journalEntryId" = j.id
            WHERE j."orgId" = (
              SELECT id FROM "Organisation" WHERE slug = $1
            )
            GROUP BY j.id
            HAVING SUM(l.debit) <> SUM(l.credit)
          ) unbalanced
        ) AS unbalanced_journals,
        (
          SELECT COUNT(*)::text FROM "AccountingOrganisationProfile"
          WHERE "orgId" = (SELECT id FROM "Organisation" WHERE slug = $1)
        ) AS accounting_profiles,
        (
          SELECT COUNT(*)::text FROM "AccountingLegalEntity"
          WHERE "orgId" = (SELECT id FROM "Organisation" WHERE slug = $1)
        ) AS legal_entities,
        (
          SELECT COUNT(*)::text FROM "AccountingTaxRegistration"
          WHERE "orgId" = (SELECT id FROM "Organisation" WHERE slug = $1)
          AND gstin IS NOT NULL
        ) AS configured_gstins,
        (
          SELECT COUNT(*)::text FROM "AccountingCurrency"
          WHERE "orgId" = (SELECT id FROM "Organisation" WHERE slug = $1)
        ) AS currencies,
        (
          SELECT COUNT(*)::text FROM "AccountingCurrency"
          WHERE "orgId" = (SELECT id FROM "Organisation" WHERE slug = $1)
          AND "isFunctional" = true
        ) AS functional_currencies,
        (
          SELECT COUNT(*)::text FROM "AccountingPeriod"
          WHERE "orgId" = (SELECT id FROM "Organisation" WHERE slug = $1)
        ) AS periods,
        (
          SELECT COUNT(*)::text
          FROM "AccountingPeriod" first_period
          JOIN "AccountingPeriod" second_period
            ON first_period."orgId" = second_period."orgId"
           AND first_period.id < second_period.id
           AND daterange(first_period."startDate", first_period."endDate", '[]')
               && daterange(second_period."startDate", second_period."endDate", '[]')
          WHERE first_period."orgId" = (
            SELECT id FROM "Organisation" WHERE slug = $1
          )
        ) AS overlapping_periods,
        (
          SELECT COUNT(*)::text FROM "HRLetterRequest"
          WHERE "orgId" = (SELECT id FROM "Organisation" WHERE slug = $1)
          AND "fileKey" = 'legacy/staging/preserved-letter-artifact.pdf'
        ) AS preserved_legacy_file_keys,
        (
          SELECT COUNT(*)::text FROM "JournalEntry"
          WHERE "orgId" = (SELECT id FROM "Organisation" WHERE slug = $1)
          AND "accountingPeriodId" IS NOT NULL
          AND "sourceSystem" IS NOT NULL
          AND "sourceType" IS NOT NULL
          AND "sourceId" IS NOT NULL
          AND "sourceVersion" IS NOT NULL
          AND "idempotencyKey" IS NOT NULL
        ) AS journal_lineage
    `, [expectedOrgSlug]);
    const fixture = synthetic.rows[0];
    if (
      fixture.organisations !== "1" ||
      Number(fixture.users) < 3 ||
      Number(fixture.journals) < 2 ||
      fixture.unbalanced_journals !== "0" ||
      fixture.accounting_profiles !== "1" ||
      fixture.legal_entities !== "1" ||
      fixture.configured_gstins !== "0" ||
      fixture.currencies !== "2" ||
      fixture.functional_currencies !== "1" ||
      fixture.periods !== "12" ||
      fixture.overlapping_periods !== "0" ||
      fixture.preserved_legacy_file_keys !== "1" ||
      Number(fixture.journal_lineage) < 2
    ) {
      throw new Error("Synthetic fixture verification failed.");
    }

    console.log(
      `Verified local staging: ${migrationDirectories.length} migrations, ${fixture.users} guarded staging fixture users, ${fixture.journals} balanced journals, ${fixture.periods} non-overlapping periods, and preserved legacy fileKey data.`,
    );
  } finally {
    await client.end();
  }
}

verify().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

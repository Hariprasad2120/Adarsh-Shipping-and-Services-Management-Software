import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertStagingMakerAuthorization,
  STAGING_CHECKER_USER_ID,
  STAGING_LOGIN_IDENTITY,
} from "../staging-login-policy";
import { assertExactStagingEnvironment } from "../staging-target";

const stagingOrgId = "stg_org_monolith_accounting";
const formerMakerEmail = "accounting-maker@staging.example.com";
const conflictUserId = "stg_test_conflicting_login_owner";
const rollbackSentinel = "STAGING TRANSACTION ROLLBACK SENTINEL";
let client: Client;

function runGuardedSeed() {
  const tsxEntrypoint = resolve(
    process.cwd(),
    "node_modules/tsx/dist/cli.mjs",
  );
  return spawnSync(
    process.execPath,
    [
      tsxEntrypoint,
      "scripts/run-with-staging-env.ts",
      "tsx",
      "prisma/seed.staging.ts",
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_OPTIONS: "--max-old-space-size=8192",
      },
      encoding: "utf8",
      shell: false,
    },
  );
}

function expectSeedSuccess(result: ReturnType<typeof runGuardedSeed>) {
  expect({
    status: result.status,
    signal: result.signal,
  }).toEqual({
    status: 0,
    signal: null,
  });
}

async function loadMakerAuthorization() {
  const maker = await client.query<{
    id: string;
    email: string;
    is_platform_admin: boolean;
  }>(
    `
      SELECT id, email, "isPlatformAdmin" AS is_platform_admin
      FROM "User"
      WHERE id = $1 AND "orgId" = $2
    `,
    [STAGING_LOGIN_IDENTITY.id, stagingOrgId],
  );
  const roles = await client.query<{ id: string; name: string }>(
    `
      SELECT role.id, role.name
      FROM "UserRole" user_role
      JOIN "Role" role ON role.id = user_role."roleId"
      WHERE user_role."userId" = $1
      ORDER BY role.id
    `,
    [STAGING_LOGIN_IDENTITY.id],
  );
  const permissions = await client.query<{ key: string }>(
    `
      SELECT DISTINCT permission.key
      FROM "UserRole" user_role
      JOIN "RolePermission" role_permission
        ON role_permission."roleId" = user_role."roleId"
      JOIN "Permission" permission
        ON permission.id = role_permission."permissionId"
      WHERE user_role."userId" = $1
      ORDER BY permission.key
    `,
    [STAGING_LOGIN_IDENTITY.id],
  );
  const checkerRoles = await client.query<{ id: string }>(
    `
      SELECT role.id
      FROM "UserRole" user_role
      JOIN "Role" role ON role.id = user_role."roleId"
      WHERE user_role."userId" = $1
      ORDER BY role.id
    `,
    [STAGING_CHECKER_USER_ID],
  );
  const row = maker.rows[0];
  return {
    id: row.id,
    email: row.email,
    isPlatformAdmin: row.is_platform_admin,
    roleIds: roles.rows.map(({ id }) => id),
    roleNames: roles.rows.map(({ name }) => name),
    permissionKeys: permissions.rows.map(({ key }) => key),
    checkerUserId: checkerRoles.rowCount ? STAGING_CHECKER_USER_ID : null,
    checkerRoleIds: checkerRoles.rows.map(({ id }) => id),
  };
}

describe.sequential("guarded staging-login compatibility", () => {
  beforeAll(async () => {
    const { connectionString } = assertExactStagingEnvironment(
      "Staging-login compatibility integration test",
    );
    client = new Client({
      connectionString,
      application_name: "staging-login-compatibility-test",
    });
    await client.connect();
    expectSeedSuccess(runGuardedSeed());
  });

  afterAll(async () => {
    if (client) {
      await client.query(`DELETE FROM "User" WHERE id = $1`, [conflictUserId]);
      await client.end();
    }
  });

  it("fails on a conflicting email owner without partial writes, then migrates the former email by stable ID", async () => {
    await client.query("BEGIN");
    try {
      await client.query(
        `UPDATE "User" SET email = $1 WHERE id = $2`,
        [formerMakerEmail, STAGING_LOGIN_IDENTITY.id],
      );
      await client.query(
        `
          INSERT INTO "User"
            (id, "orgId", email, "passwordHash", name, active, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, 'synthetic-conflict-hash', 'STAGING Conflict Fixture', false, now(), now())
        `,
        [conflictUserId, stagingOrgId, STAGING_LOGIN_IDENTITY.email],
      );
      await client.query(
        `UPDATE "Organisation" SET name = $1 WHERE id = $2`,
        [rollbackSentinel, stagingOrgId],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    try {
      const failedSeed = runGuardedSeed();
      expect(failedSeed.status).not.toBe(0);
      expect(`${failedSeed.stdout}\n${failedSeed.stderr}`).toContain(
        "[STAGING_LOGIN_EMAIL_OWNER_CONFLICT]",
      );

      const unchanged = await client.query<{
        organisation_name: string;
        maker_email: string;
        conflicting_owner: string;
      }>(
        `
          SELECT
            (SELECT name FROM "Organisation" WHERE id = $1) AS organisation_name,
            (SELECT email FROM "User" WHERE id = $2) AS maker_email,
            (SELECT id FROM "User" WHERE email = $3) AS conflicting_owner
        `,
        [
          stagingOrgId,
          STAGING_LOGIN_IDENTITY.id,
          STAGING_LOGIN_IDENTITY.email,
        ],
      );
      expect(unchanged.rows[0]).toEqual({
        organisation_name: rollbackSentinel,
        maker_email: formerMakerEmail,
        conflicting_owner: conflictUserId,
      });
    } finally {
      await client.query(`DELETE FROM "User" WHERE id = $1`, [conflictUserId]);
      expectSeedSuccess(runGuardedSeed());
    }

    const migrated = await client.query<{
      maker_id: string;
      maker_email: string;
      approved_email_count: string;
      former_email_count: string;
    }>(
      `
        SELECT
          (SELECT id FROM "User" WHERE id = $1) AS maker_id,
          (SELECT email FROM "User" WHERE id = $1) AS maker_email,
          (SELECT COUNT(*)::text FROM "User" WHERE email = $2) AS approved_email_count,
          (SELECT COUNT(*)::text FROM "User" WHERE email = $3) AS former_email_count
      `,
      [
        STAGING_LOGIN_IDENTITY.id,
        STAGING_LOGIN_IDENTITY.email,
        formerMakerEmail,
      ],
    );
    expect(migrated.rows[0]).toEqual({
      maker_id: STAGING_LOGIN_IDENTITY.id,
      maker_email: STAGING_LOGIN_IDENTITY.email,
      approved_email_count: "1",
      former_email_count: "0",
    });
  });

  it("remains idempotent across consecutive guarded seeds", async () => {
    const first = runGuardedSeed();
    expectSeedSuccess(first);
    const afterFirst = await loadMakerAuthorization();

    const second = runGuardedSeed();
    expectSeedSuccess(second);
    const afterSecond = await loadMakerAuthorization();

    expect(afterSecond).toEqual(afterFirst);
  });

  it("enforces the intended maker authorization and maker-checker separation", async () => {
    const authorization = await loadMakerAuthorization();
    expect(() =>
      assertStagingMakerAuthorization(authorization),
    ).not.toThrow();

    await expect(
      client.query(
        `
          INSERT INTO "AccountingPeriodLockRequest"
            (id, "orgId", "periodId", "requestedById", "decidedById",
             reason, status, "requestedAt", "rowVersion")
          VALUES
            ('stg_login_self_approval', $1, 'stg_period_2027_28_1', $2, $2,
             'must fail', 'APPROVED', now(), 1)
        `,
        [stagingOrgId, STAGING_LOGIN_IDENTITY.id],
      ),
    ).rejects.toThrow();
    await client.query(
      `DELETE FROM "AccountingPeriodLockRequest" WHERE id = 'stg_login_self_approval'`,
    );
  });
});

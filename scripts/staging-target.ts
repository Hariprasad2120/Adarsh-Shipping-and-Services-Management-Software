import { Client } from "pg";

export const STAGING_DATABASE_HOST = "127.0.0.1";
export const STAGING_DATABASE_PORT = "56432";
export const STAGING_DATABASE_NAME = "monolith_accounting_staging";
export const STAGING_DATABASE_USER = "monolith_staging";
export const STAGING_DATABASE_MARKER = "MONOLITH_ACCOUNTING_STAGING_ONLY";

type StagingTarget = {
  connectionString: string;
  url: URL;
};

export function assertExactStagingEnvironment(
  operation = "Database operation",
): StagingTarget {
  if (
    process.env.MONOLITH_ENV !== "staging" ||
    process.env.STAGING_MARKER !== STAGING_DATABASE_MARKER
  ) {
    throw new Error(
      `${operation} refused: the approved staging environment marker is absent.`,
    );
  }

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error(`${operation} refused: DATABASE_URL is absent.`);
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`${operation} refused: DATABASE_URL is malformed.`);
  }

  const databaseName = url.pathname.replace(/^\/+/, "");
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== STAGING_DATABASE_HOST ||
    url.port !== STAGING_DATABASE_PORT ||
    databaseName !== STAGING_DATABASE_NAME ||
    url.username !== STAGING_DATABASE_USER ||
    !url.password
  ) {
    throw new Error(
      `${operation} refused: the database is not the exact approved staging target.`,
    );
  }

  const declaredTarget = {
    host: process.env.STAGING_DATABASE_HOST,
    port: process.env.STAGING_DATABASE_PORT,
    database: process.env.STAGING_DATABASE_NAME,
    user: process.env.STAGING_DATABASE_USER,
  };
  if (
    declaredTarget.host !== STAGING_DATABASE_HOST ||
    declaredTarget.port !== STAGING_DATABASE_PORT ||
    declaredTarget.database !== STAGING_DATABASE_NAME ||
    declaredTarget.user !== STAGING_DATABASE_USER
  ) {
    throw new Error(
      `${operation} refused: the declared staging identity does not match the approved target.`,
    );
  }

  return { connectionString: rawUrl, url };
}

export async function verifyExactStagingDatabaseIdentity(
  operation = "Database operation",
): Promise<void> {
  const { connectionString } = assertExactStagingEnvironment(operation);
  const client = new Client({
    connectionString,
    application_name: "monolith-accounting-staging-identity-guard",
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
      throw new Error(
        `${operation} refused: the connected database identity or marker is not approved staging.`,
      );
    }
  } finally {
    await client.end();
  }
}

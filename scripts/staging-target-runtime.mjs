export const STAGING_DATABASE_HOST = "127.0.0.1";
export const STAGING_DATABASE_PORT = "56432";
export const STAGING_DATABASE_NAME = "monolith_accounting_staging";
export const STAGING_DATABASE_USER = "monolith_staging";
export const STAGING_DATABASE_MARKER = "MONOLITH_ACCOUNTING_STAGING_ONLY";

export function assertExactStagingEnvironment(
  operation = "Database operation",
) {
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

  let url;
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

  if (
    process.env.STAGING_DATABASE_HOST !== STAGING_DATABASE_HOST ||
    process.env.STAGING_DATABASE_PORT !== STAGING_DATABASE_PORT ||
    process.env.STAGING_DATABASE_NAME !== STAGING_DATABASE_NAME ||
    process.env.STAGING_DATABASE_USER !== STAGING_DATABASE_USER
  ) {
    throw new Error(
      `${operation} refused: the declared staging identity does not match the approved target.`,
    );
  }

  return { connectionString: rawUrl, url };
}

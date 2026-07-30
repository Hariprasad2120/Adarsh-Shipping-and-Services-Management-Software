import { afterEach, describe, expect, it } from "vitest";
import {
  assertExactStagingEnvironment,
  STAGING_DATABASE_HOST,
  STAGING_DATABASE_MARKER,
  STAGING_DATABASE_NAME,
  STAGING_DATABASE_PORT,
  STAGING_DATABASE_USER,
} from "../staging-target";

const environmentKeys = [
  "MONOLITH_ENV",
  "STAGING_MARKER",
  "STAGING_DATABASE_HOST",
  "STAGING_DATABASE_PORT",
  "STAGING_DATABASE_NAME",
  "STAGING_DATABASE_USER",
  "DATABASE_URL",
] as const;
const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]]),
);

function setValidEnvironment() {
  process.env.MONOLITH_ENV = "staging";
  process.env.STAGING_MARKER = STAGING_DATABASE_MARKER;
  process.env.STAGING_DATABASE_HOST = STAGING_DATABASE_HOST;
  process.env.STAGING_DATABASE_PORT = STAGING_DATABASE_PORT;
  process.env.STAGING_DATABASE_NAME = STAGING_DATABASE_NAME;
  process.env.STAGING_DATABASE_USER = STAGING_DATABASE_USER;
  process.env.DATABASE_URL =
    "postgresql://monolith_staging:test-only@127.0.0.1:56432/monolith_accounting_staging?schema=public";
}

afterEach(() => {
  for (const key of environmentKeys) {
    const value = originalEnvironment[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("exact staging target guard", () => {
  it("accepts only the approved tuple", () => {
    setValidEnvironment();

    expect(assertExactStagingEnvironment("Test").url.hostname).toBe(
      STAGING_DATABASE_HOST,
    );
  });

  it.each([
    ["host", "localhost", "56432", "monolith_accounting_staging", "monolith_staging"],
    ["port", "127.0.0.1", "5432", "monolith_accounting_staging", "monolith_staging"],
    ["database", "127.0.0.1", "56432", "postgres", "monolith_staging"],
    ["user", "127.0.0.1", "56432", "monolith_accounting_staging", "postgres"],
  ])("rejects a mismatched %s", (_label, host, port, database, user) => {
    setValidEnvironment();
    process.env.DATABASE_URL =
      `postgresql://${user}:test-only@${host}:${port}/${database}?schema=public`;

    expect(() => assertExactStagingEnvironment("Test")).toThrow(
      /exact approved staging target/,
    );
  });

  it("rejects a missing marker", () => {
    setValidEnvironment();
    process.env.STAGING_MARKER = "NOT_STAGING";

    expect(() => assertExactStagingEnvironment("Test")).toThrow(
      /staging environment marker/,
    );
  });

  it("rejects mismatched declared staging identity", () => {
    setValidEnvironment();
    process.env.STAGING_DATABASE_PORT = "5432";

    expect(() => assertExactStagingEnvironment("Test")).toThrow(
      /declared staging identity/,
    );
  });
});

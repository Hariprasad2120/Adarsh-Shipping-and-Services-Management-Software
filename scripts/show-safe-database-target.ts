import { resolve } from "node:path";

import { config } from "dotenv";

const rootEnvironmentPath = resolve(process.cwd(), ".env");
const loaded = config({
  path: rootEnvironmentPath,
  override: false,
  quiet: true,
});
if (loaded.error) {
  throw new Error("Unable to load the root .env file.");
}

const rawDatabaseUrl = process.env.DATABASE_URL;
if (!rawDatabaseUrl) {
  throw new Error("DATABASE_URL is absent from the normal environment.");
}

let databaseUrl: URL;
try {
  databaseUrl = new URL(rawDatabaseUrl);
} catch {
  throw new Error("DATABASE_URL is not a valid URL.");
}

const sslMode = (databaseUrl.searchParams.get("sslmode") ?? "").toLowerCase();
const sslFlag = (databaseUrl.searchParams.get("ssl") ?? "").toLowerCase();
const sslEnabled =
  sslFlag === "true" ||
  ["prefer", "require", "verify-ca", "verify-full"].includes(sslMode);

console.log(
  JSON.stringify(
    {
      environmentMode: process.env.NODE_ENV || "development",
      host: databaseUrl.hostname,
      port: databaseUrl.port || "5432",
      database: decodeURIComponent(databaseUrl.pathname.replace(/^\//, "")),
      sslEnabled,
    },
    null,
    2,
  ),
);

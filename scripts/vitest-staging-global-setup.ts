import { verifyExactStagingDatabaseIdentity } from "./staging-target";

export default async function stagingDatabaseGlobalSetup() {
  await verifyExactStagingDatabaseIdentity("Vitest");
}

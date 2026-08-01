import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assertExactStagingEnvironment, verifyExactStagingDatabaseIdentity } from "./staging-target";

const STAGING_ORG_ID = "stg_org_monolith_accounting";
const SETTINGS_KEY = `org:${STAGING_ORG_ID}:cha_customs_feature_flags`;

async function main() {
  const connectionString = assertExactStagingEnvironment("Set CHA customs staging flags").connectionString;
  await verifyExactStagingDatabaseIdentity("Set CHA customs staging flags");

  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  } as ConstructorParameters<typeof PrismaClient>[0]);

  try {
    const value = JSON.stringify({
      CHA_CUSTOMS_MASTER_DATA: true,
      CHA_IMPORT_FILING_WORKSPACE: true,
      CHA_EXPORT_FILING_WORKSPACE: true,
      CHA_ICEGATE_INTEGRATION: true,
      CHA_ICEGATE_LIVE_SUBMISSION: false,
    });

    await db.systemSetting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value },
      create: { key: SETTINGS_KEY, value },
    });

    console.log(`Set staging customs flags on ${SETTINGS_KEY}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

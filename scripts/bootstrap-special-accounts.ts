import "dotenv/config";
import { db } from "../src/lib/db";
import { ensureSpecialAccounts } from "../src/modules/core/user/special-account-bootstrap";

const DEFAULT_PASSWORD = process.env.SPECIAL_ACCOUNTS_INITIAL_PASSWORD;
const ORG_SLUG = process.env.SPECIAL_ACCOUNTS_ORG_SLUG ?? "adarsh-shipping";

if (!DEFAULT_PASSWORD) {
  throw new Error(
    "SPECIAL_ACCOUNTS_INITIAL_PASSWORD is required (no hardcoded default). " +
      "Also set SPECIAL_ROOT_ACCOUNT_EMAIL and/or SPECIAL_CHA_TEST_EMAIL.",
  );
}

async function main() {
  const org = await db.organisation.findFirst({
    where: { slug: ORG_SLUG },
    select: { id: true, name: true },
  });

  if (!org) {
    throw new Error(`Organisation '${ORG_SLUG}' was not found.`);
  }

  const result = await ensureSpecialAccounts(org.id, DEFAULT_PASSWORD);

  const created = [result.rootUser?.email, result.chaUser?.email].filter(Boolean);
  console.log(
    `Bootstrapped ${created.join(", ") || "no"} account(s) in organisation ${org.name}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });

import "dotenv/config";
import { db } from "../src/lib/db";
import { ensureSpecialAccounts } from "../src/modules/core/user/special-account-bootstrap";

const DEFAULT_PASSWORD = process.env.SPECIAL_ACCOUNTS_INITIAL_PASSWORD ?? "password@123";
const ORG_SLUG = process.env.SPECIAL_ACCOUNTS_ORG_SLUG ?? "adarsh-shipping";

async function main() {
  const org = await db.organisation.findFirst({
    where: { slug: ORG_SLUG },
    select: { id: true, name: true },
  });

  if (!org) {
    throw new Error(`Organisation '${ORG_SLUG}' was not found.`);
  }

  const result = await ensureSpecialAccounts(org.id, DEFAULT_PASSWORD);

  console.log(
    `Bootstrapped ${result.rootUser.email} and ${result.chaUser.email} in organisation ${org.name}.`,
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

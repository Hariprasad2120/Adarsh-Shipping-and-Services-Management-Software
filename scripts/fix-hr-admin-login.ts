import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const TARGET_EMAIL = "hr@adarshshipping.in";
const WRONG_EMAIL = "hr@adarashshipping.in";
const NEW_PASSWORD = "password123";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
} as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  const user =
    await db.user.findUnique({ where: { email: WRONG_EMAIL } }) ??
    await db.user.findUnique({ where: { email: TARGET_EMAIL } });

  if (!user) {
    throw new Error(`No HR admin account found for ${WRONG_EMAIL} or ${TARGET_EMAIL}`);
  }

  const passwordHash = await hash(NEW_PASSWORD, 12);

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      email: TARGET_EMAIL,
      passwordHash,
      isPlatformAdmin: true,
      active: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      active: true,
      isPlatformAdmin: true,
    },
  });

  console.log(JSON.stringify({ ...updated, password: NEW_PASSWORD }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

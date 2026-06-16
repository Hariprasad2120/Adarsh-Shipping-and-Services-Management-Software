import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
} as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  console.log("Current system clock record:");
  const clock = await db.systemClock.findUnique({ where: { id: "global" } });
  console.log(clock);

  console.log("Resetting systemClock frozenAt to null...");
  const updated = await db.systemClock.update({
    where: { id: "global" },
    data: { frozenAt: null },
  });
  console.log("Updated clock record:", updated);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());

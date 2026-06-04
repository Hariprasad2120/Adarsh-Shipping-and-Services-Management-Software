import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) } as any);

async function main() {
  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, active: true, isPlatformAdmin: true, passwordHash: true },
  });
  console.log(JSON.stringify(users, null, 2));
}

main().finally(() => (db as any).$disconnect());

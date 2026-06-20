import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter } as any);

async function main() {
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      employeeNumber: true,
    }
  });
  console.log("Users in database:");
  console.log(users);
}

main().catch(console.error).finally(() => db.$disconnect());

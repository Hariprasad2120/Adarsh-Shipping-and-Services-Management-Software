import "dotenv/config";
import { db } from "../src/lib/db";

async function run() {
  try {
    const org = await db.organisation.findFirst();
    const user = await db.user.findFirst({
      where: { email: "hr@adarshshipping.in" }
    });
    console.log("Active Organisation:", org);
    console.log("Active Admin User:", user);
  } catch (err: any) {
    console.error("Prisma query failed:", err.message);
  } finally {
    await db.$disconnect();
  }
}

run();

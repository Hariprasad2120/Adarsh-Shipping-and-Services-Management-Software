import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  try {
    const leads = await db.crmExternalLeadSnapshot.findMany({
      take: 10,
      orderBy: { createdAt: "desc" }
    });
    console.log("LAST 10 SNAPSHOTS IN DB:");
    const allSnapshots = await db.crmExternalLeadSnapshot.findMany();
    const lead = await db.crmLead.findFirst({
      where: { mobile: "9590370419" },
      include: { crmExternalLead: true }
    });
    console.log("BALAJI LEAD:");
    console.log(JSON.stringify(lead, null, 2));
  } catch (err: any) {
    console.error("Query failed:", err);
  } finally {
    process.exit(0);
  }
}

main();

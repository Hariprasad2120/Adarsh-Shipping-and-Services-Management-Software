import "dotenv/config";
import { db } from "@/lib/db";

async function main() {
  try {
    const log = await db.crmLeadImportLog.findFirst({
      orderBy: { startedAt: 'desc' }
    });
    console.log("Latest Import Log in DB:", log);
  } catch (err: any) {
    console.error("DB check failed:", err.message);
  } finally {
    process.exit(0);
  }
}

main();

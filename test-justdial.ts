import "dotenv/config";
import { runJustdialImport } from "./src/modules/crm/justdial-import.service";
import { db } from "@/lib/db";
import { createImportLog } from "./src/modules/crm/lead-source.service";

async function main() {
  try {
    const user = await db.user.findFirst();
    if (!user) {
      console.error("No user found!");
      return;
    }
    const orgId = user.orgId;
    if (!orgId) {
      console.error("User does not have an orgId!");
      return;
    }
    const sysUserId = user.id;
    console.log(`Using user: ${user.name}, orgId: ${orgId}`);

    const log = await createImportLog(orgId);
    console.log(`Created import log with id: ${log.id}`);

    console.log("Starting import run...");
    await runJustdialImport(orgId, sysUserId, log.id);
    console.log("Import run finished successfully!");
  } catch (err) {
    console.error("Import run failed with error:", err);
  } finally {
    process.exit(0);
  }
}

main();

import "dotenv/config";
import { db } from "../src/lib/db";
import { getEmployeePrepopulatedDetails } from "../src/modules/hrms/letters-service";

async function main() {
  const user = await db.user.findFirst({
    where: { active: true }
  });
  if (!user) {
    console.log("No active user found!");
    return;
  }
  console.log("Found user:", user.name, "Org ID:", user.orgId);
  try {
    const details = await getEmployeePrepopulatedDetails(user.id, user.orgId!);
    console.log("Prepopulated details success:", Object.keys(details));
  } catch (err: any) {
    console.error("Error prepopulating details:", err.message, err.stack);
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

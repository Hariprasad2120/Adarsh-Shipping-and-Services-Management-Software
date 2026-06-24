import { db } from "../src/lib/db";

async function main() {
  const profiles = await db.jobWorkspaceProfile.findMany({
    include: {
      job: {
        select: {
          jobNumber: true,
          title: true,
          primaryOwnerId: true
        }
      }
    }
  });
  console.log("=== JOB WORKSPACE PROFILES ===");
  console.log(JSON.stringify(profiles, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

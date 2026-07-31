import { db } from "@/lib/db";

async function main() {
  const writeMode = process.argv.includes("--write");
  const jobsWithoutProfile = await db.chaJob.groupBy({
    by: ["orgId", "jobTypeId"],
    where: {
      deletedAt: null,
      customsFilingProfile: null,
    },
    _count: { _all: true },
  });

  const jobTypeIds = Array.from(new Set(jobsWithoutProfile.map((row) => row.jobTypeId)));
  const jobTypes = await db.chaJobType.findMany({
    where: { id: { in: jobTypeIds } },
    select: { id: true, name: true, movementDirection: true, filingFlowCategory: true },
  });
  const jobTypesById = new Map(jobTypes.map((jobType) => [jobType.id, jobType]));

  const reportRows = jobsWithoutProfile.map((row) => {
    const jobType = jobTypesById.get(row.jobTypeId);
    return {
      orgId: row.orgId,
      jobTypeId: row.jobTypeId,
      jobTypeName: jobType?.name ?? "(missing job type)",
      movementDirection: jobType?.movementDirection ?? null,
      filingFlowCategory: jobType?.filingFlowCategory ?? null,
      jobsWithoutProfile: row._count._all,
    };
  });

  const totalJobsWithoutProfile = reportRows.reduce(
    (total, row) => total + row.jobsWithoutProfile,
    0,
  );

  console.log("CHA customs filing profile backfill report");
  console.log(`Mode: ${writeMode ? "write requested" : "dry-run"}`);
  console.table(reportRows);
  console.log(`Total active CHA jobs without customs profile: ${totalJobsWithoutProfile}`);
  console.log("No automatic backfill is applied in Phase 3 because legacy jobs may not be customs filing workspaces.");

  if (writeMode) {
    throw new Error(
      "Write mode is intentionally unavailable for Phase 3. Add an explicit mapping before backfilling profiles.",
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });

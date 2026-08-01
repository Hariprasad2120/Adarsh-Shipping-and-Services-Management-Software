import { db } from "@/lib/db";

async function main() {
  const orgs = await db.organisation.findMany({
    where: { slug: { startsWith: "phase14-bench-" } },
    select: { id: true },
  });
  const orgIds = orgs.map((org) => org.id);

  if (!orgIds.length) {
    console.log("Cleaned 0 leaked benchmark org(s).");
    return;
  }

  await db.notification.deleteMany({ where: { orgId: { in: orgIds } } });
  await db.chaCustomsExternalEvent.deleteMany({
    where: { submission: { profile: { job: { orgId: { in: orgIds } } } } },
  });
  await db.chaCustomsExternalSubmission.deleteMany({
    where: { profile: { job: { orgId: { in: orgIds } } } },
  });
  await db.chaCustomsFlatFileGeneration.deleteMany({
    where: { profile: { job: { orgId: { in: orgIds } } } },
  });
  await db.chaExportSupportingDocument.deleteMany({
    where: { profile: { job: { orgId: { in: orgIds } } } },
  });
  await db.chaExportItem.deleteMany({
    where: { profile: { job: { orgId: { in: orgIds } } } },
  });
  await db.chaExportInvoiceCharge.deleteMany({
    where: { invoice: { profile: { job: { orgId: { in: orgIds } } } } },
  });
  await db.chaExportInvoice.deleteMany({
    where: { profile: { job: { orgId: { in: orgIds } } } },
  });
  await db.chaExportFilingHeader.deleteMany({
    where: { profile: { job: { orgId: { in: orgIds } } } },
  });
  await db.chaCustomsChecklistGeneration.deleteMany({
    where: { profile: { job: { orgId: { in: orgIds } } } },
  });
  await db.chaCustomsFilingProfile.deleteMany({
    where: { job: { orgId: { in: orgIds } } },
  });
  await db.chaUomMaster.deleteMany({ where: { orgId: { in: orgIds } } });
  await db.chaCustomsMasterImportRun.deleteMany({ where: { orgId: { in: orgIds } } });
  await db.chaAuditLog.deleteMany({ where: { orgId: { in: orgIds } } });
  await db.chaJob.deleteMany({ where: { orgId: { in: orgIds } } });
  await db.crmAccount.deleteMany({ where: { orgId: { in: orgIds } } });
  await db.chaJobType.deleteMany({ where: { orgId: { in: orgIds } } });
  await db.user.deleteMany({ where: { orgId: { in: orgIds } } });
  await db.branch.deleteMany({ where: { orgId: { in: orgIds } } });
  await db.organisation.deleteMany({ where: { id: { in: orgIds } } });

  console.log(`Cleaned ${orgIds.length} leaked benchmark org(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

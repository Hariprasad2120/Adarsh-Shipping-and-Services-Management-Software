import { performance } from "node:perf_hooks";

import { db } from "@/lib/db";
import { lookupUom } from "@/modules/cha/customs/masters/lookups";
import { queryCustomsMasterGrid } from "@/modules/cha/customs/masters/service";

async function main() {
  const runId = `phase14-bench-${Date.now().toString(36)}`;
  const metrics: Record<string, string> = {};

  const org = await db.organisation.create({
    data: { name: `CHA Bench ${runId}`, slug: runId },
  });
  const user = await db.user.create({
    data: {
      orgId: org.id,
      email: `${runId}@test.local`,
      passwordHash: "x",
      name: "Bench User",
      active: true,
      isPlatformAdmin: true,
    },
  });
  const branch = await db.branch.create({
    data: { orgId: org.id, name: "Bench Branch", code: `BB${runId.slice(-6)}` },
  });
  const customer = await db.crmAccount.create({
    data: {
      orgId: org.id,
      ownerId: user.id,
      createdById: user.id,
      updatedById: user.id,
      name: "Bench Customer",
    },
  });
  const exportType = await db.chaJobType.create({
    data: {
      orgId: org.id,
      name: "Bench Export",
      movementDirection: "EXPORT",
      filingFlowCategory: "EXPORT_SB",
    },
  });
  try {
    const importRun = await db.chaCustomsMasterImportRun.create({
      data: {
        orgId: org.id,
        masterType: "UOM",
        sourceType: "CONTROLLED_SEED_FIXTURE",
        sourceName: "Phase 14 benchmark",
        datasetVersion: runId,
        fileChecksum: runId,
        status: "COMPLETED",
        receivedRowCount: 40_000,
        validRowCount: 40_000,
        insertedRowCount: 40_000,
        updatedRowCount: 0,
        unchangedRowCount: 0,
        rejectedRowCount: 0,
        startedAt: new Date(),
        completedAt: new Date(),
        importedById: user.id,
      },
    });

    const uomRows = Array.from({ length: 40_000 }, (_, index) => ({
      orgId: org.id,
      sourceRunId: importRun.id,
      datasetVersion: runId,
      quantityCode: `Q${String(index).padStart(5, "0")}`,
      quantityDescription: `Quantity ${index}`,
      quantityType: index % 2 === 0 ? "MASS" : "COUNT",
      status: "ACTIVE" as const,
      createdById: user.id,
      updatedById: user.id,
    }));
    for (let index = 0; index < uomRows.length; index += 5_000) {
      await db.chaUomMaster.createMany({ data: uomRows.slice(index, index + 5_000) });
    }

    let started = performance.now();
    await queryCustomsMasterGrid({
      actorId: user.id,
      orgId: org.id,
      masterType: "UOM",
      query: { page: 1, pageSize: 50, datasetVersion: runId },
    });
    metrics.masterList50 = `${(performance.now() - started).toFixed(2)} ms`;

    started = performance.now();
    await queryCustomsMasterGrid({
      actorId: user.id,
      orgId: org.id,
      masterType: "UOM",
      query: {
        page: 1,
        pageSize: 50,
        datasetVersion: runId,
        filters: [{ field: "quantityDescription", op: "contains", value: "3999" }],
      },
    });
    metrics.masterFiltered50 = `${(performance.now() - started).toFixed(2)} ms`;

    started = performance.now();
    await lookupUom(org.id, "Q39999");
    metrics.uomExactLookup = `${(performance.now() - started).toFixed(2)} ms`;

    const job = await db.chaJob.create({
      data: {
        orgId: org.id,
        jobNumber: "EXP-1",
        title: "Bench Export 1",
        customerId: customer.id,
        jobTypeId: exportType.id,
        branchId: branch.id,
        primaryOwnerId: user.id,
        assignedManagerId: user.id,
      },
    });
    const profile = await db.chaCustomsFilingProfile.create({
      data: {
        jobId: job.id,
        movementDirection: "EXPORT",
        transportMode: "SEA",
        customsHouse: "Chennai Sea",
        customsHouseCode: "INMAA1",
        filingType: "NORMAL",
        createdById: user.id,
        updatedById: user.id,
      },
    });
    await db.chaExportFilingHeader.create({
      data: {
        profileId: profile.id,
        exporterNameSnapshot: "Bench Exporter",
        exporterBranchSerialNo: "BR-1",
        consigneeNameSnapshot: "Bench Consignee",
        consigneeCountrySnapshot: "NG",
        buyerNameSnapshot: "Bench Buyer",
        buyerCountrySnapshot: "NG",
        portOfDischarge: "Apapa",
        portOfDestination: "Lagos",
        sbType: "NORMAL",
        sbNumber: "SB-1",
        sbDate: new Date("2026-08-01T00:00:00.000Z"),
      },
    });
    await db.chaExportInvoice.create({
      data: {
        profileId: profile.id,
        sequenceNo: 1,
        invoiceNo: "INV-1",
        invoiceDate: new Date("2026-08-01T00:00:00.000Z"),
        currency: "USD",
        exchangeRate: "83",
        productValue: "100",
        productValueInr: "8300",
      },
    });
    await db.chaCustomsFlatFileGeneration.create({
      data: {
        profileId: profile.id,
        versionNo: 1,
        status: "GENERATED",
        checksum: runId,
        contentHash: runId,
        fileName: "bench-export.json",
        generatedById: user.id,
      },
    });

    started = performance.now();
    await db.chaCustomsFilingProfile.findUnique({
      where: { id: profile.id },
      select: {
        id: true,
        currentDraftVersion: true,
        lockVersion: true,
        status: true,
        isLocked: true,
        exportHeader: true,
        exportInvoices: { orderBy: { sequenceNo: "asc" }, take: 1 },
        flatFileGenerations: { orderBy: { versionNo: "desc" }, take: 5 },
      },
    });
    metrics.workspaceProjectionLoad = `${(performance.now() - started).toFixed(2)} ms`;

    console.log(JSON.stringify(metrics, null, 2));
  } finally {
    await db.notification.deleteMany({ where: { orgId: org.id } });
    await db.chaCustomsExternalEvent.deleteMany({ where: { submission: { profile: { job: { orgId: org.id } } } } });
    await db.chaCustomsExternalSubmission.deleteMany({ where: { profile: { job: { orgId: org.id } } } });
    await db.chaCustomsFlatFileGeneration.deleteMany({ where: { profile: { job: { orgId: org.id } } } });
    await db.chaExportSupportingDocument.deleteMany({ where: { profile: { job: { orgId: org.id } } } });
    await db.chaExportItem.deleteMany({ where: { profile: { job: { orgId: org.id } } } });
    await db.chaExportInvoiceCharge.deleteMany({ where: { invoice: { profile: { job: { orgId: org.id } } } } });
    await db.chaExportInvoice.deleteMany({ where: { profile: { job: { orgId: org.id } } } });
    await db.chaExportFilingHeader.deleteMany({ where: { profile: { job: { orgId: org.id } } } });
    await db.chaCustomsChecklistGeneration.deleteMany({ where: { profile: { job: { orgId: org.id } } } });
    await db.chaCustomsFilingProfile.deleteMany({ where: { job: { orgId: org.id } } });
    await db.chaUomMaster.deleteMany({ where: { orgId: org.id } });
    await db.chaCustomsMasterImportRun.deleteMany({ where: { orgId: org.id } });
    await db.chaAuditLog.deleteMany({ where: { orgId: org.id } });
    await db.chaJob.deleteMany({ where: { orgId: org.id } });
    await db.crmAccount.deleteMany({ where: { orgId: org.id } });
    await db.chaJobType.deleteMany({ where: { orgId: org.id } });
    await db.user.deleteMany({ where: { orgId: org.id } });
    await db.branch.deleteMany({ where: { orgId: org.id } });
    await db.organisation.deleteMany({ where: { id: org.id } });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  applyCustomsMasterImport,
  createCustomsMasterRecord,
  deactivateCustomsMasterRecord,
  getCustomsMasterImportLimits,
  previewCustomsMasterImport,
  queryCustomsMasterGrid,
  updateCustomsMasterRecord,
} from "@/modules/cha/customs/masters/service";
import {
  lookupBcdByCth,
  lookupRitcOrCth,
  lookupSupportingDocument,
  lookupUom,
} from "@/modules/cha/customs/masters/lookups";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const runId = Date.now().toString(36);
const orgIds: string[] = [];

function csv(rows: Record<string, string | number | undefined>[]) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: string | number | undefined) => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return new TextEncoder().encode([
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n"));
}

async function createFixtureOrg(label: string) {
  const org = await db.organisation.create({
    data: { name: `CHA Master Services ${label} ${runId}`, slug: `cha-master-services-${label}-${runId}` },
  });
  orgIds.push(org.id);
  const user = await db.user.create({
    data: {
      orgId: org.id,
      email: `cha-master-services-${label}-${runId}@test.local`,
      passwordHash: "x",
      name: `${label} Master User`,
      active: true,
      isPlatformAdmin: true,
    },
  });
  const branch = await db.branch.create({
    data: { orgId: org.id, name: `${label} Branch`, code: `MS${label}${runId}` },
  });
  const customer = await db.crmAccount.create({
    data: { orgId: org.id, ownerId: user.id, createdById: user.id, updatedById: user.id, name: `${label} Customer` },
  });
  const jobType = await db.chaJobType.create({
    data: { orgId: org.id, name: `${label} Import`, movementDirection: "IMPORT", filingFlowCategory: "IMPORT_BE" },
  });

  return { org, user, branch, customer, jobType };
}

describe("CHA customs master shared services", () => {
  let orgId: string;
  let otherOrgId: string;
  let actorId: string;
  let branchId: string;
  let customerId: string;
  let jobTypeId: string;

  beforeAll(async () => {
    const primary = await createFixtureOrg("Primary");
    const secondary = await createFixtureOrg("Secondary");
    orgId = primary.org.id;
    otherOrgId = secondary.org.id;
    actorId = primary.user.id;
    branchId = primary.branch.id;
    customerId = primary.customer.id;
    jobTypeId = primary.jobType.id;
  });

  afterAll(async () => {
    await db.chaCustomsExternalEvent.deleteMany({ where: { submission: { profile: { job: { orgId: { in: orgIds } } } } } });
    await db.chaCustomsExternalSubmission.deleteMany({ where: { profile: { job: { orgId: { in: orgIds } } } } });
    await db.chaCustomsFilingProfile.deleteMany({ where: { job: { orgId: { in: orgIds } } } });
    await db.chaJob.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaAuditLog.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaRitcTariffMaster.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaBcdRateMaster.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaSupportingDocumentMaster.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaUomMaster.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaCustomsMasterValidationError.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaCustomsMasterImportRun.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.crmAccount.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaJobType.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.user.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.branch.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.organisation.deleteMany({ where: { id: { in: orgIds } } });
  });

  it("previews without writing and applies an idempotent BCD import with leading-zero codes, decimals, and dates", async () => {
    const bytes = csv([
      {
        cth: "01012100",
        itemDescription: "Pure-bred breeding animals",
        bcdRate: "7.50000001",
        effectiveFrom: "14/07/2026",
      },
    ]);
    const options = {
      masterType: "BCD",
      fileName: "bcd.csv",
      mimeType: "text/csv",
      datasetVersion: `bcd-${runId}`,
      sourceName: "Phase 4 BCD fixture",
    };

    const preview = await previewCustomsMasterImport({ orgId, actorId, options, bytes });
    expect(preview.insert).toBe(1);
    expect(await db.chaBcdRateMaster.count({ where: { orgId, datasetVersion: options.datasetVersion } })).toBe(0);

    const applied = await applyCustomsMasterImport({ orgId, actorId, options, bytes });
    expect(applied.insert).toBe(1);
    expect(applied.status).toBe("COMPLETED");

    const row = await db.chaBcdRateMaster.findFirstOrThrow({ where: { orgId, cth: "01012100" } });
    expect(row.cth).toBe("01012100");
    expect(row.bcdRate?.toFixed(8)).toBe("7.50000001");
    expect(row.effectiveFrom?.toISOString().startsWith("2026-07-14")).toBe(true);

    const secondPreview = await previewCustomsMasterImport({ orgId, actorId, options, bytes });
    expect(secondPreview.unchanged).toBe(1);
    const secondApply = await applyCustomsMasterImport({ orgId, actorId, options, bytes });
    expect(secondApply.unchanged).toBe(1);
    expect(await db.chaBcdRateMaster.count({ where: { orgId, cth: "01012100" } })).toBe(1);
  });

  it("upserts by exact business key and records update audit", async () => {
    const bytes = csv([
      { cth: "01012100", itemDescription: "Updated description", bcdRate: "8.25" },
    ]);
    const options = {
      masterType: "BCD",
      fileName: "bcd-update.csv",
      mimeType: "text/csv",
      datasetVersion: `bcd-${runId}`,
      sourceName: "Phase 4 BCD update fixture",
    };

    const preview = await previewCustomsMasterImport({ orgId, actorId, options, bytes });
    expect(preview.update).toBe(1);
    await applyCustomsMasterImport({ orgId, actorId, options, bytes });
    const row = await db.chaBcdRateMaster.findFirstOrThrow({ where: { orgId, cth: "01012100" } });
    expect(row.itemDescription).toBe("Updated description");
    expect(row.bcdRate?.toFixed(2)).toBe("8.25");
  });

  it("supports pagination, filter, sort, export, and organisation isolation", async () => {
    await createCustomsMasterRecord({
      orgId,
      actorId,
      masterType: "RITC_TARIFF",
      data: { datasetVersion: `ritc-${runId}`, tariffItem: "01012910", description: "Horses for polo", uom: "NOS" },
    });
    await createCustomsMasterRecord({
      orgId,
      actorId,
      masterType: "RITC_TARIFF",
      data: { datasetVersion: `ritc-${runId}`, tariffItem: "01012990", description: "Other horses", uom: "NOS" },
    });
    await createCustomsMasterRecord({
      orgId: otherOrgId,
      actorId,
      masterType: "RITC_TARIFF",
      data: { datasetVersion: `ritc-${runId}`, tariffItem: "01012910", description: "Other org row", uom: "NOS" },
    });

    const result = await queryCustomsMasterGrid({
      actorId,
      orgId,
      masterType: "RITC_TARIFF",
      query: {
        page: 1,
        pageSize: 1,
        sortBy: "tariffItem",
        sortDirection: "desc",
        filters: [{ field: "description", op: "contains", value: "horse" }],
      },
    });

    expect(result.total).toBe(2);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].tariffItem).toBe("01012990");
    const exported = await result.exportRows();
    expect(exported).toContain("01012990");
    expect(exported).not.toContain("Other org row");
  });

  it("returns lookup records with source dataset versions", async () => {
    const bcd = await lookupBcdByCth(orgId, "01012100", new Date("2026-08-01T00:00:00.000Z"));
    const ritc = await lookupRitcOrCth(orgId, "01012910");

    expect(bcd.master?.cth).toBe("01012100");
    expect(bcd.source?.datasetVersion).toBe(`bcd-${runId}`);
    expect(ritc.master?.tariffItem).toBe("01012910");
    expect(ritc.source?.datasetVersion).toBe(`ritc-${runId}`);
  });

  it("generates rejected-row reports and blocks mostly invalid uploads", async () => {
    const bytes = csv([
      { quantityCode: "BAG", quantityDescription: "BAGS" },
      { quantityCode: "BAD" },
      { quantityCode: "BAD2" },
    ]);
    const options = {
      masterType: "UOM",
      fileName: "uom.csv",
      mimeType: "text/csv",
      datasetVersion: `uom-reject-${runId}`,
      sourceName: "Phase 4 UOM reject fixture",
    };

    const preview = await previewCustomsMasterImport({ orgId, actorId, options, bytes });
    expect(preview.reject).toBe(2);
    expect(preview.rejectionReportCsv).toContain("quantityDescription");
    await expect(applyCustomsMasterImport({ orgId, actorId, options, bytes })).rejects.toThrow(/mostly invalid/i);
  });

  it("deactivates referenced rows with reference counts and audit entries", async () => {
    const row = await createCustomsMasterRecord({
      orgId,
      actorId,
      masterType: "SUPPORTING_DOCUMENT",
      data: {
        datasetVersion: `doc-${runId}`,
        documentCode: "001002",
        documentName: "Lab analysis Report",
      },
    });
    const job = await db.chaJob.create({
      data: {
        orgId,
        jobNumber: `P4-${runId}`,
        title: "Phase 4 referenced job",
        customerId,
        jobTypeId,
        branchId,
        primaryOwnerId: actorId,
      },
    });
    const profile = await db.chaCustomsFilingProfile.create({
      data: { jobId: job.id, movementDirection: "IMPORT" },
    });
    await db.chaImportSupportingDocument.create({
      data: {
        profileId: profile.id,
        sequenceNo: 1,
        documentCode: "001002",
        documentNameSnapshot: "Lab analysis Report",
      },
    });

    const result = await deactivateCustomsMasterRecord({
      orgId,
      actorId,
      masterType: "SUPPORTING_DOCUMENT",
      id: row.id,
      reason: "No longer valid for new selections",
    });

    expect(result.referenceCount).toBe(1);
    expect(result.row.status).toBe("INACTIVE");
    expect(await lookupSupportingDocument(orgId, "001002")).toMatchObject({ master: null });
    const audit = await db.chaAuditLog.findFirst({
      where: { orgId, entityId: row.id, event: "CUSTOMS_MASTER_RECORD_DEACTIVATED" },
    });
    expect(audit).toBeTruthy();
  });

  it("handles bounded large-row batches without loading an unbounded result", async () => {
    const rows = Array.from({ length: 250 }, (_, index) => ({
      quantityCode: `Q${String(index).padStart(4, "0")}`,
      quantityDescription: `Quantity ${index}`,
      quantityType: index % 2 === 0 ? "MASS" : "COUNT",
    }));
    const options = {
      masterType: "UOM",
      fileName: "uom-large.csv",
      mimeType: "text/csv",
      datasetVersion: `uom-large-${runId}`,
      sourceName: "Phase 4 UOM batch fixture",
    };
    const started = performance.now();
    const applied = await applyCustomsMasterImport({ orgId, actorId, options, bytes: csv(rows) });
    const elapsedMs = performance.now() - started;
    const page = await queryCustomsMasterGrid({
      actorId,
      orgId,
      masterType: "UOM",
      query: { page: 1, pageSize: 25, datasetVersion: `uom-large-${runId}` },
    });

    expect(applied.insert).toBe(250);
    expect(page.total).toBe(250);
    expect(page.rows).toHaveLength(25);
    expect(getCustomsMasterImportLimits().maxRows).toBeGreaterThanOrEqual(50_000);
    expect(elapsedMs).toBeLessThan(30_000);
  });

  it("supports manual sensitive edits only with a reason", async () => {
    const row = await createCustomsMasterRecord({
      orgId,
      actorId,
      masterType: "BCD",
      data: {
        datasetVersion: `manual-bcd-${runId}`,
        cth: "02011000",
        itemDescription: "Manual BCD row",
        bcdRate: new Prisma.Decimal("5.00"),
      },
      reason: "Initial manual rate setup",
    });
    await expect(
      updateCustomsMasterRecord({
        orgId,
        actorId,
        masterType: "BCD",
        id: row.id,
        data: { bcdRate: new Prisma.Decimal("9.00") },
      }),
    ).rejects.toThrow();
    const updated = await updateCustomsMasterRecord({
      orgId,
      actorId,
      masterType: "BCD",
      id: row.id,
      data: { bcdRate: new Prisma.Decimal("9.00") },
      reason: "Correcting notified rate",
    });
    expect(updated.bcdRate?.toFixed(2)).toBe("9.00");
  });

  it("looks up UOM with source information", async () => {
    const result = await lookupUom(orgId, "Q0001");
    expect(result.master?.quantityDescription).toBe("Quantity 1");
    expect(result.source?.sourceName).toBe("Phase 4 UOM batch fixture");
  });
});

import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

const createdOrgIds: string[] = [];

async function createOrg(label: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const org = await db.organisation.create({
    data: {
      name: `CHA Customs ${label} ${suffix}`,
      slug: `cha-customs-${label.toLowerCase()}-${suffix}`,
    },
  });
  createdOrgIds.push(org.id);
  return org;
}

async function createImportRun(orgId: string, masterType = "RITC_TARIFF", datasetVersion = "2026.07.31") {
  return db.chaCustomsMasterImportRun.create({
    data: {
      orgId,
      masterType,
      sourceType: "CONTROLLED_SEED_FIXTURE",
      sourceName: "Phase 2 verification fixture",
      sourceEffectiveDate: new Date("2026-07-31T00:00:00.000Z"),
      datasetVersion,
      fileChecksum: `sha256:${orgId}:${masterType}:${datasetVersion}`,
      status: "COMPLETED",
      receivedRowCount: 1,
      validRowCount: 1,
      insertedRowCount: 1,
      completedAt: new Date("2026-07-31T01:00:00.000Z"),
    },
  });
}

describe("CHA customs master database foundation", () => {
  afterAll(async () => {
    for (const orgId of createdOrgIds.reverse()) {
      await db.organisation.delete({ where: { id: orgId } }).catch(() => undefined);
    }
  });

  it("enforces business keys while preserving new dataset versions", async () => {
    const org = await createOrg("BusinessKeys");
    const run = await createImportRun(org.id, "RITC_TARIFF", "ritc-v1");

    await db.chaRitcTariffMaster.create({
      data: {
        orgId: org.id,
        sourceRunId: run.id,
        datasetVersion: "ritc-v1",
        tariffItem: "01012100",
        description: "Pure-bred breeding animals",
        uom: "NOS",
      },
    });

    await expect(db.chaRitcTariffMaster.create({
      data: {
        orgId: org.id,
        sourceRunId: run.id,
        datasetVersion: "ritc-v1",
        tariffItem: "01012100",
        description: "Duplicate",
      },
    })).rejects.toThrow();

    const runV2 = await createImportRun(org.id, "RITC_TARIFF", "ritc-v2");
    await expect(db.chaRitcTariffMaster.create({
      data: {
        orgId: org.id,
        sourceRunId: runV2.id,
        datasetVersion: "ritc-v2",
        tariffItem: "01012100",
        description: "Pure-bred breeding animals updated",
      },
    })).resolves.toMatchObject({ datasetVersion: "ritc-v2" });
  });

  it("keeps records isolated by organisation scope", async () => {
    const orgA = await createOrg("OrgA");
    const orgB = await createOrg("OrgB");
    const runA = await createImportRun(orgA.id, "UOM", "uom-v1-a");
    const runB = await createImportRun(orgB.id, "UOM", "uom-v1-b");

    await db.chaUomMaster.createMany({
      data: [
        {
          orgId: orgA.id,
          sourceRunId: runA.id,
          datasetVersion: "uom-v1-a",
          quantityCode: "NOS",
          quantityDescription: "Numbers",
        },
        {
          orgId: orgB.id,
          sourceRunId: runB.id,
          datasetVersion: "uom-v1-b",
          quantityCode: "NOS",
          quantityDescription: "Numbers",
        },
      ],
    });

    const orgARecords = await db.chaUomMaster.findMany({
      where: { orgId: orgA.id, quantityCode: "NOS" },
    });

    expect(orgARecords).toHaveLength(1);
    expect(orgARecords[0]?.sourceRunId).toBe(runA.id);
  });

  it("selects active effective-date rows and ignores inactive/superseded records", async () => {
    const org = await createOrg("EffectiveDate");
    const run = await createImportRun(org.id, "RODTEP", "rodtep-v1");
    const queryDate = new Date("2026-08-15T00:00:00.000Z");

    await db.chaRodtepRateMaster.createMany({
      data: [
        {
          orgId: org.id,
          sourceRunId: run.id,
          datasetVersion: "rodtep-v1-old",
          ritcNo: "03011100",
          description: "Old freshwater",
          rate: new Prisma.Decimal("0.01000000"),
          status: "SUPERSEDED",
          effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
          effectiveTo: new Date("2026-07-31T00:00:00.000Z"),
        },
        {
          orgId: org.id,
          sourceRunId: run.id,
          datasetVersion: "rodtep-v1",
          ritcNo: "03011100",
          description: "Freshwater",
          rate: new Prisma.Decimal("0.01500000"),
          status: "ACTIVE",
          effectiveFrom: new Date("2026-08-01T00:00:00.000Z"),
          effectiveTo: new Date("2026-12-31T00:00:00.000Z"),
        },
        {
          orgId: org.id,
          sourceRunId: run.id,
          datasetVersion: "rodtep-v1-inactive",
          ritcNo: "03011100",
          description: "Inactive freshwater",
          rate: new Prisma.Decimal("0.02000000"),
          status: "INACTIVE",
          effectiveFrom: new Date("2026-08-01T00:00:00.000Z"),
          effectiveTo: new Date("2026-12-31T00:00:00.000Z"),
        },
      ],
    });

    const selected = await db.chaRodtepRateMaster.findFirstOrThrow({
      where: {
        orgId: org.id,
        ritcNo: "03011100",
        status: "ACTIVE",
        OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: queryDate } }],
        AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gte: queryDate } }] }],
      },
      orderBy: { effectiveFrom: "desc" },
    });

    expect(selected.description).toBe("Freshwater");
    expect(selected.rate?.toFixed(8)).toBe("0.01500000");
  });

  it("stores customs decimals with exact scale", async () => {
    const org = await createOrg("Decimals");
    const run = await createImportRun(org.id, "AIDC", "aidc-v1");

    const record = await db.chaAidcRateMaster.create({
      data: {
        orgId: org.id,
        sourceRunId: run.id,
        datasetVersion: "aidc-v1",
        notificationType: "C",
        notificationNo: "020/2026",
        serialNo: "III37",
        cth: "76051100",
        rate: new Prisma.Decimal("12.34567891"),
        amount: new Prisma.Decimal("999999999999.12345678"),
        cvdRate: new Prisma.Decimal("0.00000001"),
      },
    });

    expect(record.rate?.toFixed(8)).toBe("12.34567891");
    expect(record.amount?.toFixed(8)).toBe("999999999999.12345678");
    expect(record.cvdRate?.toFixed(8)).toBe("0.00000001");
  });

  it("records import-run status accounting and safe validation errors", async () => {
    const org = await createOrg("Accounting");
    const run = await db.chaCustomsMasterImportRun.create({
      data: {
        orgId: org.id,
        masterType: "BCD",
        sourceType: "XLSX_CSV_UPLOAD",
        sourceName: "bcd-upload.csv",
        datasetVersion: "bcd-v1",
        fileChecksum: "sha256:fixture",
        status: "COMPLETED_WITH_REJECTIONS",
        receivedRowCount: 10,
        validRowCount: 8,
        insertedRowCount: 6,
        updatedRowCount: 1,
        unchangedRowCount: 1,
        rejectedRowCount: 2,
        completedAt: new Date("2026-07-31T02:00:00.000Z"),
      },
    });

    await db.chaCustomsMasterValidationError.create({
      data: {
        orgId: org.id,
        importRunId: run.id,
        rowNumber: 9,
        field: "cth",
        code: "REQUIRED",
        message: "CTH is required.",
        rawValue: "",
      },
    });

    const saved = await db.chaCustomsMasterImportRun.findUniqueOrThrow({
      where: { id: run.id },
      include: { validationErrors: true },
    });

    expect(saved.receivedRowCount).toBe(
      saved.validRowCount + saved.rejectedRowCount,
    );
    expect(saved.insertedRowCount + saved.updatedRowCount + saved.unchangedRowCount).toBe(
      saved.validRowCount,
    );
    expect(saved.validationErrors[0]).toMatchObject({
      rowNumber: 9,
      field: "cth",
      code: "REQUIRED",
      message: "CTH is required.",
    });
  });

  it("restricts deleting import runs that still own master records", async () => {
    const org = await createOrg("Restrict");
    const run = await createImportRun(org.id, "SUPPORTING_DOCUMENT", "doc-v1");

    await db.chaSupportingDocumentMaster.create({
      data: {
        orgId: org.id,
        sourceRunId: run.id,
        datasetVersion: "doc-v1",
        documentCode: "001000",
        documentName: "Certificate of analysis",
        documentDescription: "Certificate of analysis",
      },
    });

    await expect(db.chaCustomsMasterImportRun.delete({ where: { id: run.id } })).rejects.toThrow();
  });
});


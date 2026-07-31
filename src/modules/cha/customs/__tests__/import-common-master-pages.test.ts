import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  activateCustomsMasterRecord,
  createCustomsMasterRecord,
  deactivateCustomsMasterRecord,
  queryCustomsMasterGrid,
} from "../masters/service";
import {
  lookupAidcByCth,
  lookupBcdByCth,
  lookupByMasterKey,
  lookupNotification,
  lookupSingleWindowAgency,
  lookupSupportingDocument,
  lookupUom,
} from "../masters/lookups";
import {
  CUSTOMS_MASTER_PAGE_CONFIGS,
  IMPORT_SINGLE_WINDOW_COMMON_CUSTOMS_MASTER_KEYS,
} from "../masters/page-config";
import { describe, expect, it, beforeAll, afterAll } from "vitest";

describe("Phase 8 import, single-window, and common customs master pages", () => {
  const runId = Date.now().toString(36);
  const orgIds: string[] = [];
  let orgId: string;
  let otherOrgId: string;
  let actorId: string;

  beforeAll(async () => {
    const primary = await createOrg("primary", runId);
    const secondary = await createOrg("secondary", runId);
    orgId = primary.orgId;
    otherOrgId = secondary.orgId;
    actorId = primary.actorId;
  });

  afterAll(async () => {
    await db.chaAuditLog.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaSingleWindowCthMaster.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaAidcRateMaster.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaBcdRateMaster.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaCustomsNotificationMaster.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaSupportingDocumentMaster.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaUomMaster.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaCustomsMasterImportRun.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.user.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.organisation.deleteMany({ where: { id: { in: orgIds } } });
  });

  it("adds the six Phase 8 master pages with all screenshot fields and Monolith compatibility", () => {
    expect(IMPORT_SINGLE_WINDOW_COMMON_CUSTOMS_MASTER_KEYS).toEqual([
      "SINGLE_WINDOW_CTH",
      "AIDC",
      "BCD",
      "MASTER_NOTIFICATION",
      "SUPPORTING_DOCUMENT",
      "UOM",
    ]);
    expect(CUSTOMS_MASTER_PAGE_CONFIGS.SINGLE_WINDOW_CTH.slug).toBe("sw-cth");
    expect(CUSTOMS_MASTER_PAGE_CONFIGS.AIDC.fields.map((field) => field.key)).toEqual(expect.arrayContaining([
      "notificationType",
      "notificationNo",
      "notificationDate",
      "serialNo",
      "cth",
      "rate",
      "amount",
      "uqc",
      "flag",
      "condition",
      "cvdRate",
      "cvdAmount",
      "cvdUqc",
      "cvdFlag",
      "adFlag",
      "itemDescription",
    ]));
    expect(CUSTOMS_MASTER_PAGE_CONFIGS.MASTER_NOTIFICATION.fields.map((field) => field.key)).toEqual(expect.arrayContaining([
      "notificationNo",
      "subSerialNo",
      "amendNotification",
      "amendYear",
      "amendSerialNo",
      "preferentialDutyFlag",
      "effectiveFrom",
      "effectiveTo",
    ]));
  });

  it("supports validity-date lookup, amendment chains, preferential BCD, decimals, and tenant isolation", async () => {
    await seedPhase8Masters(orgId, otherOrgId, actorId, runId);

    const sw = await lookupSingleWindowAgency(orgId, "01012100", new Date("2026-07-31T00:00:00.000Z"));
    expect(sw).toHaveLength(1);
    expect(sw[0].master?.agencyCode).toBe("AQCS");

    const aidc = await lookupAidcByCth(orgId, "76051100", new Date("2026-07-31T00:00:00.000Z"));
    expect(aidc.master?.rate?.toFixed(8)).toBe("20.12345678");
    expect(aidc.master?.cvdRate?.toFixed(8)).toBe("1.25000000");
    expect(aidc.source?.datasetVersion).toBe(`aidc-${runId}`);

    const bcd = await lookupBcdByCth(orgId, "85079020", new Date("2026-07-31T00:00:00.000Z"));
    expect(bcd.master?.cth).toBe("85079020");
    expect(bcd.master?.preferential).toBe("Y");
    expect(bcd.master?.pRate?.toFixed(8)).toBe("2.75000000");

    const notification = await lookupNotification(orgId, "152/2009", "290", "A", new Date("2026-07-31T00:00:00.000Z"));
    expect(notification.master?.notificationNo).toBe("152/2009");
    expect(notification.master?.subSerialNo).toBe("A");
    expect(notification.master?.amendNotification).toBe("074/2005");

    const otherOrgBcd = await lookupBcdByCth(otherOrgId, "85079020", new Date("2026-07-31T00:00:00.000Z"));
    expect(otherOrgBcd.master?.itemDescription).toBe("Other tenant BCD");
  });

  it("preserves UOM/supporting-document lookup compatibility for import consumers", async () => {
    const uom = await lookupUom(orgId, "BAG", new Date("2026-07-31T00:00:00.000Z"));
    const doc = await lookupSupportingDocument(orgId, "001002", new Date("2026-07-31T00:00:00.000Z"));
    const genericUom = await lookupByMasterKey(orgId, "UOM", "BAG", new Date("2026-07-31T00:00:00.000Z"));
    const genericDoc = await lookupByMasterKey(orgId, "SUPPORTING_DOCUMENT", "001002", new Date("2026-07-31T00:00:00.000Z"));

    expect(uom.master?.quantityDescription).toBe("BAGS");
    expect(doc.master?.documentName).toBe("Lab analysis Report");
    expect(genericUom).toMatchObject({ master: expect.objectContaining({ quantityCode: "BAG" }) });
    expect(genericDoc).toMatchObject({ master: expect.objectContaining({ documentCode: "001002" }) });
  });

  it("uses bounded server-side query behavior for large import master datasets", async () => {
    const page = await queryCustomsMasterGrid({
      orgId,
      actorId,
      masterType: "BCD",
      query: { page: 1, pageSize: 1, globalSearch: "Battery", sortBy: "cth", sortDirection: "asc" },
    });
    expect(page.rows).toHaveLength(1);
    expect(page.total).toBe(1);

    const serviceSource = readFileSync(join(process.cwd(), "src/modules/cha/customs/masters/service.ts"), "utf8");
    const schemaSource = readFileSync(join(process.cwd(), "src/modules/cha/customs/masters/schemas.ts"), "utf8");
    expect(serviceSource).toContain("take: query.pageSize");
    expect(serviceSource).toContain("skip: (query.page - 1) * query.pageSize");
    expect(schemaSource).toContain("MASTER_IMPORT_MAX_ROWS = 50_000");
    expect(serviceSource).toContain("referenceCount");
  });

  it("supports active/inactive master behavior without destructive delete", async () => {
    const row = await createCustomsMasterRecord({
      orgId,
      actorId,
      masterType: "UOM",
      data: {
        datasetVersion: `uom-toggle-${runId}`,
        quantityCode: "CAS",
        quantityDescription: "CASE",
      },
    });
    const deactivated = await deactivateCustomsMasterRecord({
      orgId,
      actorId,
      masterType: "UOM",
      id: row.id,
      reason: "Phase 8 deactivate UOM",
    });
    expect(deactivated.row.status).toBe("INACTIVE");
    expect(deactivated.referenceCount).toBe(0);

    const active = await activateCustomsMasterRecord({
      orgId,
      actorId,
      masterType: "UOM",
      id: row.id,
      reason: "Phase 8 activate UOM",
    });
    expect(active.status).toBe("ACTIVE");
  });

  async function createOrg(label: string, suffix: string) {
    const org = await db.organisation.create({
      data: { name: `Phase 8 ${label} ${suffix}`, slug: `phase-8-${label}-${suffix}` },
    });
    orgIds.push(org.id);
    const user = await db.user.create({
      data: {
        orgId: org.id,
        email: `phase-8-${label}-${suffix}@test.local`,
        passwordHash: "x",
        name: `Phase 8 ${label}`,
        active: true,
        isPlatformAdmin: true,
      },
    });
    return { orgId: org.id, actorId: user.id };
  }
});

async function seedPhase8Masters(orgId: string, otherOrgId: string, actorId: string, runId: string) {
  await createCustomsMasterRecord({
    orgId,
    actorId,
    masterType: "SINGLE_WINDOW_CTH",
    data: {
      datasetVersion: `sw-${runId}`,
      fromCth: "01012100",
      toCth: "01012990",
      agencyName: "Animal Quarantine",
      agencyCode: "AQCS",
      effectiveFrom: new Date("2026-07-01T00:00:00.000Z"),
      effectiveTo: new Date("2026-12-31T00:00:00.000Z"),
      remarks: "Phase 8 fixture",
    },
  });
  await createCustomsMasterRecord({
    orgId,
    actorId,
    masterType: "AIDC",
    reason: "Phase 8 AIDC fixture",
    data: {
      datasetVersion: `aidc-${runId}`,
      notificationType: "C",
      notificationNo: "020/2026",
      notificationDate: new Date("2026-07-14T00:00:00.000Z"),
      serialNo: "III37",
      cth: "76051100",
      itemDescription: "All goods",
      rate: new Prisma.Decimal("20.12345678"),
      amount: new Prisma.Decimal("0"),
      uqc: "KGS",
      flag: "A",
      condition: "Standard rate",
      cvdRate: new Prisma.Decimal("1.25"),
      cvdAmount: new Prisma.Decimal("2.5"),
      cvdUqc: "KGS",
      cvdFlag: "C",
      adFlag: "A",
    },
  });
  await createCustomsMasterRecord({
    orgId,
    actorId,
    masterType: "BCD",
    reason: "Phase 8 BCD fixture",
    data: {
      datasetVersion: `bcd-${runId}`,
      cth: "85079020",
      itemDescription: "Battery separators",
      bcdFlag: "S",
      bcdRate: new Prisma.Decimal("5.00000000"),
      amount: new Prisma.Decimal("0"),
      uqc: "NOS",
      preferential: "Y",
      pFlag: "P",
      pRate: new Prisma.Decimal("2.75"),
      pAmount: new Prisma.Decimal("1.25"),
      pUqc: "NOS",
      sUqc: "NOS",
    },
  });
  await createCustomsMasterRecord({
    orgId: otherOrgId,
    actorId,
    masterType: "BCD",
    reason: "Phase 8 other tenant BCD fixture",
    data: {
      datasetVersion: `bcd-${runId}`,
      cth: "85079020",
      itemDescription: "Other tenant BCD",
      bcdRate: new Prisma.Decimal("10"),
    },
  });
  await createCustomsMasterRecord({
    orgId,
    actorId,
    masterType: "MASTER_NOTIFICATION",
    reason: "Phase 8 notification fixture",
    data: {
      datasetVersion: `notn-${runId}`,
      notificationNo: "152/2009",
      notificationType: "C",
      notificationDate: new Date("2017-01-01T00:00:00.000Z"),
      serialNo: "290",
      subSerialNo: "A",
      cth: "85079020",
      itemDescription: "All goods",
      rate: new Prisma.Decimal("5"),
      amount: new Prisma.Decimal("0"),
      amendNotification: "074/2005",
      amendYear: "2026",
      amendSerialNo: "168",
      preferentialDutyFlag: "Y",
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    },
  });
  await createCustomsMasterRecord({
    orgId,
    actorId,
    masterType: "SUPPORTING_DOCUMENT",
    data: {
      datasetVersion: `doc-${runId}`,
      documentCode: "001002",
      documentName: "Lab analysis Report",
      invoiceSerialNo: 0,
      itemSerialNo: 0,
      documentDescription: "Lab analysis Report",
    },
  });
  await createCustomsMasterRecord({
    orgId,
    actorId,
    masterType: "UOM",
    data: {
      datasetVersion: `uom-${runId}`,
      quantityCode: "BAG",
      quantityDescription: "BAGS",
      quantityType: "MASS",
    },
  });
}

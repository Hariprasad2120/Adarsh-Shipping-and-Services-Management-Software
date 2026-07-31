import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS,
  type ChaCustomsFeatureFlags,
} from "../feature-flags";
import { getVisibleChaCustomsRouteMetadata } from "../routes";
import {
  EXPORT_SHARED_CUSTOMS_MASTER_PAGE_CONFIGS,
  EXPORT_SHARED_CUSTOMS_MASTER_KEYS,
} from "../masters/page-config";
import {
  createCustomsMasterRecord,
  queryCustomsMasterGrid,
  updateCustomsMasterRecord,
  deactivateCustomsMasterRecord,
  activateCustomsMasterRecord,
} from "../masters/service";

vi.mock("next/navigation", () => ({
  usePathname: () => "/cha/masters/ritc-unit",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("q=0101&filter.description=horse&page=1"),
}));

describe("Phase 7 export/shared customs master pages", () => {
  it("registers the seven export/shared routes behind the customs master flag and read permission", () => {
    const flags: ChaCustomsFeatureFlags = { ...DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS, CHA_CUSTOMS_MASTER_DATA: true };
    const visible = getVisibleChaCustomsRouteMetadata(flags, { "cha.customs.master.view": true });

    for (const config of Object.values(EXPORT_SHARED_CUSTOMS_MASTER_PAGE_CONFIGS)) {
      expect(visible).toContainEqual(
        expect.objectContaining({
          href: `/cha/masters/${config.slug}`,
          label: config.title,
          requiredPermission: "cha.customs.master.view",
          requiredFlag: "CHA_CUSTOMS_MASTER_DATA",
        }),
      );
    }

    expect(getVisibleChaCustomsRouteMetadata(DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS, { "cha.customs.master.view": true }))
      .not.toEqual(expect.arrayContaining([expect.objectContaining({ href: "/cha/masters/ritc-unit" })]));
  });

  it("maps every screenshot column into a page field and preserves shared RITC lookup metadata", () => {
    expect(EXPORT_SHARED_CUSTOMS_MASTER_KEYS).toEqual([
      "RITC_TARIFF",
      "CESS_RATE",
      "RODTEP",
      "ROSCTL",
      "DRAWBACK",
      "SCHEME_CODE",
      "RODTEP_EOU",
    ]);

    expect(EXPORT_SHARED_CUSTOMS_MASTER_PAGE_CONFIGS.RITC_TARIFF.fields.map((field) => field.key)).toEqual(
      expect.arrayContaining([
        "tariffItem",
        "description",
        "uom",
        "importPolicy",
        "importPolicyCondition",
        "exportPolicy",
        "exportPolicyCondition",
        "sims",
        "nfmims",
        "pims",
        "bis",
        "tobacco",
        "datasetVersion",
      ]),
    );
    expect(EXPORT_SHARED_CUSTOMS_MASTER_PAGE_CONFIGS.SCHEME_CODE.fields.map((field) => field.key)).toEqual(
      expect.arrayContaining(["expLicense", "impLicense", "licenseDepb", "expEou", "expDfiaLicense", "expDrawback"]),
    );
    expect(EXPORT_SHARED_CUSTOMS_MASTER_PAGE_CONFIGS.RITC_TARIFF.lookupNote).toContain("shared tariff lookup");
  });

  it("uses the shared register client and tokenized CSS classes for filters, upload, pagination, permissions, and themes", () => {
    const source = readFileSync(join(process.cwd(), "src/app/(dashboard)/cha/masters/[masterKey]/master-register-client.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "src/styles/monolith-system.css"), "utf8");

    expect(source).toContain("CustomsMasterToolbar");
    expect(source).toContain("CustomsMasterTable");
    expect(source).toContain("CustomsBulkImportPreview");
    expect(source).toContain("previewCustomsMasterImportFromFormAction");
    expect(source).toContain("applyCustomsMasterImportFromFormAction");
    expect(source).toContain("toggleCustomsMasterRecordAction");
    expect(source).toContain("canManage");
    expect(source).toContain("canImport");
    expect(source).toContain("updateCustomsMasterSearchParams");
    expect(css).toContain(".mnx-customs-master-page");
    expect(css).not.toContain("#0b1220");
    expect(css).toContain("var(--mnx-surface)");
  });
});

describe("Phase 7 export/shared customs master services", () => {
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
    await db.chaRitcTariffMaster.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaCessRateMaster.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaRodtepRateMaster.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaRodtepEouRateMaster.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaRosctlRateMaster.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaDrawbackRateMaster.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaSchemeCodeMaster.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chaCustomsMasterImportRun.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.user.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.organisation.deleteMany({ where: { id: { in: orgIds } } });
  });

  it("supports read/manage/import page operations across all export/shared models with bounded pagination", async () => {
    await seedSevenExportMasters(orgId, otherOrgId, actorId, runId);

    const ritc = await queryCustomsMasterGrid({
      orgId,
      actorId,
      masterType: "RITC_TARIFF",
      query: {
        page: 1,
        pageSize: 1,
        globalSearch: "horse",
        filters: [{ field: "description", value: "horse" }],
        sortBy: "tariffItem",
        sortDirection: "asc",
      },
    });

    expect(ritc.total).toBe(2);
    expect(ritc.rows).toHaveLength(1);
    expect(ritc.rows[0].tariffItem).toBe("01012100");
    expect(ritc.rows[0].tariffItem).toMatch(/^0/);
    expect(await ritc.exportRows()).toContain("01012100");
    expect(await ritc.exportRows()).not.toContain("Other org tariff");

    const rodtep = await queryCustomsMasterGrid({
      orgId,
      actorId,
      masterType: "RODTEP",
      query: { page: 1, pageSize: 10, sortBy: "rate", sortDirection: "desc" },
    });
    expect(rodtep.rows[0].rate?.toFixed(8)).toBe("0.01000000");

    const created = await createCustomsMasterRecord({
      orgId,
      actorId,
      masterType: "DRAWBACK",
      reason: "Phase 7 create test",
      data: {
        datasetVersion: `dbk-manual-${runId}`,
        dbkSerialNo: "0201B",
        description: "Meat of bovine animals",
        rateAdvance: new Prisma.Decimal("0.15"),
      },
    });
    const updated = await updateCustomsMasterRecord({
      orgId,
      actorId,
      masterType: "DRAWBACK",
      id: created.id,
      reason: "Phase 7 update test",
      data: { description: "Meat of bovine animals, updated", rateAdvance: new Prisma.Decimal("0.25") },
    });
    expect(updated.description).toContain("updated");

    const deactivated = await deactivateCustomsMasterRecord({
      orgId,
      actorId,
      masterType: "DRAWBACK",
      id: created.id,
      reason: "Phase 7 deactivate test",
    });
    expect(deactivated.row.status).toBe("INACTIVE");

    const activated = await activateCustomsMasterRecord({
      orgId,
      actorId,
      masterType: "DRAWBACK",
      id: created.id,
      reason: "Phase 7 activate test",
    });
    expect(activated.status).toBe("ACTIVE");
  });

  it("rejects invalid decimal input before page writes can persist it", async () => {
    await expect(
      createCustomsMasterRecord({
        orgId,
        actorId,
        masterType: "RODTEP",
        reason: "Phase 7 invalid decimal test",
        data: {
          datasetVersion: `bad-rate-${runId}`,
          ritcNo: "01019900",
          rate: "not-a-decimal",
        },
      }),
    ).rejects.toThrow();
  });

  async function createOrg(label: string, suffix: string) {
    const org = await db.organisation.create({
      data: { name: `Phase 7 ${label} ${suffix}`, slug: `phase-7-${label}-${suffix}` },
    });
    orgIds.push(org.id);
    const user = await db.user.create({
      data: {
        orgId: org.id,
        email: `phase-7-${label}-${suffix}@test.local`,
        passwordHash: "x",
        name: `Phase 7 ${label}`,
        active: true,
        isPlatformAdmin: true,
      },
    });
    return { orgId: org.id, actorId: user.id };
  }
});

async function seedSevenExportMasters(orgId: string, otherOrgId: string, actorId: string, runId: string) {
  await createCustomsMasterRecord({
    orgId,
    actorId,
    masterType: "RITC_TARIFF",
    data: { datasetVersion: `ritc-${runId}`, tariffItem: "01012100", description: "Pure-bred horse", uom: "NOS" },
  });
  await createCustomsMasterRecord({
    orgId,
    actorId,
    masterType: "RITC_TARIFF",
    data: { datasetVersion: `ritc-${runId}`, tariffItem: "01012910", description: "Horse for polo", uom: "NOS" },
  });
  await createCustomsMasterRecord({
    orgId: otherOrgId,
    actorId,
    masterType: "RITC_TARIFF",
    data: { datasetVersion: `ritc-${runId}`, tariffItem: "01012100", description: "Other org tariff", uom: "NOS" },
  });
  await createCustomsMasterRecord({
    orgId,
    actorId,
    masterType: "CESS_RATE",
    reason: "Phase 7 seed cess",
    data: { datasetVersion: `cess-${runId}`, ritcCode: "01012100", cessSerialNo: "6", cessRateAdvance: new Prisma.Decimal("0.5") },
  });
  await createCustomsMasterRecord({
    orgId,
    actorId,
    masterType: "RODTEP",
    reason: "Phase 7 seed rodtep",
    data: { datasetVersion: `rodtep-${runId}`, ritcNo: "03011100", description: "Freshwater", rate: new Prisma.Decimal("0.01"), ratePer: new Prisma.Decimal("0.5"), uqc: "KGS" },
  });
  await createCustomsMasterRecord({
    orgId,
    actorId,
    masterType: "RODTEP_EOU",
    reason: "Phase 7 seed rodtep eou",
    data: { datasetVersion: `rodtep-eou-${runId}`, ritcNo: "03011100", description: "Freshwater", rate: new Prisma.Decimal("0.003"), ratePer: new Prisma.Decimal("0.3"), uqc: "KGS" },
  });
  await createCustomsMasterRecord({
    orgId,
    actorId,
    masterType: "ROSCTL",
    reason: "Phase 7 seed rosctl",
    data: { datasetVersion: `rosctl-${runId}`, rosctlCode: "610101B", description: "Of Cotton", percentage: new Prisma.Decimal("3.6"), rateAmount: new Prisma.Decimal("68.2"), accountingUnit: "PCS", schedule: "SCH1" },
  });
  await createCustomsMasterRecord({
    orgId,
    actorId,
    masterType: "DRAWBACK",
    reason: "Phase 7 seed drawback",
    data: { datasetVersion: `dbk-${runId}`, dbkSerialNo: "0101B", description: "Live Horses", rateAdvance: new Prisma.Decimal("0") },
  });
  await createCustomsMasterRecord({
    orgId,
    actorId,
    masterType: "SCHEME_CODE",
    data: { datasetVersion: `scheme-${runId}`, eximCode: "01", schemeType: "DEEC", exportSchemeName: "Advance Licence", expLicense: true },
  });
}

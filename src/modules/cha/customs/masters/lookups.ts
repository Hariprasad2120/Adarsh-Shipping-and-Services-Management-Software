import { db } from "@/lib/db";
import { type CustomsMasterKey, getCustomsMasterDefinition } from "./definitions";

type LookupResult<T> = {
  master: T | null;
  source: {
    datasetVersion: string;
    sourceName: string;
    sourceReference: string | null;
    sourceEffectiveDate: Date | null;
  } | null;
};

function validityWhere(validOn?: Date) {
  if (!validOn) return {};
  return {
    AND: [
      { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: validOn } }] },
      { OR: [{ effectiveTo: null }, { effectiveTo: { gte: validOn } }] },
    ],
  };
}

function withSource<T extends { sourceRun?: { datasetVersion: string; sourceName: string; sourceReference: string | null; sourceEffectiveDate: Date | null } | null }>(
  row: T | null,
): LookupResult<Omit<T, "sourceRun">> {
  if (!row) return { master: null, source: null };
  const { sourceRun, ...master } = row;
  return {
    master,
    source: sourceRun
      ? {
          datasetVersion: sourceRun.datasetVersion,
          sourceName: sourceRun.sourceName,
          sourceReference: sourceRun.sourceReference,
          sourceEffectiveDate: sourceRun.sourceEffectiveDate,
        }
      : null,
  };
}

export async function lookupRitcOrCth(orgId: string, code: string, validOn = new Date()) {
  const row = await db.chaRitcTariffMaster.findFirst({
    where: { orgId, tariffItem: code, status: "ACTIVE", ...validityWhere(validOn) },
    include: { sourceRun: true },
    orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
  });
  return withSource(row);
}

export async function lookupUom(orgId: string, quantityCode: string, validOn = new Date()) {
  return withSource(await db.chaUomMaster.findFirst({
    where: { orgId, quantityCode, status: "ACTIVE", ...validityWhere(validOn) },
    include: { sourceRun: true },
    orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
  }));
}

export async function lookupSupportingDocument(orgId: string, documentCode: string, validOn = new Date()) {
  return withSource(await db.chaSupportingDocumentMaster.findFirst({
    where: { orgId, documentCode, status: "ACTIVE", ...validityWhere(validOn) },
    include: { sourceRun: true },
    orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
  }));
}

export async function lookupNotification(orgId: string, notificationNo: string, serialNo: string, subSerialNo = "", validOn = new Date()) {
  return withSource(await db.chaCustomsNotificationMaster.findFirst({
    where: { orgId, notificationNo, serialNo, subSerialNo, status: "ACTIVE", ...validityWhere(validOn) },
    include: { sourceRun: true },
    orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
  }));
}

export async function lookupBcdByCth(orgId: string, cth: string, validOn = new Date()) {
  return withSource(await db.chaBcdRateMaster.findFirst({
    where: { orgId, cth, status: "ACTIVE", ...validityWhere(validOn) },
    include: { sourceRun: true },
    orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
  }));
}

export async function lookupAidcByCth(orgId: string, cth: string, validOn = new Date()) {
  return withSource(await db.chaAidcRateMaster.findFirst({
    where: { orgId, cth, status: "ACTIVE", ...validityWhere(validOn) },
    include: { sourceRun: true },
    orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
  }));
}

export async function lookupCessByRitc(orgId: string, ritcCode: string, validOn = new Date()) {
  return withSource(await db.chaCessRateMaster.findFirst({
    where: { orgId, ritcCode, status: "ACTIVE", ...validityWhere(validOn) },
    include: { sourceRun: true },
    orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
  }));
}

export async function lookupScheme(orgId: string, eximCode: string, validOn = new Date()) {
  return withSource(await db.chaSchemeCodeMaster.findFirst({
    where: { orgId, eximCode, status: "ACTIVE", ...validityWhere(validOn) },
    include: { sourceRun: true },
    orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
  }));
}

export async function lookupDrawback(orgId: string, dbkSerialNo: string, validOn = new Date()) {
  return withSource(await db.chaDrawbackRateMaster.findFirst({
    where: { orgId, dbkSerialNo, status: "ACTIVE", ...validityWhere(validOn) },
    include: { sourceRun: true },
    orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
  }));
}

export async function lookupRodtep(orgId: string, ritcNo: string, validOn = new Date()) {
  return withSource(await db.chaRodtepRateMaster.findFirst({
    where: { orgId, ritcNo, status: "ACTIVE", ...validityWhere(validOn) },
    include: { sourceRun: true },
    orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
  }));
}

export async function lookupRodtepEou(orgId: string, ritcNo: string, validOn = new Date()) {
  return withSource(await db.chaRodtepEouRateMaster.findFirst({
    where: { orgId, ritcNo, status: "ACTIVE", ...validityWhere(validOn) },
    include: { sourceRun: true },
    orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
  }));
}

export async function lookupRosctl(orgId: string, rosctlCode: string, validOn = new Date()) {
  return withSource(await db.chaRosctlRateMaster.findFirst({
    where: { orgId, rosctlCode, status: "ACTIVE", ...validityWhere(validOn) },
    include: { sourceRun: true },
    orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
  }));
}

export async function lookupSingleWindowAgency(orgId: string, fromCth: string, validOn = new Date()) {
  const rows = await db.chaSingleWindowCthMaster.findMany({
    where: { orgId, fromCth, status: "ACTIVE", ...validityWhere(validOn) },
    include: { sourceRun: true },
    orderBy: [{ agencyCode: "asc" }, { updatedAt: "desc" }],
    take: 50,
  });
  return rows.map(withSource);
}

export async function lookupByMasterKey(orgId: string, masterType: CustomsMasterKey, code: string, validOn = new Date()) {
  const definition = getCustomsMasterDefinition(masterType);
  const lookupMap: Partial<Record<CustomsMasterKey, () => Promise<unknown>>> = {
    RITC_TARIFF: () => lookupRitcOrCth(orgId, code, validOn),
    BCD: () => lookupBcdByCth(orgId, code, validOn),
    AIDC: () => lookupAidcByCth(orgId, code, validOn),
    CESS_RATE: () => lookupCessByRitc(orgId, code, validOn),
    SCHEME_CODE: () => lookupScheme(orgId, code, validOn),
    DRAWBACK: () => lookupDrawback(orgId, code, validOn),
    RODTEP: () => lookupRodtep(orgId, code, validOn),
    RODTEP_EOU: () => lookupRodtepEou(orgId, code, validOn),
    ROSCTL: () => lookupRosctl(orgId, code, validOn),
    SUPPORTING_DOCUMENT: () => lookupSupportingDocument(orgId, code, validOn),
    UOM: () => lookupUom(orgId, code, validOn),
  };
  const lookup = lookupMap[definition.key];
  return lookup ? lookup() : null;
}

import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logChaAudit } from "@/modules/cha/service";
import {
  calculateImportInvoiceTotals,
  calculateImportItemTotals,
} from "./calculations";
import { RealIcegateClient } from "../icegate/client.server";
import {
  resolveImportItemSelections,
  resolveSupportingDocumentSelection,
} from "../masters/resolution";

import {
  importBeMainDraftSchema,
  importRemainingDraftSchema,
  importIgmDraftSchema,
  type ImportBeMainDraftInput,
  type ImportRemainingDraftInput,
  type ImportIgmDraftInput,
} from "./import-schemas";

export type ImportBeMainDraftView = {
  jobDate: string;
  beType: string;
  transportMode: string;
  filingType: string;
  customsHouse: string;
  customsHouseCode: string;
  warehouseCode: string;
  warehouseCustomsSiteId: string;
  packageCount: string;
  packageCode: string;
  grossWeight: string;
  uom: string;
  beNumber: string;
  beDate: string;
  examinationDate: string;
  outOfChargeDate: string;
  dutyPaidDate: string;
  deliveredDate: string;
  beStatusSource: "MANUAL" | "ICEGATE";
  beStatusUpdatedAt: string;
  icegateIdSnapshot: string;
  chaPanSnapshot: string;
  atpNameSnapshot: string;
  atpPanSnapshot: string;
  standardIec: boolean;
  importerNameSnapshot: string;
  importerIecSnapshot: string;
  importerBranchSerialNo: string;
  importerCategory: string;
  importerType: string;
  importerAddressSnapshot: string;
  importerClass: string;
  importerCitySnapshot: string;
  importerStateSnapshot: string;
  importerPinCodeSnapshot: string;
  importerAdCodeSnapshot: string;
  importerOriginState: string;
  importerGstnType: string;
  importerTaxRegistrationNo: string;
  firstCheck: boolean;
  greenChannel: boolean;
  kacchaBe: boolean;
  provisionalAssessment: boolean;
  highSeaSale: boolean;
  exBond: boolean;
  ucrType: string;
  ucrNo: string;
  paymentMethod: string;
  bondDetailsText: string;
  certificateDetailsText: string;
  portOfShipment: string;
  portOfShipmentCode: string;
  countryOfShipment: string;
  countryOfShipmentCode: string;
  portOfOrigin: string;
  portOfOriginCode: string;
  countryOfOrigin: string;
  countryOfOriginCode: string;
};

export type ImportIgmDraftView = {
  igmNo: string;
  fileType: string;
  igmDate: string;
  inwardDate: string;
  gatewayPort: string;
  gatewayMode: string;
  mblNo: string;
  noMbl: boolean;
  mblDate: string;
  packageCount: string;
  packageCode: string;
  hblNo: string;
  hblDate: string;
  grossWeight: string;
  netWeight: string;
  uom: string;
  marksAndNos: string;
  section48: boolean;
  section48Text: string;
  billRows: ImportIgmDraftInput["billRows"];
  containers: ImportIgmDraftInput["containers"];
  container20Count: number;
  container40Count: number;
  igmCapability: {
    supported: boolean;
    reason: string | null;
  };
};

export type ImportFilingDraftView = {
  beMain: ImportBeMainDraftView;
  igm: ImportIgmDraftView;
  invoices: ImportRemainingDraftInput["invoices"];
  items: ImportRemainingDraftInput["items"];
  declarations: ImportRemainingDraftInput["declarations"];
  supportingDocuments: ImportRemainingDraftInput["supportingDocuments"];
  checklist: {
    generations: { versionNo: number; status: string; checksum: string | null; generatedAt: string; checklistId: string | null }[];
    validation: string[];
  };
  flatFile: {
    generations: { versionNo: number; status: string; checksum: string; contentHash: string; generatedAt: string; fileName: string | null }[];
    validation: string[];
  };
};

function blankBeMain(): ImportBeMainDraftView {
  return {
    jobDate: "",
    beType: "",
    transportMode: "",
    filingType: "",
    customsHouse: "",
    customsHouseCode: "",
    warehouseCode: "",
    warehouseCustomsSiteId: "",
    packageCount: "",
    packageCode: "",
    grossWeight: "",
    uom: "",
    beNumber: "",
    beDate: "",
    examinationDate: "",
    outOfChargeDate: "",
    dutyPaidDate: "",
    deliveredDate: "",
    beStatusSource: "MANUAL",
    beStatusUpdatedAt: "",
    icegateIdSnapshot: "",
    chaPanSnapshot: "",
    atpNameSnapshot: "",
    atpPanSnapshot: "",
    standardIec: true,
    importerNameSnapshot: "",
    importerIecSnapshot: "",
    importerBranchSerialNo: "",
    importerCategory: "",
    importerType: "",
    importerAddressSnapshot: "",
    importerClass: "",
    importerCitySnapshot: "",
    importerStateSnapshot: "",
    importerPinCodeSnapshot: "",
    importerAdCodeSnapshot: "",
    importerOriginState: "",
    importerGstnType: "",
    importerTaxRegistrationNo: "",
    firstCheck: false,
    greenChannel: false,
    kacchaBe: false,
    provisionalAssessment: false,
    highSeaSale: false,
    exBond: false,
    ucrType: "",
    ucrNo: "",
    paymentMethod: "",
    bondDetailsText: "",
    certificateDetailsText: "",
    portOfShipment: "",
    portOfShipmentCode: "",
    countryOfShipment: "",
    countryOfShipmentCode: "",
    portOfOrigin: "",
    portOfOriginCode: "",
    countryOfOrigin: "",
    countryOfOriginCode: "",
  };
}

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function decimalToString(value: Prisma.Decimal | null | undefined) {
  return value ? value.toFixed() : "";
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseDecimal(value: string | null | undefined) {
  if (!value?.trim()) return null;
  return new Prisma.Decimal(value);
}

function parseJsonText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? { text: trimmed } : Prisma.JsonNull;
}

function jsonText(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const text = (value as { text?: unknown }).text;
  return typeof text === "string" ? text : "";
}

function jsonTextValue(value: string) {
  return value.trim() ? { text: value.trim() } : Prisma.JsonNull;
}

function stableJson(value: unknown) {
  return JSON.stringify(value, (_key, inner) => {
    if (inner instanceof Prisma.Decimal) return inner.toString();
    if (inner instanceof Date) return inner.toISOString();
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      return Object.keys(inner as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = (inner as Record<string, unknown>)[key];
          return acc;
        }, {});
    }
    return inner;
  });
}

function jsonSnapshot(value: unknown) {
  return JSON.parse(stableJson(value)) as Prisma.InputJsonValue;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function calculateRemainingStatus<T>(rows: T[]) {
  return rows.length > 0 ? "IN_PROGRESS" : "NOT_STARTED";
}

async function buildImportValidationMessages(params: {
  orgId: string;
  beMain: ImportBeMainDraftView;
  igm: ImportIgmDraftView;
  invoices: ImportRemainingDraftInput["invoices"];
  items: ImportRemainingDraftInput["items"];
  declarations: ImportRemainingDraftInput["declarations"];
  supportingDocuments: ImportRemainingDraftInput["supportingDocuments"];
}) {
  const messages: string[] = [];
  if (!params.beMain.importerNameSnapshot) messages.push("Importer snapshot is missing.");
  if (!params.beMain.beType) messages.push("BE Type is missing.");
  if (!params.igm.igmNo) messages.push("IGM number is missing.");
  if (params.invoices.length === 0) messages.push("At least one import invoice is required.");
  if (params.items.length === 0) messages.push("At least one import item is required.");
  for (const item of params.items) {
    if (item.invoiceSequenceNo && !params.invoices.some((invoice) => invoice.sequenceNo === item.invoiceSequenceNo)) {
      messages.push(`Item ${item.sequenceNo} references missing invoice ${item.invoiceSequenceNo}.`);
    }
  }
  for (const declaration of params.declarations) {
    if (declaration.invoiceSequenceNo && !params.invoices.some((invoice) => invoice.sequenceNo === declaration.invoiceSequenceNo)) {
      messages.push(`Declaration ${declaration.sequenceNo} references missing invoice ${declaration.invoiceSequenceNo}.`);
    }
    if (declaration.itemSequenceNo && !params.items.some((item) => item.sequenceNo === declaration.itemSequenceNo)) {
      messages.push(`Declaration ${declaration.sequenceNo} references missing item ${declaration.itemSequenceNo}.`);
    }
  }
  for (const document of params.supportingDocuments) {
    if (document.documentVersionId && !document.documentCode) {
      messages.push(`Document ${document.sequenceNo} has a linked job document but no customs document code.`);
    }
  }

  for (const invoice of params.invoices) {
    const calculation = calculateImportInvoiceTotals(invoice);
    for (const requirement of calculation.requirements) {
      messages.push(`Invoice ${invoice.sequenceNo}: ${requirement.message}`);
    }
  }

  for (const item of params.items) {
    const linkedInvoice =
      item.invoiceSequenceNo == null
        ? undefined
        : params.invoices.find((invoice) => invoice.sequenceNo === item.invoiceSequenceNo);
    const [resolution, calculation] = await Promise.all([
      resolveImportItemSelections(params.orgId, item),
      Promise.resolve(calculateImportItemTotals(item, linkedInvoice)),
    ]);

    for (const [label, value] of Object.entries(resolution)) {
      if (value.status !== "resolved") {
        messages.push(`Item ${item.sequenceNo}: ${label.toUpperCase()} - ${value.requirement}`);
      }
    }
    for (const requirement of calculation.requirements) {
      messages.push(`Item ${item.sequenceNo}: ${requirement.message}`);
    }
  }

  for (const document of params.supportingDocuments) {
    const resolution = await resolveSupportingDocumentSelection(params.orgId, document);
    if (resolution.document.status !== "resolved") {
      messages.push(`Document ${document.sequenceNo}: ${resolution.document.requirement}`);
    }
  }

  return messages;
}

function calculateBeCompletion(input: ImportBeMainDraftInput): "COMPLETE" | "IN_PROGRESS" {
  const required = [
    input.jobDate,
    input.beType,
    input.transportMode,
    input.filingType,
    input.customsHouse,
    input.customsHouseCode,
    input.importerNameSnapshot,
    input.importerIecSnapshot,
    input.portOfShipment,
    input.countryOfShipment,
    input.portOfOrigin,
    input.countryOfOrigin,
  ];
  return required.every((value) => String(value ?? "").trim()) ? "COMPLETE" : "IN_PROGRESS";
}

function calculateIgmCompletion(input: ImportIgmDraftInput): "COMPLETE" | "IN_PROGRESS" {
  const required = [input.igmNo, input.fileType, input.igmDate, input.inwardDate, input.gatewayPort, input.gatewayMode];
  return required.every((value) => String(value ?? "").trim()) && input.billRows.length > 0 ? "COMPLETE" : "IN_PROGRESS";
}

export async function getImportFilingDraft(profileId: string): Promise<ImportFilingDraftView> {
  const profile = await db.chaCustomsFilingProfile.findUnique({
    where: { id: profileId },
    select: {
      filingType: true,
      transportMode: true,
      customsHouse: true,
      customsHouseCode: true,
      job: { select: { createdAt: true, orgId: true } },
      importHeader: true,
      importInvoices: { include: { charges: { orderBy: { sequenceNo: "asc" } } }, orderBy: { sequenceNo: "asc" } },
      importItems: { orderBy: { sequenceNo: "asc" } },
      importDeclarations: { orderBy: { sequenceNo: "asc" } },
      importDocuments: { orderBy: { sequenceNo: "asc" } },
      checklistGenerations: { orderBy: { versionNo: "desc" }, take: 10 },
      flatFileGenerations: { orderBy: { versionNo: "desc" }, take: 10 },
      importIgm: {
        include: {
          billRows: { orderBy: { sequenceNo: "asc" } },
          containers: { orderBy: { sequenceNo: "asc" } },
        },
      },
    },
  });

  const header = profile?.importHeader;
  const beMain: ImportBeMainDraftView = header
    ? {
        ...blankBeMain(),
        jobDate: toIsoDate(profile.job.createdAt),
        beType: header.beType ?? "",
        beNumber: header.beNumber ?? "",
        beDate: toIsoDate(header.beDate),
        examinationDate: toIsoDate(header.examinationDate),
        outOfChargeDate: toIsoDate(header.outOfChargeDate),
        dutyPaidDate: toIsoDate(header.dutyPaidDate),
        deliveredDate: toIsoDate(header.deliveredDate),
        beStatusSource: "MANUAL",
        beStatusUpdatedAt: header.updatedAt.toISOString(),
        filingType: header.filingType ?? profile.filingType ?? "",
        transportMode: profile.transportMode ?? "",
        customsHouse: profile.customsHouse ?? "",
        customsHouseCode: profile.customsHouseCode ?? "",
        warehouseCode: header.warehouseCode ?? "",
        warehouseCustomsSiteId: header.warehouseCustomsSiteId ?? "",
        packageCount: decimalToString(header.packageCount),
        packageCode: header.packageCode ?? "",
        grossWeight: decimalToString(header.grossWeight),
        uom: header.uom ?? "",
        icegateIdSnapshot: header.icegateIdSnapshot ?? "",
        chaPanSnapshot: header.chaPanSnapshot ?? "",
        atpNameSnapshot: header.atpNameSnapshot ?? "",
        atpPanSnapshot: header.atpPanSnapshot ?? "",
        importerNameSnapshot: header.importerNameSnapshot ?? "",
        importerIecSnapshot: header.importerIecSnapshot ?? "",
        importerBranchSerialNo: header.importerBranchSerialNo ?? "",
        importerCategory: header.importerCategory ?? "",
        importerType: header.importerType ?? "",
        importerAddressSnapshot: header.importerAddressSnapshot ?? "",
        importerClass: header.importerClass ?? "",
        importerCitySnapshot: header.importerCitySnapshot ?? "",
        importerStateSnapshot: header.importerStateSnapshot ?? "",
        importerPinCodeSnapshot: header.importerPinCodeSnapshot ?? "",
        importerAdCodeSnapshot: header.importerAdCodeSnapshot ?? "",
        importerOriginState: header.importerOriginState ?? "",
        importerGstnType: header.importerGstnType ?? "",
        importerTaxRegistrationNo: header.importerTaxRegistrationNo ?? "",
        firstCheck: header.firstCheck,
        greenChannel: header.greenChannel,
        kacchaBe: header.kacchaBe,
        provisionalAssessment: header.provisionalAssessment,
        highSeaSale: header.highSeaSale,
        exBond: header.exBond,
        ucrType: header.ucrType ?? "",
        ucrNo: header.ucrNo ?? "",
        paymentMethod: header.paymentMethod ?? "",
        bondDetailsText: jsonText(header.bondDetailsSnapshot),
        certificateDetailsText: jsonText(header.certificateDetailsSnapshot),
        portOfShipment: header.portOfShipment ?? "",
        portOfShipmentCode: header.portOfShipmentCode ?? "",
        countryOfShipment: header.countryOfShipment ?? "",
        countryOfShipmentCode: header.countryOfShipmentCode ?? "",
        portOfOrigin: header.portOfOrigin ?? "",
        portOfOriginCode: header.portOfOriginCode ?? "",
        countryOfOrigin: header.countryOfOrigin ?? "",
        countryOfOriginCode: header.countryOfOriginCode ?? "",
      }
    : {
        ...blankBeMain(),
        jobDate: toIsoDate(profile?.job.createdAt),
        filingType: profile?.filingType ?? "",
        transportMode: profile?.transportMode ?? "",
        customsHouse: profile?.customsHouse ?? "",
        customsHouseCode: profile?.customsHouseCode ?? "",
      };

  const igmCapability = new RealIcegateClient().getCapabilities().igm_retrieval;
  const igm = profile?.importIgm;
  const billRows = (igm?.billRows ?? []).map((row) => ({
    sequenceNo: row.sequenceNo,
    mblNo: row.mblNo ?? "",
    noMbl: row.noMbl,
    mblDate: toIsoDate(row.mblDate),
    hblNo: row.hblNo ?? "",
    hblDate: toIsoDate(row.hblDate),
    packageCount: decimalToString(row.packageCount),
    packageCode: row.packageCode ?? "",
    grossWeight: decimalToString(row.grossWeight),
    netWeight: decimalToString(row.netWeight),
    uom: row.uom ?? "",
  }));
  const containers = (igm?.containers ?? []).map((container) => ({
    sequenceNo: container.sequenceNo,
    containerNo: container.containerNo,
    containerSize: container.containerSize ?? "",
    sealNo: container.sealNo ?? "",
    packageCount: decimalToString(container.packageCount),
    grossWeight: decimalToString(container.grossWeight),
    netWeight: decimalToString(container.netWeight),
  }));
  const invoices = (profile?.importInvoices ?? []).map((invoice) => ({
    sequenceNo: invoice.sequenceNo,
    invoiceNo: invoice.invoiceNo,
    invoiceDate: toIsoDate(invoice.invoiceDate),
    natureOfPayment: invoice.natureOfPayment ?? "",
    natureOfTransaction: invoice.natureOfTransaction ?? "",
    currency: invoice.currency ?? "",
    exchangeRate: decimalToString(invoice.exchangeRate),
    invoiceValue: decimalToString(invoice.invoiceValue),
    invoiceValueInr: decimalToString(invoice.invoiceValueInr),
    incoTerms: invoice.incoTerms ?? "",
    valuationMethod: invoice.valuationMethod ?? "",
    supplierNameSnapshot: invoice.supplierNameSnapshot ?? "",
    supplierAddressSnapshot: invoice.supplierAddressSnapshot ?? "",
    supplierCountrySnapshot: invoice.supplierCountrySnapshot ?? "",
    supplierZipCodeSnapshot: invoice.supplierZipCodeSnapshot ?? "",
    useForAllInvoice: invoice.useForAllInvoice,
    useAsDefaultManufacturer: invoice.useAsDefaultManufacturer,
    sellerText: jsonText(invoice.sellerSnapshot),
    brokerText: jsonText(invoice.brokerSnapshot),
    thirdPartyText: jsonText(invoice.thirdPartySnapshot),
    aeoText: jsonText(invoice.aeoSnapshot),
    svbText: jsonText(invoice.svbSnapshot),
    singleFreightInsurance: Boolean((invoice.charges[0]?.rawSnapshot as { singleFreightInsurance?: unknown } | null)?.singleFreightInsurance),
    actualFreight: invoice.charges.some((charge) => charge.isActual),
    assessableValueFc: decimalToString(invoice.charges.find((charge) => charge.chargeType === "ASSESSABLE_VALUE")?.amount),
    assessableValueInr: decimalToString(invoice.charges.find((charge) => charge.chargeType === "ASSESSABLE_VALUE")?.amountInr),
    charges: invoice.charges
      .filter((charge) => charge.chargeType !== "ASSESSABLE_VALUE")
      .map((charge) => ({
        sequenceNo: charge.sequenceNo,
        chargeType: charge.chargeType,
        currency: charge.currency ?? "",
        exchangeRate: decimalToString(charge.exchangeRate),
        rate: decimalToString(charge.rate),
        amount: decimalToString(charge.amount),
        amountInr: decimalToString(charge.amountInr),
        isActual: charge.isActual,
      })),
  }));
  const items = (profile?.importItems ?? []).map((item) => {
    const duty = item.dutySnapshot && typeof item.dutySnapshot === "object" && !Array.isArray(item.dutySnapshot)
      ? item.dutySnapshot as Record<string, unknown>
      : {};
    return {
      sequenceNo: item.sequenceNo,
      invoiceSequenceNo: item.invoiceSequenceNo,
      ritcNo: item.ritcNo ?? "",
      itemDescription: item.itemDescription ?? "",
      schemeCode: item.schemeCode ?? "",
      quantity: decimalToString(item.quantity),
      unit: item.unit ?? "",
      unitPrice: decimalToString(item.unitPrice),
      per: decimalToString(item.per),
      itemAmount: decimalToString(item.itemAmount),
      itemAmountInr: decimalToString(item.itemAmountInr),
      assessableValue: decimalToString(item.assessableValue),
      totalPmv: decimalToString(item.totalPmv),
      endUse: item.endUse ?? "",
      countryOfOrigin: typeof duty.countryOfOrigin === "string" ? duty.countryOfOrigin : "",
      notificationNo: typeof duty.notificationNo === "string" ? duty.notificationNo : "",
      notificationSerialNo: typeof duty.notificationSerialNo === "string" ? duty.notificationSerialNo : "",
      notificationSubSerialNo: typeof duty.notificationSubSerialNo === "string" ? duty.notificationSubSerialNo : "",
      bcdRate: typeof duty.bcdRate === "string" ? duty.bcdRate : "",
      aidcRate: typeof duty.aidcRate === "string" ? duty.aidcRate : "",
      cessRate: typeof duty.cessRate === "string" ? duty.cessRate : "",
      otherDutyText: typeof duty.otherDutyText === "string" ? duty.otherDutyText : "",
      bondCode: typeof duty.bondCode === "string" ? duty.bondCode : "",
      licenseNo: typeof duty.licenseNo === "string" ? duty.licenseNo : "",
    };
  });
  const declarations = (profile?.importDeclarations ?? []).map((declaration) => ({
    sequenceNo: declaration.sequenceNo,
    statementType: declaration.statementType ?? "",
    statementCode: declaration.statementCode ?? "",
    statementText: declaration.statementText ?? "",
    declarationType: declaration.declarationType ?? "",
    declarationNo: declaration.declarationNo ?? "",
    declarationDate: toIsoDate(declaration.declarationDate),
    invoiceSequenceNo: declaration.invoiceSequenceNo,
    itemSequenceNo: declaration.itemSequenceNo,
  }));
  const supportingDocuments = (profile?.importDocuments ?? []).map((document) => ({
    sequenceNo: document.sequenceNo,
    documentCode: document.documentCode,
    documentNameSnapshot: document.documentNameSnapshot ?? "",
    irnNo: document.irnNo ?? "",
    drnNo: document.drnNo ?? "",
    issueDate: toIsoDate(document.issueDate),
    expiryDate: toIsoDate(document.expiryDate),
    declarationType: document.declarationType ?? "",
    fileType: document.fileType ?? "",
    placeOfIssue: document.placeOfIssue ?? "",
    invoiceSequenceNo: document.invoiceSequenceNo,
    itemSequenceNo: document.itemSequenceNo,
    icegateIdSnapshot: document.icegateIdSnapshot ?? "",
    documentVersionId: document.documentVersionId ?? "",
    issuingPartyText: jsonText(document.rawSnapshot),
  }));
  const validation = await buildImportValidationMessages({ orgId: profile?.job.orgId ?? "", beMain, igm: {
    igmNo: igm?.igmNo ?? "",
    fileType: igm?.fileType ?? "",
    igmDate: toIsoDate(igm?.igmDate),
    inwardDate: toIsoDate(igm?.inwardDate),
    gatewayPort: igm?.gatewayPort ?? "",
    gatewayMode: igm?.gatewayMode ?? "",
    mblNo: billRows[0]?.mblNo ?? "",
    noMbl: billRows[0]?.noMbl ?? false,
    mblDate: billRows[0]?.mblDate ?? "",
    packageCount: billRows[0]?.packageCount ?? "",
    packageCode: billRows[0]?.packageCode ?? "",
    hblNo: billRows[0]?.hblNo ?? "",
    hblDate: billRows[0]?.hblDate ?? "",
    grossWeight: billRows[0]?.grossWeight ?? "",
    netWeight: billRows[0]?.netWeight ?? "",
    uom: billRows[0]?.uom ?? "",
    marksAndNos: igm?.marksAndNos ?? "",
    section48: igm?.section48 ?? false,
    section48Text: igm?.section48Text ?? "",
    billRows,
    containers,
    container20Count: containers.filter((container) => container.containerSize === "20FT").length,
    container40Count: containers.filter((container) => container.containerSize === "40FT").length,
    igmCapability: { supported: igmCapability.supported, reason: igmCapability.supported ? null : igmCapability.reason },
  }, invoices, items, declarations, supportingDocuments });

  return {
    beMain,
    igm: {
      igmNo: igm?.igmNo ?? "",
      fileType: igm?.fileType ?? "",
      igmDate: toIsoDate(igm?.igmDate),
      inwardDate: toIsoDate(igm?.inwardDate),
      gatewayPort: igm?.gatewayPort ?? "",
      gatewayMode: igm?.gatewayMode ?? "",
      mblNo: billRows[0]?.mblNo ?? "",
      noMbl: billRows[0]?.noMbl ?? false,
      mblDate: billRows[0]?.mblDate ?? "",
      packageCount: billRows[0]?.packageCount ?? "",
      packageCode: billRows[0]?.packageCode ?? "",
      hblNo: billRows[0]?.hblNo ?? "",
      hblDate: billRows[0]?.hblDate ?? "",
      grossWeight: billRows[0]?.grossWeight ?? "",
      netWeight: billRows[0]?.netWeight ?? "",
      uom: billRows[0]?.uom ?? "",
      marksAndNos: igm?.marksAndNos ?? "",
      section48: igm?.section48 ?? false,
      section48Text: igm?.section48Text ?? "",
      billRows,
      containers,
      container20Count: containers.filter((container) => container.containerSize === "20FT").length,
      container40Count: containers.filter((container) => container.containerSize === "40FT").length,
      igmCapability: {
        supported: igmCapability.supported,
        reason: igmCapability.supported ? null : igmCapability.reason,
      },
    },
    invoices,
    items,
    declarations,
    supportingDocuments,
    checklist: {
      generations: (profile?.checklistGenerations ?? []).map((generation) => ({
        versionNo: generation.versionNo,
        status: generation.status,
        checksum: generation.checksum,
        generatedAt: generation.generatedAt.toISOString(),
        checklistId: generation.checklistId,
      })),
      validation,
    },
    flatFile: {
      generations: (profile?.flatFileGenerations ?? []).map((generation) => ({
        versionNo: generation.versionNo,
        status: generation.status,
        checksum: generation.checksum,
        contentHash: generation.contentHash,
        generatedAt: generation.generatedAt.toISOString(),
        fileName: generation.fileName,
      })),
      validation,
    },
  };
}

async function getImportProfileForSave(orgId: string, jobId: string) {
  const profile = await db.chaCustomsFilingProfile.findFirst({
    where: { jobId, movementDirection: "IMPORT", job: { orgId, deletedAt: null } },
    select: { id: true, lockVersion: true, jobId: true },
  });
  if (!profile) throw new Error("Import customs filing profile is unavailable for this job.");
  return profile;
}

export async function saveImportBeMainDraft(params: {
  actorId: string;
  orgId: string;
  jobId: string;
  input: unknown;
}) {
  const input = importBeMainDraftSchema.parse(params.input);
  const profile = await getImportProfileForSave(params.orgId, params.jobId);

  await db.$transaction(async (tx) => {
    const update = await tx.chaCustomsFilingProfile.updateMany({
      where: { id: profile.id, lockVersion: input.lockVersion },
      data: {
        lockVersion: { increment: 1 },
        currentDraftVersion: { increment: 1 },
        filingType: input.filingType || null,
        transportMode: input.transportMode || null,
        customsHouse: input.customsHouse || null,
        customsHouseCode: input.customsHouseCode || null,
        beMainStatus: calculateBeCompletion(input),
        updatedById: params.actorId,
      },
    });
    if (update.count !== 1) {
      throw new Error("CONCURRENCY_CONFLICT");
    }

    await tx.chaImportFilingHeader.upsert({
      where: { profileId: profile.id },
      update: {
        beType: input.beType || null,
        beNumber: input.beNumber || null,
        beDate: parseDate(input.beDate),
        examinationDate: parseDate(input.examinationDate),
        outOfChargeDate: parseDate(input.outOfChargeDate),
        dutyPaidDate: parseDate(input.dutyPaidDate),
        deliveredDate: parseDate(input.deliveredDate),
        filingType: input.filingType || null,
        warehouseCode: input.warehouseCode || null,
        warehouseCustomsSiteId: input.warehouseCustomsSiteId || null,
        packageCount: parseDecimal(input.packageCount),
        packageCode: input.packageCode || null,
        grossWeight: parseDecimal(input.grossWeight),
        uom: input.uom || null,
        icegateIdSnapshot: input.icegateIdSnapshot || null,
        chaPanSnapshot: input.chaPanSnapshot || null,
        atpNameSnapshot: input.atpNameSnapshot || null,
        atpPanSnapshot: input.atpPanSnapshot || null,
        importerNameSnapshot: input.importerNameSnapshot || null,
        importerIecSnapshot: input.importerIecSnapshot || null,
        importerBranchSerialNo: input.importerBranchSerialNo || null,
        importerCategory: input.importerCategory || null,
        importerType: input.importerType || null,
        importerAddressSnapshot: input.importerAddressSnapshot || null,
        importerClass: input.importerClass || null,
        importerCitySnapshot: input.importerCitySnapshot || null,
        importerStateSnapshot: input.importerStateSnapshot || null,
        importerPinCodeSnapshot: input.importerPinCodeSnapshot || null,
        importerAdCodeSnapshot: input.importerAdCodeSnapshot || null,
        importerOriginState: input.importerOriginState || null,
        importerGstnType: input.importerGstnType || null,
        importerTaxRegistrationNo: input.importerTaxRegistrationNo || null,
        firstCheck: input.firstCheck,
        greenChannel: input.greenChannel,
        kacchaBe: input.kacchaBe,
        provisionalAssessment: input.provisionalAssessment,
        highSeaSale: input.highSeaSale,
        exBond: input.exBond,
        ucrType: input.ucrType || null,
        ucrNo: input.ucrNo || null,
        paymentMethod: input.paymentMethod || null,
        bondDetailsSnapshot: parseJsonText(input.bondDetailsText),
        certificateDetailsSnapshot: parseJsonText(input.certificateDetailsText),
        portOfShipment: input.portOfShipment || null,
        portOfShipmentCode: input.portOfShipmentCode || null,
        countryOfShipment: input.countryOfShipment || null,
        countryOfShipmentCode: input.countryOfShipmentCode || null,
        portOfOrigin: input.portOfOrigin || null,
        portOfOriginCode: input.portOfOriginCode || null,
        countryOfOrigin: input.countryOfOrigin || null,
        countryOfOriginCode: input.countryOfOriginCode || null,
      },
      create: {
        profileId: profile.id,
        beType: input.beType || null,
        beNumber: input.beNumber || null,
        beDate: parseDate(input.beDate),
        examinationDate: parseDate(input.examinationDate),
        outOfChargeDate: parseDate(input.outOfChargeDate),
        dutyPaidDate: parseDate(input.dutyPaidDate),
        deliveredDate: parseDate(input.deliveredDate),
        filingType: input.filingType || null,
        warehouseCode: input.warehouseCode || null,
        warehouseCustomsSiteId: input.warehouseCustomsSiteId || null,
        packageCount: parseDecimal(input.packageCount),
        packageCode: input.packageCode || null,
        grossWeight: parseDecimal(input.grossWeight),
        uom: input.uom || null,
        icegateIdSnapshot: input.icegateIdSnapshot || null,
        chaPanSnapshot: input.chaPanSnapshot || null,
        atpNameSnapshot: input.atpNameSnapshot || null,
        atpPanSnapshot: input.atpPanSnapshot || null,
        importerNameSnapshot: input.importerNameSnapshot || null,
        importerIecSnapshot: input.importerIecSnapshot || null,
        importerBranchSerialNo: input.importerBranchSerialNo || null,
        importerCategory: input.importerCategory || null,
        importerType: input.importerType || null,
        importerAddressSnapshot: input.importerAddressSnapshot || null,
        importerClass: input.importerClass || null,
        importerCitySnapshot: input.importerCitySnapshot || null,
        importerStateSnapshot: input.importerStateSnapshot || null,
        importerPinCodeSnapshot: input.importerPinCodeSnapshot || null,
        importerAdCodeSnapshot: input.importerAdCodeSnapshot || null,
        importerOriginState: input.importerOriginState || null,
        importerGstnType: input.importerGstnType || null,
        importerTaxRegistrationNo: input.importerTaxRegistrationNo || null,
        firstCheck: input.firstCheck,
        greenChannel: input.greenChannel,
        kacchaBe: input.kacchaBe,
        provisionalAssessment: input.provisionalAssessment,
        highSeaSale: input.highSeaSale,
        exBond: input.exBond,
        ucrType: input.ucrType || null,
        ucrNo: input.ucrNo || null,
        paymentMethod: input.paymentMethod || null,
        bondDetailsSnapshot: parseJsonText(input.bondDetailsText),
        certificateDetailsSnapshot: parseJsonText(input.certificateDetailsText),
        portOfShipment: input.portOfShipment || null,
        portOfShipmentCode: input.portOfShipmentCode || null,
        countryOfShipment: input.countryOfShipment || null,
        countryOfShipmentCode: input.countryOfShipmentCode || null,
        portOfOrigin: input.portOfOrigin || null,
        portOfOriginCode: input.portOfOriginCode || null,
        countryOfOrigin: input.countryOfOrigin || null,
        countryOfOriginCode: input.countryOfOriginCode || null,
      },
    });
  });

  await logChaAudit({
    orgId: params.orgId,
    jobId: params.jobId,
    entityType: "ChaImportFilingHeader",
    entityId: profile.id,
    event: "IMPORT_BE_MAIN_DRAFT_SAVED",
    actorId: params.actorId,
    remarks: "Import BE Main Details draft saved",
  });

  return db.chaCustomsFilingProfile.findUniqueOrThrow({ where: { id: profile.id }, select: { lockVersion: true, currentDraftVersion: true, beMainStatus: true } });
}

export async function saveImportIgmDraft(params: {
  actorId: string;
  orgId: string;
  jobId: string;
  input: unknown;
}) {
  const input = importIgmDraftSchema.parse(params.input);
  const profile = await getImportProfileForSave(params.orgId, params.jobId);
  const status = calculateIgmCompletion(input);

  await db.$transaction(async (tx) => {
    const update = await tx.chaCustomsFilingProfile.updateMany({
      where: { id: profile.id, lockVersion: input.lockVersion },
      data: {
        lockVersion: { increment: 1 },
        currentDraftVersion: { increment: 1 },
        igmStatus: status,
        updatedById: params.actorId,
      },
    });
    if (update.count !== 1) {
      throw new Error("CONCURRENCY_CONFLICT");
    }

    const header = await tx.chaImportIgmHeader.upsert({
      where: { profileId: profile.id },
      update: {
        igmNo: input.igmNo || null,
        fileType: input.fileType || null,
        igmDate: parseDate(input.igmDate),
        inwardDate: parseDate(input.inwardDate),
        gatewayPort: input.gatewayPort || null,
        gatewayMode: input.gatewayMode || null,
        marksAndNos: input.marksAndNos || null,
        section48: input.section48,
        section48Text: input.section48Text || null,
      },
      create: {
        profileId: profile.id,
        igmNo: input.igmNo || null,
        fileType: input.fileType || null,
        igmDate: parseDate(input.igmDate),
        inwardDate: parseDate(input.inwardDate),
        gatewayPort: input.gatewayPort || null,
        gatewayMode: input.gatewayMode || null,
        marksAndNos: input.marksAndNos || null,
        section48: input.section48,
        section48Text: input.section48Text || null,
      },
    });

    await tx.chaImportIgmBillRow.deleteMany({ where: { igmHeaderId: header.id } });
    await tx.chaImportContainer.deleteMany({ where: { igmHeaderId: header.id } });

    if (input.billRows.length) {
      await tx.chaImportIgmBillRow.createMany({
        data: input.billRows.map((row) => ({
          igmHeaderId: header.id,
          sequenceNo: row.sequenceNo,
          mblNo: row.mblNo || null,
          noMbl: row.noMbl,
          mblDate: parseDate(row.mblDate),
          hblNo: row.hblNo || null,
          hblDate: parseDate(row.hblDate),
          packageCount: parseDecimal(row.packageCount),
          packageCode: row.packageCode || null,
          grossWeight: parseDecimal(row.grossWeight),
          netWeight: parseDecimal(row.netWeight),
          uom: row.uom || null,
        })),
      });
    }
    if (input.containers.length) {
      await tx.chaImportContainer.createMany({
        data: input.containers.map((container) => ({
          igmHeaderId: header.id,
          sequenceNo: container.sequenceNo,
          containerNo: container.containerNo,
          containerSize: container.containerSize || null,
          sealNo: container.sealNo || null,
          packageCount: parseDecimal(container.packageCount),
          grossWeight: parseDecimal(container.grossWeight),
          netWeight: parseDecimal(container.netWeight),
          rawSnapshot: {
            source: "MANUAL_DRAFT",
            capturedAt: new Date().toISOString(),
          },
        })),
      });
    }
  });

  await logChaAudit({
    orgId: params.orgId,
    jobId: params.jobId,
    entityType: "ChaImportIgmHeader",
    entityId: profile.id,
    event: "IMPORT_IGM_DRAFT_SAVED",
    actorId: params.actorId,
    remarks: `Import IGM draft saved with ${input.billRows.length} bill rows and ${input.containers.length} containers`,
  });

  return db.chaCustomsFilingProfile.findUniqueOrThrow({ where: { id: profile.id }, select: { lockVersion: true, currentDraftVersion: true, igmStatus: true } });
}

export async function saveImportRemainingDraft(params: {
  actorId: string;
  orgId: string;
  jobId: string;
  input: unknown;
}) {
  const input = importRemainingDraftSchema.parse(params.input);
  const profile = await getImportProfileForSave(params.orgId, params.jobId);
  const invoiceCalculations = new Map(
    input.invoices.map((invoice) => [invoice.sequenceNo, calculateImportInvoiceTotals(invoice)]),
  );
  const itemResolutions = await Promise.all(
    input.items.map(async (item) => ({
      sequenceNo: item.sequenceNo,
      resolution: await resolveImportItemSelections(params.orgId, item),
      calculation: calculateImportItemTotals(
        item,
        item.invoiceSequenceNo == null
          ? undefined
          : input.invoices.find((invoice) => invoice.sequenceNo === item.invoiceSequenceNo),
      ),
    })),
  );
  const itemResolutionBySequence = new Map(
    itemResolutions.map((item) => [item.sequenceNo, item]),
  );
  const documentResolutions = await Promise.all(
    input.supportingDocuments.map(async (document) => ({
      sequenceNo: document.sequenceNo,
      resolution: await resolveSupportingDocumentSelection(params.orgId, document),
    })),
  );
  const documentResolutionBySequence = new Map(
    documentResolutions.map((document) => [document.sequenceNo, document]),
  );

  await db.$transaction(async (tx) => {
    const update = await tx.chaCustomsFilingProfile.updateMany({
      where: { id: profile.id, lockVersion: input.lockVersion },
      data: {
        lockVersion: { increment: 1 },
        currentDraftVersion: { increment: 1 },
        importInvoiceStatus: calculateRemainingStatus(input.invoices),
        importItemStatus: calculateRemainingStatus(input.items),
        importDeclarationStatus: calculateRemainingStatus(input.declarations),
        importDocumentStatus: calculateRemainingStatus(input.supportingDocuments),
        updatedById: params.actorId,
      },
    });
    if (update.count !== 1) throw new Error("CONCURRENCY_CONFLICT");

    await tx.chaImportSupportingDocument.deleteMany({ where: { profileId: profile.id } });
    await tx.chaImportDeclaration.deleteMany({ where: { profileId: profile.id } });
    await tx.chaImportItem.deleteMany({ where: { profileId: profile.id } });
    await tx.chaImportInvoice.deleteMany({ where: { profileId: profile.id } });

    for (const invoice of input.invoices) {
      const invoiceCalculation = invoiceCalculations.get(invoice.sequenceNo);
      await tx.chaImportInvoice.create({
        data: {
          profileId: profile.id,
          sequenceNo: invoice.sequenceNo,
          invoiceNo: invoice.invoiceNo,
          invoiceDate: parseDate(invoice.invoiceDate),
          natureOfPayment: invoice.natureOfPayment || null,
          natureOfTransaction: invoice.natureOfTransaction || null,
          currency: invoice.currency || null,
          exchangeRate: parseDecimal(invoice.exchangeRate),
          invoiceValue: parseDecimal(invoice.invoiceValue),
          invoiceValueInr: parseDecimal(invoice.invoiceValueInr),
          incoTerms: invoice.incoTerms || null,
          valuationMethod: invoice.valuationMethod || null,
          supplierNameSnapshot: invoice.supplierNameSnapshot || null,
          supplierAddressSnapshot: invoice.supplierAddressSnapshot || null,
          supplierCountrySnapshot: invoice.supplierCountrySnapshot || null,
          supplierZipCodeSnapshot: invoice.supplierZipCodeSnapshot || null,
          useForAllInvoice: invoice.useForAllInvoice,
          useAsDefaultManufacturer: invoice.useAsDefaultManufacturer,
          sellerSnapshot: jsonTextValue(invoice.sellerText),
          brokerSnapshot: jsonTextValue(invoice.brokerText),
          thirdPartySnapshot: jsonTextValue(invoice.thirdPartyText),
          aeoSnapshot: jsonTextValue(invoice.aeoText),
          svbSnapshot: jsonTextValue(invoice.svbText),
          charges: {
            create: [
              ...invoice.charges.map((charge) => ({
                sequenceNo: charge.sequenceNo,
                chargeType: charge.chargeType || `CHARGE_${charge.sequenceNo}`,
                currency: charge.currency || null,
                exchangeRate: parseDecimal(charge.exchangeRate),
                rate: parseDecimal(charge.rate),
                amount: parseDecimal(charge.amount),
                amountInr: parseDecimal(charge.amountInr),
                isActual: charge.isActual,
                rawSnapshot: {
                  rulesetVersion: invoiceCalculation?.rulesetVersion ?? "IMPORT_BE_DRAFT_V1",
                  singleFreightInsurance: invoice.singleFreightInsurance,
                },
              })),
              {
                sequenceNo: invoice.charges.length + 1,
                chargeType: "ASSESSABLE_VALUE",
                amount: parseDecimal(invoice.assessableValueFc),
                amountInr: parseDecimal(invoice.assessableValueInr),
                isActual: invoice.actualFreight,
                rawSnapshot: {
                  rulesetVersion: invoiceCalculation?.rulesetVersion ?? "IMPORT_BE_DRAFT_V1",
                  calculated: invoiceCalculation?.requirements.length === 0,
                  invoiceValueInr: invoiceCalculation?.invoiceValueInr ?? "",
                  assessableValueFc: invoiceCalculation?.assessableValueFc ?? "",
                  assessableValueInr: invoiceCalculation?.assessableValueInr ?? "",
                  chargesInr: invoiceCalculation?.chargesInr ?? "",
                  requirements: invoiceCalculation?.requirements ?? [],
                },
              },
            ],
          },
        },
      });
    }

    const invoiceBySequence = await tx.chaImportInvoice.findMany({
      where: { profileId: profile.id },
      select: { id: true, sequenceNo: true },
    });
    const invoiceIdBySequence = new Map(invoiceBySequence.map((invoice) => [invoice.sequenceNo, invoice.id]));

    if (input.items.length) {
      await tx.chaImportItem.createMany({
        data: input.items.map((item) => {
          const itemDetails = itemResolutionBySequence.get(item.sequenceNo);
          return {
            profileId: profile.id,
            invoiceId: item.invoiceSequenceNo ? invoiceIdBySequence.get(item.invoiceSequenceNo) ?? null : null,
            sequenceNo: item.sequenceNo,
            invoiceSequenceNo: item.invoiceSequenceNo ?? null,
            ritcNo: item.ritcNo || null,
            itemDescription: item.itemDescription || null,
            schemeCode: item.schemeCode || null,
            quantity: parseDecimal(item.quantity),
            unit: item.unit || null,
            unitPrice: parseDecimal(item.unitPrice),
            per: parseDecimal(item.per),
            itemAmount: parseDecimal(item.itemAmount),
            itemAmountInr: parseDecimal(item.itemAmountInr),
            assessableValue: parseDecimal(item.assessableValue),
            totalPmv: parseDecimal(item.totalPmv),
            endUse: item.endUse || null,
            masterSnapshot: jsonSnapshot({
              ritcNo: item.ritcNo,
              schemeCode: item.schemeCode,
              uomCode: item.unit,
              ritc:
                itemDetails?.resolution.ritc.status === "resolved"
                  ? itemDetails.resolution.ritc.selected
                  : null,
              scheme:
                itemDetails?.resolution.scheme.status === "resolved"
                  ? itemDetails.resolution.scheme.selected
                  : null,
              uomResolution: itemDetails?.resolution.uom ?? null,
              uom:
                itemDetails?.resolution.uom.status === "resolved"
                  ? itemDetails.resolution.uom.selected
                  : item.unit,
              resolution: itemDetails?.resolution ?? null,
              savedAt: new Date().toISOString(),
              rulesetVersion: itemDetails?.calculation.rulesetVersion ?? "IMPORT_BE_DRAFT_V1",
            }),
            dutySnapshot: jsonSnapshot({
              countryOfOrigin: item.countryOfOrigin,
              notificationNo: item.notificationNo,
              notificationSerialNo: item.notificationSerialNo,
              notificationSubSerialNo: item.notificationSubSerialNo,
              bcdRate: item.bcdRate,
              aidcRate: item.aidcRate,
              cessRate: item.cessRate,
              otherDutyText: item.otherDutyText,
              bondCode: item.bondCode,
              licenseNo: item.licenseNo,
              bcd:
                itemDetails?.resolution.bcd.status === "resolved"
                  ? itemDetails.resolution.bcd.selected
                  : null,
              aidc:
                itemDetails?.resolution.aidc.status === "resolved"
                  ? itemDetails.resolution.aidc.selected
                  : null,
              cess:
                itemDetails?.resolution.cess.status === "resolved"
                  ? itemDetails.resolution.cess.selected
                  : null,
              resolution: {
                bcd: itemDetails?.resolution.bcd ?? null,
                aidc: itemDetails?.resolution.aidc ?? null,
                cess: itemDetails?.resolution.cess ?? null,
              },
              calculation: itemDetails?.calculation ?? null,
              rulesetVersion: itemDetails?.calculation.rulesetVersion ?? "IMPORT_BE_DRAFT_V1",
            }),
          };
        }),
      });
    }

    if (input.declarations.length) {
      await tx.chaImportDeclaration.createMany({
        data: input.declarations.map((declaration) => ({
          profileId: profile.id,
          sequenceNo: declaration.sequenceNo,
          statementType: declaration.statementType || null,
          statementCode: declaration.statementCode || null,
          statementText: declaration.statementText || null,
          declarationType: declaration.declarationType || null,
          declarationNo: declaration.declarationNo || null,
          declarationDate: parseDate(declaration.declarationDate),
          invoiceSequenceNo: declaration.invoiceSequenceNo ?? null,
          itemSequenceNo: declaration.itemSequenceNo ?? null,
          rawSnapshot: { source: "MANUAL_DRAFT", capturedAt: new Date().toISOString() },
        })),
      });
    }

    if (input.supportingDocuments.length) {
      await tx.chaImportSupportingDocument.createMany({
        data: input.supportingDocuments.map((document) => {
          const resolution = documentResolutionBySequence.get(document.sequenceNo)?.resolution.document;
          return {
            profileId: profile.id,
            sequenceNo: document.sequenceNo,
            documentCode: document.documentCode,
            documentNameSnapshot:
              document.documentNameSnapshot ||
              (resolution?.status === "resolved"
                ? String(
                    resolution.selected.master.documentName ??
                    resolution.selected.master.documentDescription ??
                    document.documentCode,
                  )
                : null),
            irnNo: document.irnNo || null,
            drnNo: document.drnNo || null,
            issueDate: parseDate(document.issueDate),
            expiryDate: parseDate(document.expiryDate),
            declarationType: document.declarationType || null,
            fileType: document.fileType || null,
            placeOfIssue: document.placeOfIssue || null,
            invoiceSequenceNo: document.invoiceSequenceNo ?? null,
            itemSequenceNo: document.itemSequenceNo ?? null,
            icegateIdSnapshot: document.icegateIdSnapshot || null,
            documentVersionId: document.documentVersionId || null,
            rawSnapshot: jsonSnapshot({
              issuingParty: document.issuingPartyText.trim()
                ? { text: document.issuingPartyText.trim() }
                : null,
              source:
                resolution?.status === "resolved"
                  ? resolution.selected.source
                  : null,
              resolution,
            }),
          };
        }),
      });
    }
  });

  await logChaAudit({
    orgId: params.orgId,
    jobId: params.jobId,
    entityType: "ChaCustomsFilingProfile",
    entityId: profile.id,
    event: "IMPORT_REMAINING_DRAFT_SAVED",
    actorId: params.actorId,
    remarks: `Import remaining subtabs saved: ${input.invoices.length} invoice(s), ${input.items.length} item(s), ${input.declarations.length} declaration(s), ${input.supportingDocuments.length} document row(s).`,
  });

  return db.chaCustomsFilingProfile.findUniqueOrThrow({
    where: { id: profile.id },
    select: {
      lockVersion: true,
      currentDraftVersion: true,
      importInvoiceStatus: true,
      importItemStatus: true,
      importDeclarationStatus: true,
      importDocumentStatus: true,
    },
  });
}

export async function generateImportChecklistSnapshot(params: {
  actorId: string;
  orgId: string;
  jobId: string;
  lockVersion: number;
}) {
  const profile = await getImportProfileForSave(params.orgId, params.jobId);
  if (profile.lockVersion !== params.lockVersion) throw new Error("CONCURRENCY_CONFLICT");
  const draft = await getImportFilingDraft(profile.id);
  const validation = draft.checklist.validation;
  const content = stableJson({
    kind: "IMPORT_BE_CHECKLIST",
    schemaVersion: "IMPORT_BE_CHECKLIST_DRAFT_V1",
    jobId: params.jobId,
    draft,
  });
  const checksum = sha256(content);
  const latest = await db.chaCustomsChecklistGeneration.findFirst({
    where: { profileId: profile.id },
    orderBy: { versionNo: "desc" },
    select: { versionNo: true },
  });
  const generation = await db.chaCustomsChecklistGeneration.create({
    data: {
      profileId: profile.id,
      versionNo: (latest?.versionNo ?? 0) + 1,
      status: "GENERATED",
      checksum,
      generatedById: params.actorId,
      metadata: {
        schemaVersion: "IMPORT_BE_CHECKLIST_DRAFT_V1",
        validation,
        requiresApprovalReuse: true,
        existingWorkflow: "ChaChecklist",
      },
    },
  });
  await logChaAudit({
    orgId: params.orgId,
    jobId: params.jobId,
    entityType: "ChaCustomsChecklistGeneration",
    entityId: generation.id,
    event: "IMPORT_CHECKLIST_SNAPSHOT_GENERATED",
    actorId: params.actorId,
    remarks: `Generated import checklist snapshot v${generation.versionNo}.`,
  });
  return generation;
}

export async function generateImportFlatFileSnapshot(params: {
  actorId: string;
  orgId: string;
  jobId: string;
  lockVersion: number;
}) {
  const profile = await getImportProfileForSave(params.orgId, params.jobId);
  if (profile.lockVersion !== params.lockVersion) throw new Error("CONCURRENCY_CONFLICT");
  const draft = await getImportFilingDraft(profile.id);
  const payload = {
    messageType: "BILL_OF_ENTRY",
    schemaVersion: "IMPORT_BE_INTERNAL_VERIFIED_FIXTURE_V1",
    liveSubmission: false,
    jobId: params.jobId,
    beMain: draft.beMain,
    igm: draft.igm,
    invoices: draft.invoices,
    items: draft.items,
    declarations: draft.declarations,
    supportingDocuments: draft.supportingDocuments,
  };
  const content = stableJson(payload);
  const contentHash = sha256(content);
  const latest = await db.chaCustomsFlatFileGeneration.findFirst({
    where: { profileId: profile.id },
    orderBy: { versionNo: "desc" },
    select: { versionNo: true },
  });
  const versionNo = (latest?.versionNo ?? 0) + 1;
  const generation = await db.chaCustomsFlatFileGeneration.create({
    data: {
      profileId: profile.id,
      versionNo,
      status: "GENERATED",
      checksum: contentHash,
      contentHash,
      fileName: `import-be-${params.jobId}-v${versionNo}.json`,
      generatedById: params.actorId,
      metadata: {
        schemaVersion: "IMPORT_BE_INTERNAL_VERIFIED_FIXTURE_V1",
        validation: draft.flatFile.validation,
        deterministicPayload: payload,
        liveSubmission: false,
      },
    },
  });
  await logChaAudit({
    orgId: params.orgId,
    jobId: params.jobId,
    entityType: "ChaCustomsFlatFileGeneration",
    entityId: generation.id,
    event: "IMPORT_FLAT_FILE_GENERATED",
    actorId: params.actorId,
    remarks: `Generated deterministic import flat-file fixture v${generation.versionNo}.`,
  });
  return generation;
}

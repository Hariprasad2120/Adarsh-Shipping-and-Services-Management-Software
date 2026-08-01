import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logChaAudit } from "@/modules/cha/service";
import {
  calculateExportInvoiceTotals,
  calculateExportItemTotals,
} from "./calculations";
import {
  type ResolutionCandidate,
  resolveExportItemSelections,
  resolveSupportingDocumentSelection,
} from "../masters/resolution";
import {
  exportInvoiceDraftSetSchema,
  exportRemainingDraftSchema,
  exportSbMainDraftSchema,
  type ExportContainerDraftInput,
  type ExportInvoiceDraftSetInput,
  type ExportPackageDraftInput,
  type ExportRemainingDraftInput,
  type ExportSbMainDraftInput,
} from "./export-schemas";

type SourceState = "MANUAL" | "ICEGATE";

type SigningConnectorStatus =
  | { status: "AVAILABLE"; mode: "REGISTER_ONLY" | "BRIDGE" }
  | { status: "UNAVAILABLE"; reason: "SIGNING_CONNECTOR_UNAVAILABLE" };

export type ExportSbMainDraftView = Omit<ExportSbMainDraftInput, "lockVersion"> & {
  lockVersion: number;
  sbStatusSource: SourceState;
  sbStatusUpdatedAt: string;
};

export type ExportFilingDraftView = {
  sbMain: ExportSbMainDraftView;
  invoices: ExportInvoiceDraftSetInput["invoices"];
  items: ExportRemainingDraftInput["items"];
  supportingDocuments: ExportRemainingDraftInput["supportingDocuments"];
  checklist: {
    generations: {
      versionNo: number;
      status: string;
      checksum: string | null;
      generatedAt: string;
      checklistId: string | null;
      fileName: string | null;
    }[];
    validation: string[];
    summary: Record<string, string>;
  };
  flatFile: {
    generations: {
      id: string;
      versionNo: number;
      status: string;
      checksum: string;
      contentHash: string;
      generatedAt: string;
      fileName: string | null;
      signingStatus: string | null;
      signedAt: string;
      signatureReference: string | null;
      submissionStatuses: string[];
    }[];
    validation: string[];
    signingConnector: SigningConnectorStatus;
  };
};

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
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDecimal(value: string | null | undefined) {
  if (!value?.trim()) return null;
  return new Prisma.Decimal(value);
}

function decimal(value: string | null | undefined) {
  return value?.trim() ? new Prisma.Decimal(value) : new Prisma.Decimal(0);
}

function jsonText(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const text = (value as { text?: unknown }).text;
  return typeof text === "string" ? text : "";
}

function jsonTextValue(value: string) {
  return value.trim() ? { text: value.trim() } : Prisma.JsonNull;
}

function arraySnapshot<T>(value: Prisma.JsonValue | null | undefined, key: string): T[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const rows = (value as Record<string, unknown>)[key];
  return Array.isArray(rows) ? (rows as T[]) : [];
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

function toSingleWindowLookupResults(
  candidates: ResolutionCandidate[] | undefined,
) {
  return (candidates ?? []).map((candidate) => ({
    ...candidate,
    source: {
      datasetVersion: candidate.datasetVersion,
      sourceName: candidate.sourceName,
      sourceReference: candidate.sourceReference,
      effectiveDate: candidate.sourceEffectiveDate,
    },
  }));
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function calculateStatus(rows: unknown[]) {
  return rows.length > 0 ? "IN_PROGRESS" : "NOT_STARTED";
}

function calculateSbCompletion(input: ExportSbMainDraftInput): "COMPLETE" | "IN_PROGRESS" {
  const required = [
    input.jobDate,
    input.sbType,
    input.transportMode,
    input.customsHouse,
    input.customsHouseCode,
    input.exporterNameSnapshot,
    input.exporterIecSnapshot,
    input.consigneeNameSnapshot,
    input.consigneeCountrySnapshot,
    input.portOfDischarge,
    input.portOfDestination,
    input.destinationCountry,
  ];
  return required.every((value) => String(value ?? "").trim()) ? "COMPLETE" : "IN_PROGRESS";
}

function getSigningConnectorStatus(): SigningConnectorStatus {
  const mode = process.env.CHA_CUSTOMS_SIGNING_CONNECTOR_MODE?.trim().toUpperCase();
  if (mode === "REGISTER_ONLY") return { status: "AVAILABLE", mode: "REGISTER_ONLY" };
  if (mode === "BRIDGE") return { status: "AVAILABLE", mode: "BRIDGE" };
  return { status: "UNAVAILABLE", reason: "SIGNING_CONNECTOR_UNAVAILABLE" };
}

function blankSbMain(jobDate = "", lockVersion = 1): ExportSbMainDraftView {
  return {
    lockVersion,
    jobDate,
    sbType: "",
    transportMode: "",
    bookingNo: "",
    bookingDate: "",
    customsHouse: "",
    customsHouseCode: "",
    sbNumber: "",
    sbDate: "",
    examinationDate: "",
    leoDate: "",
    sbStatusSource: "MANUAL",
    sbStatusUpdatedAt: "",
    icegateIdSnapshot: "",
    chaExporterPanSnapshot: "",
    standardIec: true,
    exporterNameSnapshot: "",
    exporterIecSnapshot: "",
    exporterBranchSerialNo: "",
    exporterType: "",
    exporterClass: "",
    exporterAddressSnapshot: "",
    exporterAdCodeSnapshot: "",
    exporterCitySnapshot: "",
    exporterStateSnapshot: "",
    exporterPinCodeSnapshot: "",
    nfei: "",
    benefitTo: "",
    exporterOriginState: "",
    exporterGstnType: "",
    exporterTaxRegistrationNo: "",
    moowr: "",
    consigneeNameSnapshot: "",
    consigneeAddressSnapshot: "",
    consigneeCountrySnapshot: "",
    portOfDischarge: "",
    portOfDischargeCode: "",
    dischargeCountry: "",
    dischargeCountryCode: "",
    portOfDestination: "",
    portOfDestinationCode: "",
    destinationCountry: "",
    destinationCountryCode: "",
    natureOfCargo: "",
    sealType: "",
    numberOfContainers: "",
    grossWeight: "",
    netWeight: "",
    uom: "",
    numberOfPackages: "",
    packageCode: "",
    loosePackage: "",
    mawbNo: "",
    mawbDate: "",
    hawbNo: "",
    hawbDate: "",
    marksAndNos: "",
    rotationStuffingText: "",
    eouDetailsText: "",
    packageRows: [],
    containerRows: [],
  };
}

async function buildExportValidationMessages(params: {
  orgId: string;
  sbMain: ExportSbMainDraftView;
  invoices: ExportInvoiceDraftSetInput["invoices"];
  items: ExportRemainingDraftInput["items"];
  supportingDocuments: ExportRemainingDraftInput["supportingDocuments"];
}) {
  const messages: string[] = [];
  if (!params.sbMain.exporterNameSnapshot) messages.push("Exporter snapshot is missing.");
  if (!params.sbMain.sbType) messages.push("SB Type is missing.");
  if (!params.sbMain.consigneeNameSnapshot) messages.push("Consignee snapshot is missing.");
  if (params.invoices.length === 0) messages.push("At least one export invoice is required.");
  if (params.items.length === 0) messages.push("At least one export item is required.");
  for (const item of params.items) {
    if (item.invoiceSequenceNo && !params.invoices.some((invoice) => invoice.sequenceNo === item.invoiceSequenceNo)) {
      messages.push(`Item ${item.sequenceNo} references missing invoice ${item.invoiceSequenceNo}.`);
    }
  }
  for (const document of params.supportingDocuments) {
    if (document.invoiceSequenceNo && !params.invoices.some((invoice) => invoice.sequenceNo === document.invoiceSequenceNo)) {
      messages.push(`Supporting document ${document.sequenceNo} references missing invoice ${document.invoiceSequenceNo}.`);
    }
    if (document.itemSequenceNo && !params.items.some((item) => item.sequenceNo === document.itemSequenceNo)) {
      messages.push(`Supporting document ${document.sequenceNo} references missing item ${document.itemSequenceNo}.`);
    }
  }

  for (const invoice of params.invoices) {
    const calculation = calculateExportInvoiceTotals(invoice);
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
      resolveExportItemSelections(params.orgId, item),
      Promise.resolve(calculateExportItemTotals(item, linkedInvoice)),
    ]);
    for (const [label, value] of Object.entries(resolution)) {
      if ("status" in value && value.status !== "resolved") {
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
      messages.push(`Supporting document ${document.sequenceNo}: ${resolution.document.requirement}`);
    }
  }
  return messages;
}

function buildChecklistSummary(draft: {
  sbMain: ExportSbMainDraftView;
  invoices: ExportInvoiceDraftSetInput["invoices"];
  items: ExportRemainingDraftInput["items"];
  jobNumber: string;
}) {
  const invoiceTotalFc = draft.invoices.reduce((sum, invoice) => sum.plus(decimal(invoice.invoiceValueFc)), new Prisma.Decimal(0));
  const invoiceTotalInr = draft.invoices.reduce((sum, invoice) => sum.plus(decimal(invoice.invoiceValueInr)), new Prisma.Decimal(0));
  const fobTotalFc = draft.invoices.reduce((sum, invoice) => sum.plus(decimal(invoice.fobValueFc)), new Prisma.Decimal(0));
  const fobTotalInr = draft.invoices.reduce((sum, invoice) => sum.plus(decimal(invoice.fobValueInr)), new Prisma.Decimal(0));
  const drawbackTotal = draft.items.reduce((sum, item) => sum.plus(decimal(item.drawbackAmount)), new Prisma.Decimal(0));
  const rodtepTotal = draft.items.reduce((sum, item) => sum.plus(decimal(item.rodtepAmount)), new Prisma.Decimal(0));
  const rosctlTotal = draft.items.reduce((sum, item) => sum.plus(decimal(item.rosctlAmount)), new Prisma.Decimal(0));
  const taxableValue = draft.items.reduce((sum, item) => sum.plus(decimal(item.taxableValue)), new Prisma.Decimal(0));
  const igstAmount = draft.items.reduce((sum, item) => sum.plus(decimal(item.igstAmount)), new Prisma.Decimal(0));
  const schemes = Array.from(new Set(draft.items.map((item) => item.schemeCode).filter(Boolean)));
  return {
    jobNumber: draft.jobNumber,
    sbType: draft.sbMain.sbType,
    icegateId: draft.sbMain.icegateIdSnapshot,
    transportMode: draft.sbMain.transportMode,
    customsHouse: `${draft.sbMain.customsHouse}${draft.sbMain.customsHouseCode ? ` (${draft.sbMain.customsHouseCode})` : ""}`,
    discharge: `${draft.sbMain.portOfDischarge} / ${draft.sbMain.dischargeCountry}`,
    destination: `${draft.sbMain.portOfDestination} / ${draft.sbMain.destinationCountry}`,
    cargo: draft.sbMain.natureOfCargo,
    packageWeight: `${draft.sbMain.numberOfPackages || "0"} pkg / ${draft.sbMain.grossWeight || "0"} gross / ${draft.sbMain.netWeight || "0"} net`,
    containerCount: draft.sbMain.numberOfContainers || String(draft.sbMain.containerRows.length),
    exporter: `${draft.sbMain.exporterNameSnapshot} / ${draft.sbMain.exporterIecSnapshot}`,
    exporterAddress: draft.sbMain.exporterAddressSnapshot,
    exporterAdGst: `${draft.sbMain.exporterAdCodeSnapshot || "-"} / ${draft.sbMain.exporterTaxRegistrationNo || "-"}`,
    consignee: draft.sbMain.consigneeNameSnapshot,
    invoiceCurrencyRate: draft.invoices.map((invoice) => `${invoice.currency || "-"} @ ${invoice.exchangeRate || "-"}`).join(", "),
    incoterm: Array.from(new Set(draft.invoices.map((invoice) => invoice.incoTerms).filter(Boolean))).join(", "),
    totalInvoices: String(draft.invoices.length),
    totalItems: String(draft.items.length),
    scheme: schemes.join(", "),
    totalInvoiceFc: invoiceTotalFc.toFixed(),
    totalInvoiceInr: invoiceTotalInr.toFixed(),
    totalFobFc: fobTotalFc.toFixed(),
    totalFobInr: fobTotalInr.toFixed(),
    drawback: drawbackTotal.toFixed(),
    rodtep: rodtepTotal.toFixed(),
    rosctl: rosctlTotal.toFixed(),
    taxableValue: taxableValue.toFixed(),
    igst: igstAmount.toFixed(),
  };
}

async function getExportProfileForSave(orgId: string, jobId: string) {
  const profile = await db.chaCustomsFilingProfile.findFirst({
    where: {
      jobId,
      movementDirection: "EXPORT",
      job: { orgId, deletedAt: null },
    },
    select: { id: true, lockVersion: true },
  });
  if (!profile) throw new Error("Export customs filing profile is unavailable for this job.");
  return profile;
}

export async function getExportFilingDraft(profileId: string): Promise<ExportFilingDraftView> {
  const profile = await db.chaCustomsFilingProfile.findUnique({
    where: { id: profileId },
    select: {
      lockVersion: true,
      transportMode: true,
      customsHouse: true,
      customsHouseCode: true,
      job: { select: { createdAt: true, jobNumber: true, orgId: true } },
      exportHeader: true,
      exportInvoices: {
        include: { charges: { orderBy: { sequenceNo: "asc" } } },
        orderBy: { sequenceNo: "asc" },
      },
      exportItems: { orderBy: { sequenceNo: "asc" } },
      exportDocuments: { orderBy: { sequenceNo: "asc" } },
      checklistGenerations: { orderBy: { versionNo: "desc" }, take: 10 },
      flatFileGenerations: {
        orderBy: { versionNo: "desc" },
        take: 10,
        include: { submissions: { select: { status: true } } },
      },
    },
  });

  const header = profile?.exportHeader;
  const annexure = header?.annexureCSnapshot && typeof header.annexureCSnapshot === "object" && !Array.isArray(header.annexureCSnapshot)
    ? header.annexureCSnapshot as Record<string, unknown>
    : {};
  const sbMain = header
    ? {
        ...blankSbMain(toIsoDate(profile?.job.createdAt), profile?.lockVersion ?? 1),
        sbType: header.sbType ?? "",
        transportMode: profile?.transportMode ?? "",
        bookingNo: header.bookingNo ?? "",
        bookingDate: toIsoDate(header.bookingDate),
        customsHouse: profile?.customsHouse ?? "",
        customsHouseCode: profile?.customsHouseCode ?? "",
        sbNumber: header.sbNumber ?? "",
        sbDate: toIsoDate(header.sbDate),
        examinationDate: toIsoDate(header.examinationDate),
        leoDate: toIsoDate(header.leoDate),
        sbStatusSource: "MANUAL" as const,
        sbStatusUpdatedAt: header.updatedAt.toISOString(),
        icegateIdSnapshot: header.icegateIdSnapshot ?? "",
        chaExporterPanSnapshot: header.chaExporterPanSnapshot ?? "",
        exporterNameSnapshot: header.exporterNameSnapshot ?? "",
        exporterIecSnapshot: header.exporterIecSnapshot ?? "",
        exporterBranchSerialNo: header.exporterBranchSerialNo ?? "",
        exporterType: header.exporterType ?? "",
        exporterClass: header.exporterClass ?? "",
        exporterAddressSnapshot: header.exporterAddressSnapshot ?? "",
        exporterAdCodeSnapshot: header.exporterAdCodeSnapshot ?? "",
        exporterCitySnapshot: header.exporterCitySnapshot ?? "",
        exporterStateSnapshot: header.exporterStateSnapshot ?? "",
        exporterPinCodeSnapshot: header.exporterPinCodeSnapshot ?? "",
        exporterOriginState: header.exporterOriginState ?? "",
        exporterGstnType: header.exporterGstnType ?? "",
        exporterTaxRegistrationNo: header.exporterTaxRegistrationNo ?? "",
        consigneeNameSnapshot: header.consigneeNameSnapshot ?? "",
        consigneeAddressSnapshot: header.consigneeAddressSnapshot ?? "",
        consigneeCountrySnapshot: header.consigneeCountrySnapshot ?? "",
        portOfDischarge: header.portOfDischarge ?? "",
        portOfDischargeCode: header.portOfDischargeCode ?? "",
        dischargeCountry: header.dischargeCountry ?? "",
        dischargeCountryCode: typeof annexure.dischargeCountryCode === "string" ? annexure.dischargeCountryCode : "",
        portOfDestination: header.portOfDestination ?? "",
        portOfDestinationCode: header.portOfDestinationCode ?? "",
        destinationCountry: header.destinationCountry ?? "",
        destinationCountryCode: typeof annexure.destinationCountryCode === "string" ? annexure.destinationCountryCode : "",
        nfei: typeof annexure.nfei === "string" ? annexure.nfei : "",
        benefitTo: typeof annexure.benefitTo === "string" ? annexure.benefitTo : "",
        moowr: typeof annexure.moowr === "string" ? annexure.moowr : "",
        natureOfCargo: typeof annexure.natureOfCargo === "string" ? annexure.natureOfCargo : "",
        sealType: typeof annexure.sealType === "string" ? annexure.sealType : "",
        numberOfContainers: typeof annexure.numberOfContainers === "string" ? annexure.numberOfContainers : "",
        grossWeight: typeof annexure.grossWeight === "string" ? annexure.grossWeight : "",
        netWeight: typeof annexure.netWeight === "string" ? annexure.netWeight : "",
        uom: typeof annexure.uom === "string" ? annexure.uom : "",
        numberOfPackages: typeof annexure.numberOfPackages === "string" ? annexure.numberOfPackages : "",
        packageCode: typeof annexure.packageCode === "string" ? annexure.packageCode : "",
        loosePackage: typeof annexure.loosePackage === "string" ? annexure.loosePackage : "",
        mawbNo: typeof annexure.mawbNo === "string" ? annexure.mawbNo : "",
        mawbDate: typeof annexure.mawbDate === "string" ? annexure.mawbDate : "",
        hawbNo: typeof annexure.hawbNo === "string" ? annexure.hawbNo : "",
        hawbDate: typeof annexure.hawbDate === "string" ? annexure.hawbDate : "",
        marksAndNos: typeof annexure.marksAndNos === "string" ? annexure.marksAndNos : "",
        rotationStuffingText: jsonText(header.packageSnapshot),
        eouDetailsText: jsonText(header.eouSnapshot),
        packageRows: arraySnapshot<ExportPackageDraftInput>(header.packageSnapshot, "rows"),
        containerRows: arraySnapshot<ExportContainerDraftInput>(header.containerSnapshot, "rows"),
      }
    : blankSbMain(toIsoDate(profile?.job.createdAt), profile?.lockVersion ?? 1);

  const invoices = (profile?.exportInvoices ?? []).map((invoice) => {
    const buyer = invoice.buyerSnapshot && typeof invoice.buyerSnapshot === "object" && !Array.isArray(invoice.buyerSnapshot)
      ? invoice.buyerSnapshot as Record<string, unknown>
      : {};
    const totals = invoice.charges.find((charge) => charge.chargeType === "CALCULATED_TOTALS")?.rawSnapshot as Record<string, unknown> | undefined;
    return {
      sequenceNo: invoice.sequenceNo,
      invoiceNo: invoice.invoiceNo,
      invoiceDate: toIsoDate(invoice.invoiceDate),
      contractNo: invoice.contractNo ?? "",
      natureOfPayment: invoice.natureOfPayment ?? "",
      periodOfPayment: invoice.periodOfPayment ?? "",
      currency: invoice.currency ?? "",
      exchangeRate: decimalToString(invoice.exchangeRate),
      productValue: decimalToString(invoice.productValue),
      productValueInr: decimalToString(invoice.productValueInr),
      incoTerms: invoice.incoTerms ?? "",
      addFreight: invoice.addFreight ?? "",
      sameAsConsignee: buyer.sameAsConsignee === true,
      buyerNameSnapshot: typeof buyer.name === "string" ? buyer.name : "",
      buyerAddressSnapshot: typeof buyer.address === "string" ? buyer.address : "",
      buyerCountrySnapshot: typeof buyer.country === "string" ? buyer.country : "",
      thirdPartyText: jsonText(invoice.thirdPartySnapshot),
      aeoText: jsonText(invoice.aeoSnapshot),
      invoiceValueFc: typeof totals?.invoiceValueFc === "string" ? totals.invoiceValueFc : decimalToString(invoice.productValue),
      invoiceValueInr: typeof totals?.invoiceValueInr === "string" ? totals.invoiceValueInr : decimalToString(invoice.productValueInr),
      fobValueFc: typeof totals?.fobValueFc === "string" ? totals.fobValueFc : decimalToString(invoice.productValue),
      fobValueInr: typeof totals?.fobValueInr === "string" ? totals.fobValueInr : decimalToString(invoice.productValueInr),
      calculationOverrideReason: typeof totals?.overrideReason === "string" ? totals.overrideReason : "",
      charges: invoice.charges
        .filter((charge) => charge.chargeType !== "CALCULATED_TOTALS")
        .map((charge) => ({
          sequenceNo: charge.sequenceNo,
          chargeType: charge.chargeType,
          currency: charge.currency ?? "",
          exchangeRate: decimalToString(charge.exchangeRate),
          rate: decimalToString(charge.rate),
          amount: decimalToString(charge.amount),
          amountInr: decimalToString(charge.amountInr),
          isDeduction: charge.isDeduction,
        })),
    };
  });

  const items = (profile?.exportItems ?? []).map((item) => {
    const singleWindow = item.singleWindowSnapshot && typeof item.singleWindowSnapshot === "object" && !Array.isArray(item.singleWindowSnapshot)
      ? item.singleWindowSnapshot as Record<string, unknown>
      : {};
    const drawback = item.drawbackSnapshot && typeof item.drawbackSnapshot === "object" && !Array.isArray(item.drawbackSnapshot)
      ? item.drawbackSnapshot as Record<string, unknown>
      : {};
    const rodtep = item.rodtepSnapshot && typeof item.rodtepSnapshot === "object" && !Array.isArray(item.rodtepSnapshot)
      ? item.rodtepSnapshot as Record<string, unknown>
      : {};
    const rosctl = item.rosctlSnapshot && typeof item.rosctlSnapshot === "object" && !Array.isArray(item.rosctlSnapshot)
      ? item.rosctlSnapshot as Record<string, unknown>
      : {};
    return {
      sequenceNo: item.sequenceNo,
      invoiceSequenceNo: item.invoiceSequenceNo,
      invoiceNoSnapshot: typeof singleWindow.invoiceNoSnapshot === "string" ? singleWindow.invoiceNoSnapshot : "",
      totalProductCount: typeof singleWindow.totalProductCount === "number" ? singleWindow.totalProductCount : 0,
      productSequenceNo: item.productSequenceNo,
      ritcNo: item.ritcNo ?? "",
      itemDescription: item.itemDescription ?? "",
      schemeCode: item.schemeCode ?? "",
      quantity: decimalToString(item.quantity),
      unit: item.unit ?? "",
      measurementUqc: typeof singleWindow.measurementUqc === "string" ? singleWindow.measurementUqc : "",
      unitPrice: decimalToString(item.unitPrice),
      priceUnit: typeof singleWindow.priceUnit === "string" ? singleWindow.priceUnit : "",
      per: decimalToString(item.per),
      itemAmount: decimalToString(item.itemAmount),
      itemAmountInr: decimalToString(item.itemAmountInr),
      totalPmv: decimalToString(item.totalPmv),
      endUse: item.endUse ?? "",
      state: typeof singleWindow.state === "string" ? singleWindow.state : "",
      district: typeof singleWindow.district === "string" ? singleWindow.district : "",
      fta: typeof singleWindow.fta === "string" ? singleWindow.fta : "",
      cess: typeof singleWindow.cess === "string" ? singleWindow.cess : "",
      additionalDetails: typeof singleWindow.additionalDetails === "string" ? singleWindow.additionalDetails : "",
      rodtepCode: typeof singleWindow.rodtepCode === "string" ? singleWindow.rodtepCode : "",
      singleWindowType: typeof singleWindow.singleWindowType === "string" ? singleWindow.singleWindowType : "",
      singleWindowQfr: typeof singleWindow.singleWindowQfr === "string" ? singleWindow.singleWindowQfr : "",
      singleWindowCode: typeof singleWindow.singleWindowCode === "string" ? singleWindow.singleWindowCode : "",
      singleWindowText: typeof singleWindow.singleWindowText === "string" ? singleWindow.singleWindowText : "",
      singleWindowMeasurement: typeof singleWindow.singleWindowMeasurement === "string" ? singleWindow.singleWindowMeasurement : "",
      singleWindowUqc: typeof singleWindow.singleWindowUqc === "string" ? singleWindow.singleWindowUqc : "",
      gstPaymentStatus: typeof singleWindow.gstPaymentStatus === "string" ? singleWindow.gstPaymentStatus : "",
      gstIgstOn: typeof singleWindow.gstIgstOn === "string" ? singleWindow.gstIgstOn : "",
      taxableValue: decimalToString(item.taxableValue),
      igstRate: decimalToString(item.igstRate),
      igstAmount: decimalToString(item.igstAmount),
      drawbackScheduleNo: typeof drawback.drawbackScheduleNo === "string" ? drawback.drawbackScheduleNo : "",
      drawbackQuantity: typeof drawback.drawbackQuantity === "string" ? drawback.drawbackQuantity : "",
      drawbackRatePercent: typeof drawback.drawbackRatePercent === "string" ? drawback.drawbackRatePercent : "",
      drawbackCapInInr: typeof drawback.drawbackCapInInr === "string" ? drawback.drawbackCapInInr : "",
      drawbackUqc: typeof drawback.drawbackUqc === "string" ? drawback.drawbackUqc : "",
      drawbackAmount: typeof drawback.drawbackAmount === "string" ? drawback.drawbackAmount : "",
      rosctlRate: typeof rosctl.rosctlRate === "string" ? rosctl.rosctlRate : "",
      rosctlSpecificRate: typeof rosctl.rosctlSpecificRate === "string" ? rosctl.rosctlSpecificRate : "",
      rosctlAmount: typeof rosctl.rosctlAmount === "string" ? rosctl.rosctlAmount : "",
      rodtepRate: typeof rodtep.rodtepRate === "string" ? rodtep.rodtepRate : "",
      rodtepCap: typeof rodtep.rodtepCap === "string" ? rodtep.rodtepCap : "",
      rodtepQuantity: typeof rodtep.rodtepQuantity === "string" ? rodtep.rodtepQuantity : "",
      rodtepUqc: typeof rodtep.rodtepUqc === "string" ? rodtep.rodtepUqc : "",
      rodtepAmount: typeof rodtep.rodtepAmount === "string" ? rodtep.rodtepAmount : "",
      reward: typeof singleWindow.reward === "string" ? singleWindow.reward : "",
      thirdParty: typeof singleWindow.thirdParty === "string" ? singleWindow.thirdParty : "",
      manufacturer: typeof singleWindow.manufacturer === "string" ? singleWindow.manufacturer : "",
      quota: typeof singleWindow.quota === "string" ? singleWindow.quota : "",
      ar4: typeof singleWindow.ar4 === "string" ? singleWindow.ar4 : "",
      jobWork: typeof singleWindow.jobWork === "string" ? singleWindow.jobWork : "",
      reExport: typeof singleWindow.reExport === "string" ? singleWindow.reExport : "",
      license: typeof singleWindow.license === "string" ? singleWindow.license : "",
      eouDetails: typeof singleWindow.eouDetails === "string" ? singleWindow.eouDetails : "",
      declaration: typeof singleWindow.declaration === "string" ? singleWindow.declaration : "",
      cessOption: typeof singleWindow.cessOption === "string" ? singleWindow.cessOption : "",
    };
  });

  const supportingDocuments = (profile?.exportDocuments ?? []).map((document) => {
    const raw = document.rawSnapshot && typeof document.rawSnapshot === "object" && !Array.isArray(document.rawSnapshot)
      ? document.rawSnapshot as Record<string, unknown>
      : {};
    return {
      sequenceNo: document.sequenceNo,
      documentCode: document.documentCode,
      documentNameSnapshot: document.documentNameSnapshot ?? "",
      irnNo: document.irnNo ?? "",
      drnNo: document.drnNo ?? "",
      issueDate: toIsoDate(document.issueDate),
      declarationType: document.declarationType ?? "",
      fileType: document.fileType ?? "",
      placeOfIssue: document.placeOfIssue ?? "",
      invoiceSequenceNo: document.invoiceSequenceNo,
      itemSequenceNo: document.itemSequenceNo,
      expiryDate: toIsoDate(document.expiryDate),
      invoiceNoSnapshot: typeof raw.invoiceNoSnapshot === "string" ? raw.invoiceNoSnapshot : "",
      icegateIdSnapshot: document.icegateIdSnapshot ?? "",
      issuingPartyCode: document.issuingPartyCode ?? "",
      issuingPartyNameSnapshot: document.issuingPartyNameSnapshot ?? "",
      issuingPartyAddressSnapshot: document.issuingPartyAddressSnapshot ?? "",
      issuingPartyCitySnapshot: typeof raw.issuingPartyCitySnapshot === "string" ? raw.issuingPartyCitySnapshot : "",
      issuingPartyPinSnapshot: typeof raw.issuingPartyPinSnapshot === "string" ? raw.issuingPartyPinSnapshot : "",
      beneficiaryCode: document.beneficiaryCode ?? "",
      beneficiaryNameSnapshot: document.beneficiaryNameSnapshot ?? "",
      beneficiaryAddressSnapshot: document.beneficiaryAddressSnapshot ?? "",
      beneficiaryCitySnapshot: typeof raw.beneficiaryCitySnapshot === "string" ? raw.beneficiaryCitySnapshot : "",
      beneficiaryPinSnapshot: typeof raw.beneficiaryPinSnapshot === "string" ? raw.beneficiaryPinSnapshot : "",
      documentVersionId: document.documentVersionId ?? "",
    };
  });

  const checklistSummary = buildChecklistSummary({
    jobNumber: profile?.job.jobNumber ?? "",
    sbMain,
    invoices,
    items,
  });
  const validation = await buildExportValidationMessages({
    orgId: profile?.job.orgId ?? "",
    sbMain,
    invoices,
    items,
    supportingDocuments,
  });
  return {
    sbMain,
    invoices,
    items,
    supportingDocuments,
    checklist: {
      generations: (profile?.checklistGenerations ?? []).map((generation) => ({
        versionNo: generation.versionNo,
        status: generation.status,
        checksum: generation.checksum,
        generatedAt: generation.generatedAt.toISOString(),
        checklistId: generation.checklistId,
        fileName: generation.fileName,
      })),
      validation,
      summary: checklistSummary,
    },
    flatFile: {
      generations: (profile?.flatFileGenerations ?? []).map((generation) => ({
        id: generation.id,
        versionNo: generation.versionNo,
        status: generation.status,
        checksum: generation.checksum,
        contentHash: generation.contentHash,
        generatedAt: generation.generatedAt.toISOString(),
        fileName: generation.fileName,
        signingStatus: generation.signingStatus,
        signedAt: toIsoDate(generation.signedAt),
        signatureReference: generation.signatureReference,
        submissionStatuses: generation.submissions.map((submission) => submission.status),
      })),
      validation,
      signingConnector: getSigningConnectorStatus(),
    },
  };
}

export async function saveExportSbMainDraft(params: {
  actorId: string;
  orgId: string;
  jobId: string;
  input: unknown;
}) {
  const input = exportSbMainDraftSchema.parse(params.input);
  const profile = await getExportProfileForSave(params.orgId, params.jobId);
  const status = calculateSbCompletion(input);

  await db.$transaction(async (tx) => {
    const update = await tx.chaCustomsFilingProfile.updateMany({
      where: { id: profile.id, lockVersion: input.lockVersion },
      data: {
        lockVersion: { increment: 1 },
        currentDraftVersion: { increment: 1 },
        sbMainStatus: status,
        transportMode: input.transportMode || null,
        customsHouse: input.customsHouse || null,
        customsHouseCode: input.customsHouseCode || null,
        updatedById: params.actorId,
      },
    });
    if (update.count !== 1) throw new Error("CONCURRENCY_CONFLICT");

    const packageSnapshot = {
      text: input.rotationStuffingText,
      rows: input.packageRows,
      rulesetVersion: "EXPORT_SB_DRAFT_V1",
    };
    const containerSnapshot = {
      rows: input.containerRows,
      rulesetVersion: "EXPORT_SB_DRAFT_V1",
    };
    const eouSnapshot = {
      text: input.eouDetailsText,
      rulesetVersion: "EXPORT_SB_DRAFT_V1",
    };
    const annexureCSnapshot = {
      nfei: input.nfei,
      benefitTo: input.benefitTo,
      moowr: input.moowr,
      dischargeCountryCode: input.dischargeCountryCode,
      destinationCountryCode: input.destinationCountryCode,
      natureOfCargo: input.natureOfCargo,
      sealType: input.sealType,
      numberOfContainers: input.numberOfContainers,
      grossWeight: input.grossWeight,
      netWeight: input.netWeight,
      uom: input.uom,
      numberOfPackages: input.numberOfPackages,
      packageCode: input.packageCode,
      loosePackage: input.loosePackage,
      mawbNo: input.mawbNo,
      mawbDate: input.mawbDate,
      hawbNo: input.hawbNo,
      hawbDate: input.hawbDate,
      marksAndNos: input.marksAndNos,
      rulesetVersion: "EXPORT_SB_DRAFT_V1",
    };

    await tx.chaExportFilingHeader.upsert({
      where: { profileId: profile.id },
      update: {
        sbType: input.sbType || null,
        sbNumber: input.sbNumber || null,
        sbDate: parseDate(input.sbDate),
        bookingNo: input.bookingNo || null,
        bookingDate: parseDate(input.bookingDate),
        examinationDate: parseDate(input.examinationDate),
        leoDate: parseDate(input.leoDate),
        icegateIdSnapshot: input.icegateIdSnapshot || null,
        chaExporterPanSnapshot: input.chaExporterPanSnapshot || null,
        exporterNameSnapshot: input.exporterNameSnapshot || null,
        exporterIecSnapshot: input.exporterIecSnapshot || null,
        exporterBranchSerialNo: input.exporterBranchSerialNo || null,
        exporterType: input.exporterType || null,
        exporterClass: input.exporterClass || null,
        exporterAddressSnapshot: input.exporterAddressSnapshot || null,
        exporterCitySnapshot: input.exporterCitySnapshot || null,
        exporterStateSnapshot: input.exporterStateSnapshot || null,
        exporterPinCodeSnapshot: input.exporterPinCodeSnapshot || null,
        exporterAdCodeSnapshot: input.exporterAdCodeSnapshot || null,
        exporterOriginState: input.exporterOriginState || null,
        exporterGstnType: input.exporterGstnType || null,
        exporterTaxRegistrationNo: input.exporterTaxRegistrationNo || null,
        consigneeNameSnapshot: input.consigneeNameSnapshot || null,
        consigneeAddressSnapshot: input.consigneeAddressSnapshot || null,
        consigneeCountrySnapshot: input.consigneeCountrySnapshot || null,
        portOfDischarge: input.portOfDischarge || null,
        portOfDischargeCode: input.portOfDischargeCode || null,
        dischargeCountry: input.dischargeCountry || null,
        portOfDestination: input.portOfDestination || null,
        portOfDestinationCode: input.portOfDestinationCode || null,
        destinationCountry: input.destinationCountry || null,
        annexureCSnapshot,
        packageSnapshot,
        containerSnapshot,
        eouSnapshot,
      },
      create: {
        profileId: profile.id,
        sbType: input.sbType || null,
        sbNumber: input.sbNumber || null,
        sbDate: parseDate(input.sbDate),
        bookingNo: input.bookingNo || null,
        bookingDate: parseDate(input.bookingDate),
        examinationDate: parseDate(input.examinationDate),
        leoDate: parseDate(input.leoDate),
        icegateIdSnapshot: input.icegateIdSnapshot || null,
        chaExporterPanSnapshot: input.chaExporterPanSnapshot || null,
        exporterNameSnapshot: input.exporterNameSnapshot || null,
        exporterIecSnapshot: input.exporterIecSnapshot || null,
        exporterBranchSerialNo: input.exporterBranchSerialNo || null,
        exporterType: input.exporterType || null,
        exporterClass: input.exporterClass || null,
        exporterAddressSnapshot: input.exporterAddressSnapshot || null,
        exporterCitySnapshot: input.exporterCitySnapshot || null,
        exporterStateSnapshot: input.exporterStateSnapshot || null,
        exporterPinCodeSnapshot: input.exporterPinCodeSnapshot || null,
        exporterAdCodeSnapshot: input.exporterAdCodeSnapshot || null,
        exporterOriginState: input.exporterOriginState || null,
        exporterGstnType: input.exporterGstnType || null,
        exporterTaxRegistrationNo: input.exporterTaxRegistrationNo || null,
        consigneeNameSnapshot: input.consigneeNameSnapshot || null,
        consigneeAddressSnapshot: input.consigneeAddressSnapshot || null,
        consigneeCountrySnapshot: input.consigneeCountrySnapshot || null,
        portOfDischarge: input.portOfDischarge || null,
        portOfDischargeCode: input.portOfDischargeCode || null,
        dischargeCountry: input.dischargeCountry || null,
        portOfDestination: input.portOfDestination || null,
        portOfDestinationCode: input.portOfDestinationCode || null,
        destinationCountry: input.destinationCountry || null,
        annexureCSnapshot,
        packageSnapshot,
        containerSnapshot,
        eouSnapshot,
      },
    });
  });

  await logChaAudit({
    orgId: params.orgId,
    jobId: params.jobId,
    entityType: "ChaExportFilingHeader",
    entityId: profile.id,
    event: "EXPORT_SB_MAIN_DRAFT_SAVED",
    actorId: params.actorId,
    remarks: `Export SB Main Details draft saved with ${input.packageRows.length} package row(s) and ${input.containerRows.length} container row(s).`,
  });

  return db.chaCustomsFilingProfile.findUniqueOrThrow({
    where: { id: profile.id },
    select: { lockVersion: true, currentDraftVersion: true, sbMainStatus: true },
  });
}

export async function saveExportInvoiceDraft(params: {
  actorId: string;
  orgId: string;
  jobId: string;
  input: unknown;
}) {
  const input = exportInvoiceDraftSetSchema.parse(params.input);
  const profile = await getExportProfileForSave(params.orgId, params.jobId);
  const invoiceCalculations = new Map(
    input.invoices.map((invoice) => [invoice.sequenceNo, calculateExportInvoiceTotals(invoice)]),
  );

  await db.$transaction(async (tx) => {
    const update = await tx.chaCustomsFilingProfile.updateMany({
      where: { id: profile.id, lockVersion: input.lockVersion },
      data: {
        lockVersion: { increment: 1 },
        currentDraftVersion: { increment: 1 },
        exportInvoiceStatus: calculateStatus(input.invoices),
        updatedById: params.actorId,
      },
    });
    if (update.count !== 1) throw new Error("CONCURRENCY_CONFLICT");

    await tx.chaExportInvoice.deleteMany({ where: { profileId: profile.id } });
    for (const invoice of input.invoices) {
      const calculation = invoiceCalculations.get(invoice.sequenceNo);

      await tx.chaExportInvoice.create({
        data: {
          profileId: profile.id,
          sequenceNo: invoice.sequenceNo,
          invoiceNo: invoice.invoiceNo,
          invoiceDate: parseDate(invoice.invoiceDate),
          contractNo: invoice.contractNo || null,
          natureOfPayment: invoice.natureOfPayment || null,
          periodOfPayment: invoice.periodOfPayment || null,
          currency: invoice.currency || null,
          exchangeRate: parseDecimal(invoice.exchangeRate),
          productValue: parseDecimal(invoice.productValue),
          productValueInr: parseDecimal(invoice.productValueInr),
          incoTerms: invoice.incoTerms || null,
          addFreight: invoice.addFreight || null,
          buyerSnapshot: {
            sameAsConsignee: invoice.sameAsConsignee,
            name: invoice.buyerNameSnapshot,
            address: invoice.buyerAddressSnapshot,
            country: invoice.buyerCountrySnapshot,
          },
          thirdPartySnapshot: jsonTextValue(invoice.thirdPartyText),
          aeoSnapshot: jsonTextValue(invoice.aeoText),
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
                isDeduction: charge.isDeduction,
                rawSnapshot: {
                  rulesetVersion: calculation?.rulesetVersion ?? "EXPORT_SB_INVOICE_DRAFT_V1",
                  sourceExchangeRate: charge.exchangeRate,
                },
              })),
              {
                sequenceNo: invoice.charges.length + 1,
                chargeType: "CALCULATED_TOTALS",
                amount: decimal(calculation?.invoiceValueFc ?? "0"),
                amountInr: decimal(calculation?.invoiceValueInr ?? "0"),
                rawSnapshot: {
                  rulesetVersion: calculation?.rulesetVersion ?? "EXPORT_SB_INVOICE_DRAFT_V1",
                  sourceExchangeRate: invoice.exchangeRate,
                  invoiceValueFc: calculation?.invoiceValueFc ?? "0",
                  invoiceValueInr: calculation?.invoiceValueInr ?? "0",
                  fobValueFc: calculation?.fobValueFc ?? "0",
                  fobValueInr: calculation?.fobValueInr ?? "0",
                  clientInvoiceValueFc: invoice.invoiceValueFc,
                  clientInvoiceValueInr: invoice.invoiceValueInr,
                  clientFobValueFc: invoice.fobValueFc,
                  clientFobValueInr: invoice.fobValueInr,
                  overrideReason: invoice.calculationOverrideReason,
                  requirements: calculation?.requirements ?? [],
                },
              },
            ],
          },
        },
      });
    }
  });

  await logChaAudit({
    orgId: params.orgId,
    jobId: params.jobId,
    entityType: "ChaExportInvoice",
    entityId: profile.id,
    event: "EXPORT_INVOICE_DRAFT_SAVED",
    actorId: params.actorId,
    remarks: `Export invoice draft saved with ${input.invoices.length} invoice row(s).`,
  });

  return db.chaCustomsFilingProfile.findUniqueOrThrow({
    where: { id: profile.id },
    select: { lockVersion: true, currentDraftVersion: true, exportInvoiceStatus: true },
  });
}

export async function saveExportRemainingDraft(params: {
  actorId: string;
  orgId: string;
  jobId: string;
  input: unknown;
}) {
  const input = exportRemainingDraftSchema.parse(params.input);
  const profile = await getExportProfileForSave(params.orgId, params.jobId);

  const itemSnapshots = await Promise.all(
    input.items.map(async (item) => ({
      sequenceNo: item.sequenceNo,
      resolution: await resolveExportItemSelections(params.orgId, item),
      calculation: calculateExportItemTotals(item),
    })),
  );
  const itemSnapshotBySequence = new Map(itemSnapshots.map((row) => [row.sequenceNo, row]));

  const documentSnapshots = await Promise.all(
    input.supportingDocuments.map(async (document) => ({
      sequenceNo: document.sequenceNo,
      resolution: await resolveSupportingDocumentSelection(params.orgId, document),
    })),
  );
  const documentSnapshotBySequence = new Map(documentSnapshots.map((row) => [row.sequenceNo, row]));

  await db.$transaction(async (tx) => {
    const update = await tx.chaCustomsFilingProfile.updateMany({
      where: { id: profile.id, lockVersion: input.lockVersion },
      data: {
        lockVersion: { increment: 1 },
        currentDraftVersion: { increment: 1 },
        exportItemStatus: calculateStatus(input.items),
        exportDocumentStatus: calculateStatus(input.supportingDocuments),
        updatedById: params.actorId,
      },
    });
    if (update.count !== 1) throw new Error("CONCURRENCY_CONFLICT");

    await tx.chaExportSupportingDocument.deleteMany({ where: { profileId: profile.id } });
    await tx.chaExportItem.deleteMany({ where: { profileId: profile.id } });

    const invoiceBySequence = await tx.chaExportInvoice.findMany({
      where: { profileId: profile.id },
      select: { id: true, sequenceNo: true },
    });
    const invoiceIdBySequence = new Map(invoiceBySequence.map((invoice) => [invoice.sequenceNo, invoice.id]));

    if (input.items.length) {
      await tx.chaExportItem.createMany({
        data: input.items.map((item) => {
          const snapshots = itemSnapshotBySequence.get(item.sequenceNo);
          return {
            profileId: profile.id,
            invoiceId: item.invoiceSequenceNo ? invoiceIdBySequence.get(item.invoiceSequenceNo) ?? null : null,
            sequenceNo: item.sequenceNo,
            invoiceSequenceNo: item.invoiceSequenceNo ?? null,
            productSequenceNo: item.productSequenceNo ?? null,
            ritcNo: item.ritcNo || null,
            itemDescription: item.itemDescription || null,
            schemeCode: item.schemeCode || null,
            quantity: parseDecimal(item.quantity),
            unit: item.unit || null,
            unitPrice: parseDecimal(item.unitPrice),
            per: parseDecimal(item.per),
            itemAmount: parseDecimal(item.itemAmount),
            itemAmountInr: parseDecimal(item.itemAmountInr),
            totalPmv: parseDecimal(item.totalPmv),
            endUse: item.endUse || null,
            taxableValue: parseDecimal(item.taxableValue),
            igstRate: parseDecimal(item.igstRate),
            igstAmount: parseDecimal(item.igstAmount),
            drawbackSnapshot: jsonSnapshot({
              drawbackScheduleNo: item.drawbackScheduleNo,
              drawbackQuantity: item.drawbackQuantity,
              drawbackRatePercent: item.drawbackRatePercent,
              drawbackCapInInr: item.drawbackCapInInr,
              drawbackUqc: item.drawbackUqc,
              drawbackAmount: item.drawbackAmount,
              master:
                snapshots?.resolution.drawback.status === "resolved"
                  ? snapshots.resolution.drawback.selected.master
                  : null,
              source:
                snapshots?.resolution.drawback.status === "resolved"
                  ? snapshots.resolution.drawback.selected.source
                  : null,
              resolution: snapshots?.resolution.drawback ?? null,
              rulesetVersion: snapshots?.calculation.rulesetVersion ?? "EXPORT_SB_ITEM_DRAFT_V1",
            }),
            rodtepSnapshot: jsonSnapshot({
              rodtepCode: item.rodtepCode,
              rodtepRate: item.rodtepRate,
              rodtepCap: item.rodtepCap,
              rodtepQuantity: item.rodtepQuantity,
              rodtepUqc: item.rodtepUqc,
              rodtepAmount: item.rodtepAmount,
              master:
                snapshots?.resolution.rodtep.status === "resolved"
                  ? snapshots.resolution.rodtep.selected.master
                  : null,
              source:
                snapshots?.resolution.rodtep.status === "resolved"
                  ? snapshots.resolution.rodtep.selected.source
                  : null,
              resolution: snapshots?.resolution.rodtep ?? null,
              rulesetVersion: snapshots?.calculation.rulesetVersion ?? "EXPORT_SB_ITEM_DRAFT_V1",
            }),
            rosctlSnapshot: jsonSnapshot({
              rosctlRate: item.rosctlRate,
              rosctlSpecificRate: item.rosctlSpecificRate,
              rosctlAmount: item.rosctlAmount,
              master:
                snapshots?.resolution.rosctl.status === "resolved"
                  ? snapshots.resolution.rosctl.selected.master
                  : null,
              source:
                snapshots?.resolution.rosctl.status === "resolved"
                  ? snapshots.resolution.rosctl.selected.source
                  : null,
              resolution: snapshots?.resolution.rosctl ?? null,
              rulesetVersion: snapshots?.calculation.rulesetVersion ?? "EXPORT_SB_ITEM_DRAFT_V1",
            }),
            singleWindowSnapshot: jsonSnapshot({
              invoiceNoSnapshot: item.invoiceNoSnapshot,
              totalProductCount: item.totalProductCount,
              measurementUqc: item.measurementUqc,
              priceUnit: item.priceUnit,
              state: item.state,
              district: item.district,
              fta: item.fta,
              cess: item.cess,
              additionalDetails: item.additionalDetails,
              rodtepCode: item.rodtepCode,
              singleWindowType: item.singleWindowType,
              singleWindowQfr: item.singleWindowQfr,
              singleWindowCode: item.singleWindowCode,
              singleWindowText: item.singleWindowText,
              singleWindowMeasurement: item.singleWindowMeasurement,
              singleWindowUqc: item.singleWindowUqc,
              gstPaymentStatus: item.gstPaymentStatus,
              gstIgstOn: item.gstIgstOn,
              reward: item.reward,
              thirdParty: item.thirdParty,
              manufacturer: item.manufacturer,
              quota: item.quota,
              ar4: item.ar4,
              jobWork: item.jobWork,
              reExport: item.reExport,
              license: item.license,
              eouDetails: item.eouDetails,
              declaration: item.declaration,
              cessOption: item.cessOption,
              lookupResults: toSingleWindowLookupResults(
                snapshots?.resolution.singleWindow.candidates,
              ),
              resolutionStatus: snapshots?.resolution.singleWindow.status ?? "missing",
              resolutionRequirement: snapshots?.resolution.singleWindow.requirement ?? null,
              rulesetVersion: snapshots?.calculation.rulesetVersion ?? "EXPORT_SB_ITEM_DRAFT_V1",
            }),
            masterSnapshot: jsonSnapshot({
              ritc:
                snapshots?.resolution.ritc.status === "resolved"
                  ? snapshots.resolution.ritc.selected
                  : null,
              scheme:
                snapshots?.resolution.scheme.status === "resolved"
                  ? snapshots.resolution.scheme.selected
                  : null,
              uom:
                snapshots?.resolution.uom.status === "resolved"
                  ? snapshots.resolution.uom.selected
                  : null,
              resolution: snapshots?.resolution ?? null,
              calculation: snapshots?.calculation ?? null,
              savedAt: new Date().toISOString(),
              rulesetVersion: snapshots?.calculation.rulesetVersion ?? "EXPORT_SB_ITEM_DRAFT_V1",
            }),
          };
        }),
      });
    }

    if (input.supportingDocuments.length) {
      await tx.chaExportSupportingDocument.createMany({
        data: input.supportingDocuments.map((document) => {
          const snapshot = documentSnapshotBySequence.get(document.sequenceNo);
          return {
            profileId: profile.id,
            sequenceNo: document.sequenceNo,
            documentCode: document.documentCode,
            documentNameSnapshot:
              document.documentNameSnapshot ||
              (snapshot?.resolution.document.status === "resolved"
                ? String(
                    snapshot.resolution.document.selected.master.documentName ??
                    snapshot.resolution.document.selected.master.documentDescription ??
                    document.documentCode,
                  )
                : null),
            irnNo: document.irnNo || null,
            drnNo: document.drnNo || null,
            issueDate: parseDate(document.issueDate),
            declarationType: document.declarationType || null,
            fileType: document.fileType || null,
            placeOfIssue: document.placeOfIssue || null,
            invoiceSequenceNo: document.invoiceSequenceNo ?? null,
            itemSequenceNo: document.itemSequenceNo ?? null,
            expiryDate: parseDate(document.expiryDate),
            icegateIdSnapshot: document.icegateIdSnapshot || null,
            issuingPartyCode: document.issuingPartyCode || null,
            issuingPartyNameSnapshot: document.issuingPartyNameSnapshot || null,
            issuingPartyAddressSnapshot: document.issuingPartyAddressSnapshot || null,
            beneficiaryCode: document.beneficiaryCode || null,
            beneficiaryNameSnapshot: document.beneficiaryNameSnapshot || null,
            beneficiaryAddressSnapshot: document.beneficiaryAddressSnapshot || null,
            documentVersionId: document.documentVersionId || null,
            rawSnapshot: jsonSnapshot({
              invoiceNoSnapshot: document.invoiceNoSnapshot,
              issuingPartyCitySnapshot: document.issuingPartyCitySnapshot,
              issuingPartyPinSnapshot: document.issuingPartyPinSnapshot,
              beneficiaryCitySnapshot: document.beneficiaryCitySnapshot,
              beneficiaryPinSnapshot: document.beneficiaryPinSnapshot,
              source:
                snapshot?.resolution.document.status === "resolved"
                  ? snapshot.resolution.document.selected.source
                  : null,
              resolution: snapshot?.resolution.document ?? null,
              rulesetVersion: "EXPORT_SB_DOCUMENT_DRAFT_V1",
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
    event: "EXPORT_REMAINING_DRAFT_SAVED",
    actorId: params.actorId,
    remarks: `Export remaining subtabs saved: ${input.items.length} item(s), ${input.supportingDocuments.length} document row(s).`,
  });

  return db.chaCustomsFilingProfile.findUniqueOrThrow({
    where: { id: profile.id },
    select: {
      lockVersion: true,
      currentDraftVersion: true,
      exportItemStatus: true,
      exportDocumentStatus: true,
    },
  });
}

export async function generateExportChecklistSnapshot(params: {
  actorId: string;
  orgId: string;
  jobId: string;
  lockVersion: number;
  withDeclaration: boolean;
}) {
  const profile = await getExportProfileForSave(params.orgId, params.jobId);
  if (profile.lockVersion !== params.lockVersion) throw new Error("CONCURRENCY_CONFLICT");
  const draft = await getExportFilingDraft(profile.id);
  const summary = buildChecklistSummary({
    jobNumber: draft.checklist.summary.jobNumber ?? "",
    sbMain: draft.sbMain,
    invoices: draft.invoices,
    items: draft.items,
  });
  const content = stableJson({
    kind: "EXPORT_SB_CHECKLIST",
    schemaVersion: "EXPORT_SB_CHECKLIST_DRAFT_V1",
    withDeclaration: params.withDeclaration,
    jobId: params.jobId,
    summary,
    validation: draft.checklist.validation,
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
      fileName: `export-sb-checklist-${params.jobId}-v${(latest?.versionNo ?? 0) + 1}.json`,
      generatedById: params.actorId,
      metadata: {
        schemaVersion: "EXPORT_SB_CHECKLIST_DRAFT_V1",
        withDeclaration: params.withDeclaration,
        summary,
        validation: draft.checklist.validation,
        existingWorkflow: "ChaChecklist",
        requiresApprovalReuse: true,
      },
    },
  });
  await db.chaCustomsFilingProfile.update({
    where: { id: profile.id },
    data: {
      checklistStatus: "IN_PROGRESS",
      currentDraftVersion: { increment: 1 },
      lockVersion: { increment: 1 },
      updatedById: params.actorId,
    },
  });
  await logChaAudit({
    orgId: params.orgId,
    jobId: params.jobId,
    entityType: "ChaCustomsChecklistGeneration",
    entityId: generation.id,
    event: "EXPORT_CHECKLIST_SNAPSHOT_GENERATED",
    actorId: params.actorId,
    remarks: `Generated export checklist snapshot v${generation.versionNo}.`,
  });
  return generation;
}

export async function generateExportFlatFileSnapshot(params: {
  actorId: string;
  orgId: string;
  jobId: string;
  lockVersion: number;
  dummyJob: boolean;
}) {
  const profile = await getExportProfileForSave(params.orgId, params.jobId);
  if (profile.lockVersion !== params.lockVersion) throw new Error("CONCURRENCY_CONFLICT");
  const draft = await getExportFilingDraft(profile.id);
  const sbMainPayload = { ...draft.sbMain };
  delete (sbMainPayload as { lockVersion?: number }).lockVersion;
  const payload = {
    messageType: "SHIPPING_BILL",
    schemaVersion: "EXPORT_SB_INTERNAL_VERIFIED_FIXTURE_V1",
    dummyJob: params.dummyJob,
    liveSubmission: false,
    jobId: params.jobId,
    sbMain: sbMainPayload,
    invoices: draft.invoices,
    items: draft.items,
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
      fileName: `export-sb-${params.jobId}-v${versionNo}${params.dummyJob ? "-dummy" : ""}.json`,
      generatedById: params.actorId,
      metadata: {
        schemaVersion: "EXPORT_SB_INTERNAL_VERIFIED_FIXTURE_V1",
        validation: draft.flatFile.validation,
        deterministicPayload: payload,
        liveSubmission: false,
        dummyJob: params.dummyJob,
      },
    },
  });
  await db.chaCustomsFilingProfile.update({
    where: { id: profile.id },
    data: {
      flatFileStatus: "IN_PROGRESS",
      currentDraftVersion: { increment: 1 },
      lockVersion: { increment: 1 },
      updatedById: params.actorId,
    },
  });
  await logChaAudit({
    orgId: params.orgId,
    jobId: params.jobId,
    entityType: "ChaCustomsFlatFileGeneration",
    entityId: generation.id,
    event: "EXPORT_FLAT_FILE_GENERATED",
    actorId: params.actorId,
    remarks: `Generated export flat-file fixture v${generation.versionNo}${params.dummyJob ? " (dummy)" : ""}.`,
  });
  return generation;
}

export async function requestExportFlatFileSigning(params: {
  actorId: string;
  orgId: string;
  jobId: string;
  generationId: string;
}) {
  const profile = await getExportProfileForSave(params.orgId, params.jobId);
  const generation = await db.chaCustomsFlatFileGeneration.findFirst({
    where: { id: params.generationId, profileId: profile.id },
    select: { id: true, versionNo: true, signingStatus: true },
  });
  if (!generation) throw new Error("Flat-file generation not found.");
  const connector = getSigningConnectorStatus();

  if (connector.status === "UNAVAILABLE") {
    await db.chaCustomsFlatFileGeneration.update({
      where: { id: generation.id },
      data: {
        signingStatus: "CONNECTOR_UNAVAILABLE",
        signatureMetadata: { status: connector.status, reason: connector.reason, checkedAt: new Date().toISOString() },
      },
    });
    return connector;
  }

  await db.chaCustomsFlatFileGeneration.update({
    where: { id: generation.id },
    data: {
      signingStatus: "PENDING_EXTERNAL_SIGN",
      signatureMetadata: { status: connector.status, mode: connector.mode, requestedAt: new Date().toISOString() },
    },
  });
  await logChaAudit({
    orgId: params.orgId,
    jobId: params.jobId,
    entityType: "ChaCustomsFlatFileGeneration",
    entityId: generation.id,
    event: "EXPORT_FLAT_FILE_SIGNING_REQUESTED",
    actorId: params.actorId,
    remarks: `Signing requested for export flat-file v${generation.versionNo}.`,
  });
  return connector;
}

export async function registerExportFlatFileSignature(params: {
  actorId: string;
  orgId: string;
  jobId: string;
  generationId: string;
  signatureReference: string;
}) {
  const profile = await getExportProfileForSave(params.orgId, params.jobId);
  const generation = await db.chaCustomsFlatFileGeneration.findFirst({
    where: { id: params.generationId, profileId: profile.id },
    select: { id: true, versionNo: true, signedAt: true },
  });
  if (!generation) throw new Error("Flat-file generation not found.");
  if (generation.signedAt) throw new Error("This flat-file version is already signed.");
  const updated = await db.chaCustomsFlatFileGeneration.update({
    where: { id: generation.id },
    data: {
      signedAt: new Date(),
      signedById: params.actorId,
      signingStatus: "SIGNED",
      signatureReference: params.signatureReference,
      signatureMetadata: {
        mode: "MANUAL_REGISTERED",
        registeredAt: new Date().toISOString(),
      },
    },
  });
  await logChaAudit({
    orgId: params.orgId,
    jobId: params.jobId,
    entityType: "ChaCustomsFlatFileGeneration",
    entityId: updated.id,
    event: "EXPORT_FLAT_FILE_SIGNATURE_REGISTERED",
    actorId: params.actorId,
    remarks: `Manual signature registered for export flat-file v${updated.versionNo}.`,
  });
  return updated;
}

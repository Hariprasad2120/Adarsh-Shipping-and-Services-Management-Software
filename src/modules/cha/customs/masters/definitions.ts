import { z } from "zod";
import {
  aidcRowSchema,
  bcdRowSchema,
  notificationRowSchema,
  normalizeCode,
  optionalBoolean,
  optionalDate,
  optionalDecimal,
  optionalText,
  ritcRowSchema,
  supportingDocumentRowSchema,
  uomRowSchema,
} from "./schemas";

export const CUSTOMS_MASTER_KEYS = [
  "RITC_TARIFF",
  "CESS_RATE",
  "RODTEP",
  "RODTEP_EOU",
  "ROSCTL",
  "DRAWBACK",
  "SCHEME_CODE",
  "SINGLE_WINDOW_CTH",
  "AIDC",
  "BCD",
  "MASTER_NOTIFICATION",
  "SUPPORTING_DOCUMENT",
  "UOM",
] as const;

export type CustomsMasterKey = (typeof CUSTOMS_MASTER_KEYS)[number];

export type CustomsMasterDefinition = {
  key: CustomsMasterKey;
  label: string;
  delegate: string;
  importRunRelation: string;
  codeField: string;
  businessKeyFields: string[];
  filterableFields: string[];
  sortableFields: string[];
  searchableFields: string[];
  exactLookupFields: string[];
  headers: string[];
  sensitive: boolean;
  schema: z.ZodType<Record<string, unknown>>;
  parseRawRow: (row: Record<string, unknown>, datasetVersion: string) => Record<string, unknown>;
};

function baseRow(row: Record<string, unknown>, datasetVersion: string) {
  return {
    datasetVersion,
    status: optionalText(row.status) ?? "ACTIVE",
    effectiveFrom: optionalDate(row.effectiveFrom ?? row.effectiveDate ?? row.notnEffDate, "effective date"),
    effectiveTo: optionalDate(row.effectiveTo ?? row.endDate ?? row.notnEndDate, "end date"),
  };
}

function text(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = optionalText(row[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function code(row: Record<string, unknown>, field: string, ...aliases: string[]) {
  for (const key of [field, ...aliases]) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return normalizeCode(row[key], field);
    }
  }
  return normalizeCode(undefined, field);
}

const genericRowSchema = z.record(z.string(), z.unknown());
const genericSchemas = {
  CESS_RATE: genericRowSchema,
  RODTEP: genericRowSchema,
  RODTEP_EOU: genericRowSchema,
  ROSCTL: genericRowSchema,
  DRAWBACK: genericRowSchema,
  SCHEME_CODE: genericRowSchema,
  SINGLE_WINDOW_CTH: genericRowSchema,
};

export const CUSTOMS_MASTER_DEFINITIONS: Record<CustomsMasterKey, CustomsMasterDefinition> = {
  RITC_TARIFF: {
    key: "RITC_TARIFF",
    label: "RITC / Tariff Item",
    delegate: "chaRitcTariffMaster",
    importRunRelation: "ritcTariffs",
    codeField: "tariffItem",
    businessKeyFields: ["tariffItem", "datasetVersion"],
    filterableFields: ["tariffItem", "description", "uom", "status", "datasetVersion"],
    sortableFields: ["tariffItem", "description", "uom", "status", "updatedAt"],
    searchableFields: ["tariffItem", "description", "uom"],
    exactLookupFields: ["tariffItem"],
    headers: ["tariffItem", "description", "uom", "importPolicy", "exportPolicy", "sims", "nfmims", "pims", "bis", "tobacco"],
    sensitive: false,
    schema: ritcRowSchema,
    parseRawRow: (row, datasetVersion) => ({
      ...baseRow(row, datasetVersion),
      tariffItem: code(row, "tariffItem", "ritc", "ritcNo", "cth"),
      description: text(row, "description", "itemDescription") ?? "",
      uom: text(row, "uom", "uqc"),
      importPolicy: text(row, "importPolicy"),
      importPolicyCondition: text(row, "importPolicyCondition"),
      exportPolicy: text(row, "exportPolicy"),
      exportPolicyCondition: text(row, "exportPolicyCondition"),
      sims: optionalBoolean(row.sims),
      nfmims: optionalBoolean(row.nfmims),
      pims: optionalBoolean(row.pims),
      bis: optionalBoolean(row.bis),
      tobacco: optionalBoolean(row.tobacco),
    }),
  },
  CESS_RATE: {
    key: "CESS_RATE",
    label: "Cess Rate",
    delegate: "chaCessRateMaster",
    importRunRelation: "cessRates",
    codeField: "ritcCode",
    businessKeyFields: ["ritcCode", "cessSerialNo", "datasetVersion"],
    filterableFields: ["ritcCode", "cessSerialNo", "status", "datasetVersion"],
    sortableFields: ["ritcCode", "cessSerialNo", "status", "updatedAt"],
    searchableFields: ["ritcCode", "cessSerialNo", "cessFlag"],
    exactLookupFields: ["ritcCode"],
    headers: ["ritcCode", "cessSerialNo", "cessFlag", "tarValue", "cessRateAdvance", "cessValue"],
    sensitive: true,
    schema: genericSchemas.CESS_RATE,
    parseRawRow: (row, datasetVersion) => ({
      ...baseRow(row, datasetVersion),
      ritcCode: code(row, "ritcCode", "ritcNo", "cth"),
      cessSerialNo: code(row, "cessSerialNo", "serialNo"),
      cessFlag: text(row, "cessFlag"),
      tarValue: optionalDecimal(row.tarValue, "tar value"),
      tarAccountingUnit: text(row, "tarAccountingUnit"),
      cessRateAdvance: optionalDecimal(row.cessRateAdvance, "cess rate advance"),
      cessValue: optionalDecimal(row.cessValue, "cess value"),
      cessAccountingUnit: text(row, "cessAccountingUnit"),
    }),
  },
  RODTEP: rateMasterDefinition("RODTEP", "RoDTEP", "chaRodtepRateMaster", "rodtepRates"),
  RODTEP_EOU: rateMasterDefinition("RODTEP_EOU", "RoDTEP EOU", "chaRodtepEouRateMaster", "rodtepEouRates"),
  ROSCTL: {
    key: "ROSCTL",
    label: "RoSCTL",
    delegate: "chaRosctlRateMaster",
    importRunRelation: "rosctlRates",
    codeField: "rosctlCode",
    businessKeyFields: ["rosctlCode", "schedule", "datasetVersion"],
    filterableFields: ["rosctlCode", "description", "schedule", "status", "datasetVersion"],
    sortableFields: ["rosctlCode", "description", "schedule", "status", "updatedAt"],
    searchableFields: ["rosctlCode", "description", "schedule"],
    exactLookupFields: ["rosctlCode"],
    headers: ["rosctlCode", "description", "percentage", "rateAmount", "accountingUnit", "schedule"],
    sensitive: true,
    schema: genericSchemas.ROSCTL,
    parseRawRow: (row, datasetVersion) => ({
      ...baseRow(row, datasetVersion),
      rosctlCode: code(row, "rosctlCode", "ritcNo"),
      description: text(row, "description"),
      percentage: optionalDecimal(row.percentage, "percentage"),
      rateAmount: optionalDecimal(row.rateAmount, "rate amount"),
      accountingUnit: text(row, "accountingUnit"),
      schedule: text(row, "schedule") ?? "GENERAL",
    }),
  },
  DRAWBACK: {
    key: "DRAWBACK",
    label: "Drawback",
    delegate: "chaDrawbackRateMaster",
    importRunRelation: "drawbackRates",
    codeField: "dbkSerialNo",
    businessKeyFields: ["dbkSerialNo", "datasetVersion"],
    filterableFields: ["dbkSerialNo", "description", "status", "datasetVersion"],
    sortableFields: ["dbkSerialNo", "description", "status", "updatedAt"],
    searchableFields: ["dbkHeader", "dbkSerialNo", "description"],
    exactLookupFields: ["dbkSerialNo"],
    headers: ["dbkHeader", "dbkSerialNo", "description", "rateAdvance", "specificValue", "accountingUnit", "perUnit"],
    sensitive: true,
    schema: genericSchemas.DRAWBACK,
    parseRawRow: (row, datasetVersion) => ({
      ...baseRow(row, datasetVersion),
      dbkHeader: text(row, "dbkHeader"),
      dbkSerialNo: code(row, "dbkSerialNo", "drawbackSerialNo"),
      description: text(row, "description"),
      rateAdvance: optionalDecimal(row.rateAdvance, "rate advance"),
      specificValue: optionalDecimal(row.specificValue, "specific value"),
      accountingUnit: text(row, "accountingUnit"),
      perUnit: text(row, "perUnit"),
    }),
  },
  SCHEME_CODE: {
    key: "SCHEME_CODE",
    label: "Scheme Code",
    delegate: "chaSchemeCodeMaster",
    importRunRelation: "schemeCodes",
    codeField: "eximCode",
    businessKeyFields: ["eximCode", "schemeType", "datasetVersion"],
    filterableFields: ["eximCode", "schemeType", "description", "status", "datasetVersion"],
    sortableFields: ["eximCode", "schemeType", "description", "status", "updatedAt"],
    searchableFields: ["eximCode", "exportSchemeName", "importSchemeName", "description"],
    exactLookupFields: ["eximCode"],
    headers: ["eximCode", "exportSchemeName", "importSchemeName", "schemeType", "description"],
    sensitive: false,
    schema: genericSchemas.SCHEME_CODE,
    parseRawRow: (row, datasetVersion) => ({
      ...baseRow(row, datasetVersion),
      eximCode: code(row, "eximCode", "schemeCode"),
      exportSchemeName: text(row, "exportSchemeName"),
      importSchemeName: text(row, "importSchemeName"),
      schemeType: text(row, "schemeType") ?? "GENERAL",
      applicableExpSchemes: text(row, "applicableExpSchemes"),
      description: text(row, "description"),
      expLicense: optionalBoolean(row.expLicense),
      impLicense: optionalBoolean(row.impLicense),
      licenseDepb: optionalBoolean(row.licenseDepb),
      expEou: optionalBoolean(row.expEou),
      expDfiaLicense: optionalBoolean(row.expDfiaLicense),
      expDrawback: optionalBoolean(row.expDrawback),
    }),
  },
  SINGLE_WINDOW_CTH: {
    key: "SINGLE_WINDOW_CTH",
    label: "Single Window CTH",
    delegate: "chaSingleWindowCthMaster",
    importRunRelation: "singleWindowCthRows",
    codeField: "fromCth",
    businessKeyFields: ["fromCth", "agencyCode", "datasetVersion"],
    filterableFields: ["fromCth", "toCth", "agencyCode", "agencyName", "status", "datasetVersion"],
    sortableFields: ["fromCth", "toCth", "agencyCode", "agencyName", "effectiveFrom", "effectiveTo", "status", "updatedAt"],
    searchableFields: ["fromCth", "toCth", "agencyCode", "agencyName"],
    exactLookupFields: ["fromCth", "agencyCode"],
    headers: ["fromCth", "toCth", "agencyName", "agencyCode", "effectiveFrom", "effectiveTo", "remarks"],
    sensitive: false,
    schema: genericSchemas.SINGLE_WINDOW_CTH,
    parseRawRow: (row, datasetVersion) => ({
      ...baseRow(row, datasetVersion),
      fromCth: code(row, "fromCth", "cth"),
      toCth: text(row, "toCth"),
      agencyName: text(row, "agencyName"),
      agencyCode: code(row, "agencyCode"),
      remarks: text(row, "remarks"),
    }),
  },
  AIDC: {
    key: "AIDC",
    label: "AIDC",
    delegate: "chaAidcRateMaster",
    importRunRelation: "aidcRates",
    codeField: "cth",
    businessKeyFields: ["notificationNo", "serialNo", "cth", "datasetVersion"],
    filterableFields: ["notificationNo", "notificationType", "serialNo", "cth", "itemDescription", "flag", "status", "datasetVersion"],
    sortableFields: ["notificationNo", "notificationType", "serialNo", "cth", "rate", "amount", "status", "updatedAt"],
    searchableFields: ["notificationNo", "notificationType", "serialNo", "cth", "itemDescription", "flag", "condition"],
    exactLookupFields: ["cth", "notificationNo"],
    headers: ["notificationType", "notificationNo", "notificationDate", "serialNo", "cth", "rate", "amount", "uqc", "flag", "condition", "cvdRate", "cvdAmount", "cvdUqc", "cvdFlag", "acdFlag", "adFlag", "itemDescription"],
    sensitive: true,
    schema: aidcRowSchema,
    parseRawRow: (row, datasetVersion) => ({
      ...baseRow(row, datasetVersion),
      notificationType: code(row, "notificationType", "notnType"),
      notificationNo: code(row, "notificationNo", "notn"),
      notificationDate: optionalDate(row.notificationDate ?? row.notnDate, "notification date"),
      serialNo: code(row, "serialNo", "slNo"),
      cth: code(row, "cth"),
      itemDescription: text(row, "itemDescription", "description"),
      rate: optionalDecimal(row.rate, "rate"),
      amount: optionalDecimal(row.amount, "amount"),
      uqc: text(row, "uqc"),
      flag: text(row, "flag"),
      condition: text(row, "condition"),
      cvdRate: optionalDecimal(row.cvdRate, "CVD rate"),
      cvdAmount: optionalDecimal(row.cvdAmount, "CVD amount"),
      cvdUqc: text(row, "cvdUqc"),
      cvdFlag: text(row, "cvdFlag"),
      acdFlag: text(row, "acdFlag"),
      adFlag: text(row, "adFlag"),
    }),
  },
  BCD: {
    key: "BCD",
    label: "BCD",
    delegate: "chaBcdRateMaster",
    importRunRelation: "bcdRates",
    codeField: "cth",
    businessKeyFields: ["cth", "datasetVersion"],
    filterableFields: ["cth", "itemDescription", "status", "datasetVersion"],
    sortableFields: ["cth", "itemDescription", "bcdRate", "status", "updatedAt"],
    searchableFields: ["cth", "itemDescription"],
    exactLookupFields: ["cth"],
    headers: ["cth", "itemDescription", "bcdFlag", "bcdRate", "amount", "uqc", "preferential", "pFlag", "pRate", "pAmount", "pUqc", "sUqc"],
    sensitive: true,
    schema: bcdRowSchema,
    parseRawRow: (row, datasetVersion) => ({
      ...baseRow(row, datasetVersion),
      cth: code(row, "cth"),
      itemDescription: text(row, "itemDescription", "description"),
      bcdFlag: text(row, "bcdFlag"),
      bcdRate: optionalDecimal(row.bcdRate, "BCD rate"),
      amount: optionalDecimal(row.amount, "amount"),
      uqc: text(row, "uqc"),
      preferential: text(row, "preferential"),
      pFlag: text(row, "pFlag"),
      pRate: optionalDecimal(row.pRate, "preferential rate"),
      pAmount: optionalDecimal(row.pAmount, "preferential amount"),
      pUqc: text(row, "pUqc"),
      sUqc: text(row, "sUqc"),
    }),
  },
  MASTER_NOTIFICATION: {
    key: "MASTER_NOTIFICATION",
    label: "Master Notification",
    delegate: "chaCustomsNotificationMaster",
    importRunRelation: "notifications",
    codeField: "notificationNo",
    businessKeyFields: ["notificationNo", "notificationType", "serialNo", "subSerialNo", "datasetVersion"],
    filterableFields: ["notificationNo", "notificationType", "serialNo", "subSerialNo", "cth", "itemDescription", "pflg", "category", "status", "datasetVersion"],
    sortableFields: ["notificationNo", "notificationType", "serialNo", "subSerialNo", "cth", "rate", "amount", "status", "updatedAt"],
    searchableFields: ["notificationNo", "notificationType", "serialNo", "subSerialNo", "cth", "itemDescription", "amendNotification"],
    exactLookupFields: ["notificationNo", "serialNo", "subSerialNo"],
    headers: ["notificationNo", "notificationType", "pflg", "category", "quota", "notificationDate", "port", "countryFta", "serialNo", "subSerialNo", "cth", "listItem", "itemDescription", "rate", "amount", "uqc", "flag", "condition", "cvdRate", "cvdAmount", "cvdUqc", "cvdFlag", "amendNotification", "amendYear", "amendSerialNo", "status", "adFlag", "preferentialDutyFlag", "bcdAmount", "bcdUqc", "bondCode", "schemeCode", "drawbackType", "effectiveFrom", "effectiveTo"],
    sensitive: true,
    schema: notificationRowSchema,
    parseRawRow: (row, datasetVersion) => ({
      ...baseRow(row, datasetVersion),
      notificationNo: code(row, "notificationNo", "notn"),
      notificationType: code(row, "notificationType", "notnType"),
      notificationDate: optionalDate(row.notificationDate ?? row.notnDate, "notification date"),
      serialNo: code(row, "serialNo", "slNo"),
      subSerialNo: text(row, "subSerialNo", "subSlNo") ?? "",
      pflg: text(row, "pflg", "pFlg"),
      category: text(row, "category"),
      quota: text(row, "quota"),
      port: text(row, "port"),
      countryFta: text(row, "countryFta", "countryFTA"),
      cth: text(row, "cth"),
      listItem: text(row, "listItem"),
      itemDescription: text(row, "itemDescription", "description"),
      rate: optionalDecimal(row.rate, "rate"),
      amount: optionalDecimal(row.amount, "amount"),
      uqc: text(row, "uqc"),
      flag: text(row, "flag"),
      condition: text(row, "condition"),
      cvdRate: optionalDecimal(row.cvdRate, "CVD rate"),
      cvdAmount: optionalDecimal(row.cvdAmount, "CVD amount"),
      cvdUqc: text(row, "cvdUqc"),
      cvdFlag: text(row, "cvdFlag"),
      amendNotification: text(row, "amendNotification", "amendNotn"),
      amendYear: text(row, "amendYear"),
      amendSerialNo: text(row, "amendSerialNo", "amendSlNo"),
      adFlag: text(row, "adFlag"),
      preferentialDutyFlag: text(row, "preferentialDutyFlag"),
      bcdAmount: optionalDecimal(row.bcdAmount, "BCD amount"),
      bcdUqc: text(row, "bcdUqc"),
      bondCode: text(row, "bondCode"),
      schemeCode: text(row, "schemeCode"),
      drawbackType: text(row, "drawbackType"),
    }),
  },
  SUPPORTING_DOCUMENT: {
    key: "SUPPORTING_DOCUMENT",
    label: "Supporting Document",
    delegate: "chaSupportingDocumentMaster",
    importRunRelation: "supportingDocuments",
    codeField: "documentCode",
    businessKeyFields: ["documentCode", "invoiceSerialNo", "itemSerialNo", "datasetVersion"],
    filterableFields: ["documentCode", "documentName", "status", "datasetVersion"],
    sortableFields: ["documentCode", "documentName", "status", "updatedAt"],
    searchableFields: ["documentCode", "documentName", "documentDescription"],
    exactLookupFields: ["documentCode"],
    headers: ["documentCode", "documentName", "invoiceSerialNo", "itemSerialNo", "documentDescription"],
    sensitive: false,
    schema: supportingDocumentRowSchema,
    parseRawRow: (row, datasetVersion) => ({
      ...baseRow(row, datasetVersion),
      documentCode: code(row, "documentCode"),
      documentName: text(row, "documentName") ?? "",
      invoiceSerialNo: row.invoiceSerialNo === undefined || row.invoiceSerialNo === "" ? undefined : Number(row.invoiceSerialNo),
      itemSerialNo: row.itemSerialNo === undefined || row.itemSerialNo === "" ? undefined : Number(row.itemSerialNo),
      documentDescription: text(row, "documentDescription"),
    }),
  },
  UOM: {
    key: "UOM",
    label: "UOM / Quantity Code",
    delegate: "chaUomMaster",
    importRunRelation: "uoms",
    codeField: "quantityCode",
    businessKeyFields: ["quantityCode", "datasetVersion"],
    filterableFields: ["quantityCode", "quantityDescription", "quantityType", "status", "datasetVersion"],
    sortableFields: ["quantityCode", "quantityDescription", "quantityType", "status", "updatedAt"],
    searchableFields: ["quantityCode", "quantityDescription", "quantityType"],
    exactLookupFields: ["quantityCode"],
    headers: ["quantityCode", "quantityDescription", "quantityType"],
    sensitive: false,
    schema: uomRowSchema,
    parseRawRow: (row, datasetVersion) => ({
      ...baseRow(row, datasetVersion),
      quantityCode: code(row, "quantityCode", "uom", "uqc"),
      quantityDescription: text(row, "quantityDescription", "description") ?? "",
      quantityType: text(row, "quantityType"),
    }),
  },
};

function rateMasterDefinition(
  key: "RODTEP" | "RODTEP_EOU",
  label: string,
  delegate: string,
  importRunRelation: string,
): CustomsMasterDefinition {
  return {
    key,
    label,
    delegate,
    importRunRelation,
    codeField: "ritcNo",
    businessKeyFields: ["ritcNo", "datasetVersion"],
    filterableFields: ["ritcNo", "description", "status", "datasetVersion"],
    sortableFields: ["ritcNo", "description", "rate", "status", "updatedAt"],
    searchableFields: ["ritcNo", "description"],
    exactLookupFields: ["ritcNo"],
    headers: ["ritcNo", "description", "rate", "ratePer", "uqc", "capRate"],
    sensitive: true,
    schema: genericSchemas[key],
    parseRawRow: (row, datasetVersion) => ({
      ...baseRow(row, datasetVersion),
      ritcNo: code(row, "ritcNo", "ritc", "cth"),
      description: text(row, "description"),
      rate: optionalDecimal(row.rate, "rate"),
      ratePer: optionalDecimal(row.ratePer, "rate per"),
      uqc: text(row, "uqc", "uom"),
      capRate: optionalDecimal(row.capRate, "cap rate"),
    }),
  };
}

export function getCustomsMasterDefinition(masterType: string) {
  const key = masterType as CustomsMasterKey;
  const definition = CUSTOMS_MASTER_DEFINITIONS[key];
  if (!definition) {
    throw new Error(`Unsupported customs master type: ${masterType}`);
  }
  return definition;
}

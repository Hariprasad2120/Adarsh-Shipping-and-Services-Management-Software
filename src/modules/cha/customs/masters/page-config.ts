import type { CustomsMasterKey } from "./definitions";

export const EXPORT_SHARED_CUSTOMS_MASTER_KEYS = [
  "RITC_TARIFF",
  "CESS_RATE",
  "RODTEP",
  "ROSCTL",
  "DRAWBACK",
  "SCHEME_CODE",
  "RODTEP_EOU",
] as const satisfies readonly CustomsMasterKey[];

export const IMPORT_SINGLE_WINDOW_COMMON_CUSTOMS_MASTER_KEYS = [
  "SINGLE_WINDOW_CTH",
  "AIDC",
  "BCD",
  "MASTER_NOTIFICATION",
  "SUPPORTING_DOCUMENT",
  "UOM",
] as const satisfies readonly CustomsMasterKey[];

export const CUSTOMS_MASTER_PAGE_KEYS = [
  ...EXPORT_SHARED_CUSTOMS_MASTER_KEYS,
  ...IMPORT_SINGLE_WINDOW_COMMON_CUSTOMS_MASTER_KEYS,
] as const satisfies readonly CustomsMasterKey[];

export type ExportSharedCustomsMasterKey = (typeof EXPORT_SHARED_CUSTOMS_MASTER_KEYS)[number];
export type ImportSingleWindowCommonCustomsMasterKey =
  (typeof IMPORT_SINGLE_WINDOW_COMMON_CUSTOMS_MASTER_KEYS)[number];
export type CustomsMasterPageKey = (typeof CUSTOMS_MASTER_PAGE_KEYS)[number];

export type CustomsMasterPageField = {
  key: string;
  label: string;
  type?: "text" | "decimal" | "boolean" | "date" | "status";
  required?: boolean;
  table?: boolean;
  sticky?: "start" | "end";
  width?: string;
};

export type CustomsMasterPageConfig = {
  key: CustomsMasterPageKey;
  slug: string;
  title: string;
  description: string;
  modelName: string;
  lookupNote: string;
  fields: CustomsMasterPageField[];
};

const auditFields: CustomsMasterPageField[] = [
  { key: "status", label: "Status", type: "status", table: true },
  { key: "datasetVersion", label: "Dataset version", required: true, table: true },
  { key: "effectiveFrom", label: "Effective from", type: "date", table: true },
  { key: "effectiveTo", label: "Effective to", type: "date" },
];

export const EXPORT_SHARED_CUSTOMS_MASTER_PAGE_CONFIGS: Record<
  ExportSharedCustomsMasterKey,
  CustomsMasterPageConfig
> = {
  RITC_TARIFF: {
    key: "RITC_TARIFF",
    slug: "ritc-unit",
    title: "RITC Unit",
    description: "Shared tariff item, policy, and regulatory flags for import and export filing lookup.",
    modelName: "ChaRitcTariffMaster",
    lookupNote: "RITC remains a shared tariff lookup even though it is grouped with Export Masters.",
    fields: [
      { key: "tariffItem", label: "Tariff Item", required: true, table: true, sticky: "start", width: "12rem" },
      { key: "description", label: "Description", required: true, table: true, width: "24rem" },
      { key: "uom", label: "UOM", table: true },
      { key: "importPolicy", label: "Import Policy", table: true },
      { key: "importPolicyCondition", label: "Import Policy Condition", table: true },
      { key: "exportPolicy", label: "Export Policy", table: true },
      { key: "exportPolicyCondition", label: "Export Policy Condition", table: true },
      { key: "sims", label: "SIMS", type: "boolean", table: true },
      { key: "nfmims", label: "NFMIMS", type: "boolean", table: true },
      { key: "pims", label: "PIMS", type: "boolean", table: true },
      { key: "bis", label: "BIS", type: "boolean", table: true },
      { key: "tobacco", label: "Tobacco", type: "boolean", table: true },
      ...auditFields,
    ],
  },
  CESS_RATE: {
    key: "CESS_RATE",
    slug: "cess-rate",
    title: "Cess Rate",
    description: "Cess serial, TAR value, and accounting-unit reference data by RITC code.",
    modelName: "ChaCessRateMaster",
    lookupNote: "Rates are Decimal-backed and edited only with an audit reason.",
    fields: [
      { key: "ritcCode", label: "RITC Code", required: true, table: true, sticky: "start" },
      { key: "cessSerialNo", label: "Cess Serial No", required: true, table: true },
      { key: "cessFlag", label: "Cess Flag", table: true },
      { key: "tarValue", label: "TAR Value", type: "decimal", table: true },
      { key: "tarAccountingUnit", label: "TAR Accounting Unit", table: true },
      { key: "cessRateAdvance", label: "Cess Rate Ad Valorem", type: "decimal", table: true },
      { key: "cessValue", label: "Cess Value", type: "decimal", table: true },
      { key: "cessAccountingUnit", label: "Cess Accounting Unit", table: true },
      ...auditFields,
    ],
  },
  RODTEP: {
    key: "RODTEP",
    slug: "rodtep",
    title: "RoDTEP",
    description: "Remission rates, per-unit values, UQC, and cap rate by RITC.",
    modelName: "ChaRodtepRateMaster",
    lookupNote: "Lookup services return the selected dataset/source version for transaction snapshots.",
    fields: [
      { key: "ritcNo", label: "RITC No", required: true, table: true, sticky: "start" },
      { key: "description", label: "Description", table: true, width: "24rem" },
      { key: "rate", label: "Rate", type: "decimal", table: true },
      { key: "ratePer", label: "Rate Per", type: "decimal", table: true },
      { key: "uqc", label: "UQC", table: true },
      { key: "capRate", label: "Cap Rate", type: "decimal", table: true },
      ...auditFields,
    ],
  },
  ROSCTL: {
    key: "ROSCTL",
    slug: "rosctl",
    title: "RoSCTL",
    description: "RoSCTL percentage and rate amount schedule data.",
    modelName: "ChaRosctlRateMaster",
    lookupNote: "Sensitive rate changes require an explicit reason and audit trail.",
    fields: [
      { key: "rosctlCode", label: "RoSCTL Code", required: true, table: true, sticky: "start" },
      { key: "description", label: "Description", table: true, width: "24rem" },
      { key: "percentage", label: "Percentage", type: "decimal", table: true },
      { key: "rateAmount", label: "Rate Amount", type: "decimal", table: true },
      { key: "accountingUnit", label: "Accounting Unit", table: true },
      { key: "schedule", label: "Schedule", required: true, table: true },
      ...auditFields,
    ],
  },
  DRAWBACK: {
    key: "DRAWBACK",
    slug: "drawback",
    title: "Drawback",
    description: "Drawback header, serial, ad-valorem rate, and per-unit reference data.",
    modelName: "ChaDrawbackRateMaster",
    lookupNote: "Drawback rows are retained historically and deactivated instead of deleted.",
    fields: [
      { key: "dbkHeader", label: "DBK Header", table: true },
      { key: "dbkSerialNo", label: "DBK Serial No", required: true, table: true, sticky: "start" },
      { key: "description", label: "Description", table: true, width: "24rem" },
      { key: "rateAdvance", label: "Rate Ad Valorem", type: "decimal", table: true },
      { key: "specificValue", label: "Specific Value", type: "decimal", table: true },
      { key: "accountingUnit", label: "Accounting Unit", table: true },
      { key: "perUnit", label: "Per Unit", table: true },
      ...auditFields,
    ],
  },
  SCHEME_CODE: {
    key: "SCHEME_CODE",
    slug: "scheme-code",
    title: "Scheme Code",
    description: "EXIM scheme names, applicability, and filing-license flags.",
    modelName: "ChaSchemeCodeMaster",
    lookupNote: "Scheme codes are shared across import/export filing extension data.",
    fields: [
      { key: "eximCode", label: "EXIM Code", required: true, table: true, sticky: "start" },
      { key: "exportSchemeName", label: "Export Scheme Name", table: true },
      { key: "importSchemeName", label: "Import Scheme Name", table: true },
      { key: "schemeType", label: "Scheme Type", required: true, table: true },
      { key: "applicableExpSchemes", label: "Applicable Export Schemes", table: true },
      { key: "description", label: "Description", table: true },
      { key: "expLicense", label: "Export License", type: "boolean", table: true },
      { key: "impLicense", label: "Import License", type: "boolean", table: true },
      { key: "licenseDepb", label: "License DEPB", type: "boolean", table: true },
      { key: "expEou", label: "Export EOU", type: "boolean", table: true },
      { key: "expDfiaLicense", label: "Export DFIA License", type: "boolean", table: true },
      { key: "expDrawback", label: "Export Drawback", type: "boolean", table: true },
      ...auditFields,
    ],
  },
  RODTEP_EOU: {
    key: "RODTEP_EOU",
    slug: "rodtep-eou",
    title: "RoDTEP EOU",
    description: "EOU remission rates, per-unit values, UQC, and cap rate by RITC.",
    modelName: "ChaRodtepEouRateMaster",
    lookupNote: "EOU rates are separate from standard RoDTEP but share the same lookup shape.",
    fields: [
      { key: "ritcNo", label: "RITC No", required: true, table: true, sticky: "start" },
      { key: "description", label: "Description", table: true, width: "24rem" },
      { key: "rate", label: "Rate", type: "decimal", table: true },
      { key: "ratePer", label: "Rate Per", type: "decimal", table: true },
      { key: "uqc", label: "UQC", table: true },
      { key: "capRate", label: "Cap Rate", type: "decimal", table: true },
      ...auditFields,
    ],
  },
};

export const IMPORT_SINGLE_WINDOW_COMMON_CUSTOMS_MASTER_PAGE_CONFIGS: Record<
  ImportSingleWindowCommonCustomsMasterKey,
  CustomsMasterPageConfig
> = {
  SINGLE_WINDOW_CTH: {
    key: "SINGLE_WINDOW_CTH",
    slug: "sw-cth",
    title: "SW CTH",
    description: "Single-window CTH agency mapping with validity dates and remarks.",
    modelName: "ChaSingleWindowCthMaster",
    lookupNote: "Single-window agency lookups use CTH plus validity date and return the selected dataset version.",
    fields: [
      { key: "fromCth", label: "From CTH", required: true, table: true, sticky: "start" },
      { key: "toCth", label: "To CTH", table: true },
      { key: "agencyName", label: "Agency Name", table: true, width: "18rem" },
      { key: "agencyCode", label: "Agency Code", required: true, table: true },
      { key: "effectiveFrom", label: "Effective Date", type: "date", table: true },
      { key: "effectiveTo", label: "End Date", type: "date", table: true },
      { key: "remarks", label: "Remarks", table: true, width: "20rem" },
      { key: "status", label: "Status", type: "status", table: true },
      { key: "datasetVersion", label: "Dataset version", required: true, table: true },
    ],
  },
  AIDC: {
    key: "AIDC",
    slug: "aidc",
    title: "AIDC",
    description: "AIDC notification/rate detail by notification, serial number, and CTH.",
    modelName: "ChaAidcRateMaster",
    lookupNote: "AIDC rates distinguish standard, CVD, and flag values using Decimal-safe fields.",
    fields: [
      { key: "notificationType", label: "Notification Type", required: true, table: true },
      { key: "notificationNo", label: "Notification", required: true, table: true, sticky: "start" },
      { key: "notificationDate", label: "Notification Date", type: "date", table: true },
      { key: "serialNo", label: "Serial No", required: true, table: true },
      { key: "cth", label: "CTH", required: true, table: true },
      { key: "rate", label: "Rate", type: "decimal", table: true },
      { key: "amount", label: "Amount", type: "decimal", table: true },
      { key: "uqc", label: "UQC", table: true },
      { key: "flag", label: "Flag", table: true },
      { key: "condition", label: "Condition", table: true, width: "20rem" },
      { key: "cvdRate", label: "CVD Rate", type: "decimal", table: true },
      { key: "cvdAmount", label: "CVD Amount", type: "decimal", table: true },
      { key: "cvdUqc", label: "CVD UQC", table: true },
      { key: "cvdFlag", label: "CVD Flag", table: true },
      { key: "adFlag", label: "AD Flag", table: true },
      { key: "itemDescription", label: "Item Description", table: true, width: "24rem" },
      ...auditFields,
    ],
  },
  BCD: {
    key: "BCD",
    slug: "bcd",
    title: "BCD",
    description: "Basic customs duty rates with standard and preferential rate fields.",
    modelName: "ChaBcdRateMaster",
    lookupNote: "BCD lookups preserve leading-zero CTH codes and preferential rate distinction.",
    fields: [
      { key: "cth", label: "CTH", required: true, table: true, sticky: "start" },
      { key: "itemDescription", label: "Item Description", table: true, width: "24rem" },
      { key: "bcdFlag", label: "BCD Flag", table: true },
      { key: "bcdRate", label: "BCD Rate", type: "decimal", table: true },
      { key: "amount", label: "Amount", type: "decimal", table: true },
      { key: "uqc", label: "UQC", table: true },
      { key: "preferential", label: "Preferential", table: true },
      { key: "pFlag", label: "P Flag", table: true },
      { key: "pRate", label: "P Rate", type: "decimal", table: true },
      { key: "pAmount", label: "P Amount", type: "decimal", table: true },
      { key: "pUqc", label: "P UQC", table: true },
      { key: "sUqc", label: "S UQC", table: true },
      ...auditFields,
    ],
  },
  MASTER_NOTIFICATION: {
    key: "MASTER_NOTIFICATION",
    slug: "master-notification",
    title: "Master Notification",
    description: "Notification, serial/sub-serial, amendment, rate, and validity master data.",
    modelName: "ChaCustomsNotificationMaster",
    lookupNote: "Notification lookups use notification, type, serial, sub-serial, and validity date; amendment fields link the historical chain.",
    fields: [
      { key: "notificationNo", label: "Notification", required: true, table: true, sticky: "start" },
      { key: "notificationType", label: "Notification Type", required: true, table: true },
      { key: "pflg", label: "PFLG", table: true },
      { key: "category", label: "Category", table: true },
      { key: "quota", label: "Quota", table: true },
      { key: "notificationDate", label: "Notification Date", type: "date", table: true },
      { key: "port", label: "Port", table: true },
      { key: "countryFta", label: "Country FTA", table: true },
      { key: "serialNo", label: "Serial No", required: true, table: true },
      { key: "subSerialNo", label: "Sub Serial No", table: true },
      { key: "cth", label: "CTH", table: true },
      { key: "listItem", label: "List Item", table: true },
      { key: "itemDescription", label: "Item Description", table: true, width: "24rem" },
      { key: "rate", label: "Rate", type: "decimal", table: true },
      { key: "amount", label: "Amount", type: "decimal", table: true },
      { key: "uqc", label: "UQC", table: true },
      { key: "flag", label: "Flag", table: true },
      { key: "condition", label: "Condition", table: true, width: "20rem" },
      { key: "cvdRate", label: "CVD Rate", type: "decimal", table: true },
      { key: "cvdAmount", label: "CVD Amount", type: "decimal", table: true },
      { key: "cvdUqc", label: "CVD UQC", table: true },
      { key: "cvdFlag", label: "CVD Flag", table: true },
      { key: "amendNotification", label: "Amend Notification", table: true },
      { key: "amendYear", label: "Amend Year", table: true },
      { key: "amendSerialNo", label: "Amend Serial No", table: true },
      { key: "status", label: "Status", type: "status", table: true },
      { key: "adFlag", label: "AD Flag", table: true },
      { key: "preferentialDutyFlag", label: "Preferential Duty Flag", table: true },
      { key: "bcdAmount", label: "BCD Amount", type: "decimal", table: true },
      { key: "bcdUqc", label: "BCD UQC", table: true },
      { key: "bondCode", label: "Bond Code", table: true },
      { key: "schemeCode", label: "Scheme Code", table: true },
      { key: "drawbackType", label: "Drawback Type", table: true },
      { key: "effectiveFrom", label: "Notification Effective Date", type: "date", table: true },
      { key: "effectiveTo", label: "Notification End Date", type: "date", table: true },
      { key: "datasetVersion", label: "Dataset version", required: true, table: true },
    ],
  },
  SUPPORTING_DOCUMENT: {
    key: "SUPPORTING_DOCUMENT",
    slug: "supporting-document",
    title: "Supporting Document",
    description: "Document code applicability and description master for filing support documents.",
    modelName: "ChaSupportingDocumentMaster",
    lookupNote: "Document code lookup remains compatible with filing document metadata and existing CHA document requirements.",
    fields: [
      { key: "documentCode", label: "Document Code", required: true, table: true, sticky: "start" },
      { key: "documentName", label: "Document Name", required: true, table: true, width: "20rem" },
      { key: "invoiceSerialNo", label: "Invoice Serial No applicability", table: true },
      { key: "itemSerialNo", label: "Item Serial No applicability", table: true },
      { key: "documentDescription", label: "Document Description", table: true, width: "24rem" },
      ...auditFields,
    ],
  },
  UOM: {
    key: "UOM",
    slug: "uom-master",
    title: "UOM Master",
    description: "Quantity/UQC code, description, and quantity type master.",
    modelName: "ChaUomMaster",
    lookupNote: "UOM lookups preserve code casing/leading zeroes and return source version metadata.",
    fields: [
      { key: "quantityCode", label: "Quantity Code", required: true, table: true, sticky: "start" },
      { key: "quantityDescription", label: "Quantity Description", required: true, table: true, width: "22rem" },
      { key: "quantityType", label: "Quantity Type", table: true },
      ...auditFields,
    ],
  },
};

export const CUSTOMS_MASTER_PAGE_CONFIGS: Record<CustomsMasterPageKey, CustomsMasterPageConfig> = {
  ...EXPORT_SHARED_CUSTOMS_MASTER_PAGE_CONFIGS,
  ...IMPORT_SINGLE_WINDOW_COMMON_CUSTOMS_MASTER_PAGE_CONFIGS,
};

export const CUSTOMS_MASTER_SLUGS = Object.fromEntries(
  Object.values(CUSTOMS_MASTER_PAGE_CONFIGS).map((config) => [config.slug, config.key]),
) as Record<string, CustomsMasterPageKey>;

export function getCustomsMasterPageConfig(slug: string) {
  const key = CUSTOMS_MASTER_SLUGS[slug];
  return key ? CUSTOMS_MASTER_PAGE_CONFIGS[key] : null;
}

export const getExportSharedCustomsMasterPageConfig = getCustomsMasterPageConfig;

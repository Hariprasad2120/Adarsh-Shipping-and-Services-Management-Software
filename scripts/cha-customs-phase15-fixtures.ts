import type { CustomsMasterKey } from "@/modules/cha/customs/masters/definitions";

type CsvScalar = string | number | boolean | null | undefined;

export type Phase15MasterFixture = {
  masterType: CustomsMasterKey;
  fileName: string;
  datasetVersion: string;
  sourceName: string;
  sourceReference: string;
  sourcePublicationDate: string;
  sourceEffectiveDate: string;
  rows: Record<string, CsvScalar>[];
  sampleExactCode: string;
  sampleValidOn: string;
  sampleInvalidOn?: string;
  sampleBusinessKeys: Record<string, string>[];
};

export type Phase15RoleFixture = {
  roleName: string;
  userId: string;
  email: string;
  displayName: string;
  permissionKeys: string[];
};

export const CHA_CUSTOMS_PHASE15_SOURCE_REFERENCE =
  "scripts/cha-customs-phase15-fixtures.ts";

const MASTER_PUBLICATION_DATE = "2026-07-31";
const MASTER_EFFECTIVE_DATE = "2026-08-01";

export const CHA_CUSTOMS_PHASE15_MASTER_FIXTURES: Phase15MasterFixture[] = [
  {
    masterType: "RITC_TARIFF",
    fileName: "ritc-tariff-controlled.csv",
    datasetVersion: "phase15-ritc-2026-07-31",
    sourceName: "Controlled RITC tariff staging fixture",
    sourceReference: `${CHA_CUSTOMS_PHASE15_SOURCE_REFERENCE}#RITC_TARIFF`,
    sourcePublicationDate: MASTER_PUBLICATION_DATE,
    sourceEffectiveDate: MASTER_EFFECTIVE_DATE,
    sampleExactCode: "01012100",
    sampleValidOn: "2026-08-01",
    sampleInvalidOn: "2026-07-30",
    sampleBusinessKeys: [{ tariffItem: "01012100" }, { tariffItem: "01012910" }],
    rows: [
      {
        tariffItem: "01012100",
        description: "Pure-bred breeding animals",
        uom: "NOS",
        importPolicy: "Free",
        importPolicyCondition: "None",
        exportPolicy: "Free",
        exportPolicyCondition: "None",
        sims: false,
        nfmims: false,
        pims: false,
        bis: false,
        tobacco: false,
        effectiveFrom: "2026-08-01",
        effectiveTo: "2027-03-31",
      },
      {
        tariffItem: "01012910",
        description: "Horses for polo",
        uom: "NOS",
        importPolicy: "Restricted",
        importPolicyCondition: "Documentary review",
        exportPolicy: "Free",
        exportPolicyCondition: "None",
        sims: false,
        nfmims: false,
        pims: false,
        bis: false,
        tobacco: false,
        effectiveFrom: "2026-08-01",
      },
    ],
  },
  {
    masterType: "CESS_RATE",
    fileName: "cess-rate-controlled.csv",
    datasetVersion: "phase15-cess-2026-07-31",
    sourceName: "Controlled cess-rate staging fixture",
    sourceReference: `${CHA_CUSTOMS_PHASE15_SOURCE_REFERENCE}#CESS_RATE`,
    sourcePublicationDate: MASTER_PUBLICATION_DATE,
    sourceEffectiveDate: MASTER_EFFECTIVE_DATE,
    sampleExactCode: "03034500",
    sampleValidOn: "2026-08-01",
    sampleBusinessKeys: [{ ritcCode: "03034500", cessSerialNo: "6" }],
    rows: [
      {
        ritcCode: "03034500",
        cessSerialNo: "6",
        cessFlag: "ADV",
        tarValue: "120.00000000",
        tarAccountingUnit: "KGS",
        cessRateAdvance: "0.50000000",
        cessValue: "0.50000000",
        cessAccountingUnit: "KGS",
        effectiveFrom: "2026-08-01",
      },
    ],
  },
  {
    masterType: "RODTEP",
    fileName: "rodtep-controlled.csv",
    datasetVersion: "phase15-rodtep-2026-07-31",
    sourceName: "Controlled RoDTEP staging fixture",
    sourceReference: `${CHA_CUSTOMS_PHASE15_SOURCE_REFERENCE}#RODTEP`,
    sourcePublicationDate: MASTER_PUBLICATION_DATE,
    sourceEffectiveDate: MASTER_EFFECTIVE_DATE,
    sampleExactCode: "03011100",
    sampleValidOn: "2026-08-01",
    sampleBusinessKeys: [{ ritcNo: "03011100" }],
    rows: [
      {
        ritcNo: "03011100",
        description: "Freshwater",
        rate: "0.01000000",
        ratePer: "0.50000000",
        uqc: "KGS",
        capRate: "0.50000000",
        effectiveFrom: "2026-08-01",
      },
    ],
  },
  {
    masterType: "RODTEP_EOU",
    fileName: "rodtep-eou-controlled.csv",
    datasetVersion: "phase15-rodtep-eou-2026-07-31",
    sourceName: "Controlled RoDTEP EOU staging fixture",
    sourceReference: `${CHA_CUSTOMS_PHASE15_SOURCE_REFERENCE}#RODTEP_EOU`,
    sourcePublicationDate: MASTER_PUBLICATION_DATE,
    sourceEffectiveDate: MASTER_EFFECTIVE_DATE,
    sampleExactCode: "03011100",
    sampleValidOn: "2026-08-01",
    sampleBusinessKeys: [{ ritcNo: "03011100" }],
    rows: [
      {
        ritcNo: "03011100",
        description: "Freshwater",
        rate: "0.00300000",
        ratePer: "0.30000000",
        uqc: "KGS",
        capRate: "0.30000000",
        effectiveFrom: "2026-08-01",
      },
    ],
  },
  {
    masterType: "ROSCTL",
    fileName: "rosctl-controlled.csv",
    datasetVersion: "phase15-rosctl-2026-07-31",
    sourceName: "Controlled RoSCTL staging fixture",
    sourceReference: `${CHA_CUSTOMS_PHASE15_SOURCE_REFERENCE}#ROSCTL`,
    sourcePublicationDate: MASTER_PUBLICATION_DATE,
    sourceEffectiveDate: MASTER_EFFECTIVE_DATE,
    sampleExactCode: "610101B",
    sampleValidOn: "2026-08-01",
    sampleBusinessKeys: [{ rosctlCode: "610101B", schedule: "SCH1" }],
    rows: [
      {
        rosctlCode: "610101B",
        description: "Of Cotton",
        percentage: "3.60000000",
        rateAmount: "68.20000000",
        accountingUnit: "PCS",
        schedule: "SCH1",
        effectiveFrom: "2026-08-01",
      },
    ],
  },
  {
    masterType: "DRAWBACK",
    fileName: "drawback-controlled.csv",
    datasetVersion: "phase15-drawback-2026-07-31",
    sourceName: "Controlled drawback staging fixture",
    sourceReference: `${CHA_CUSTOMS_PHASE15_SOURCE_REFERENCE}#DRAWBACK`,
    sourcePublicationDate: MASTER_PUBLICATION_DATE,
    sourceEffectiveDate: MASTER_EFFECTIVE_DATE,
    sampleExactCode: "0101B",
    sampleValidOn: "2026-08-01",
    sampleBusinessKeys: [{ dbkSerialNo: "0101B" }],
    rows: [
      {
        dbkHeader: "0101",
        dbkSerialNo: "0101B",
        description: "Drawback sample",
        rateAdvance: "1.25000000",
        specificValue: "0.00000000",
        accountingUnit: "KGS",
        perUnit: "KGS",
        effectiveFrom: "2026-08-01",
      },
    ],
  },
  {
    masterType: "SCHEME_CODE",
    fileName: "scheme-code-controlled.csv",
    datasetVersion: "phase15-scheme-code-2026-07-31",
    sourceName: "Controlled scheme-code staging fixture",
    sourceReference: `${CHA_CUSTOMS_PHASE15_SOURCE_REFERENCE}#SCHEME_CODE`,
    sourcePublicationDate: MASTER_PUBLICATION_DATE,
    sourceEffectiveDate: MASTER_EFFECTIVE_DATE,
    sampleExactCode: "00",
    sampleValidOn: "2026-08-01",
    sampleBusinessKeys: [{ eximCode: "00", schemeType: "GENERAL" }],
    rows: [
      {
        eximCode: "00",
        exportSchemeName: "Free Shipping Bill",
        importSchemeName: "Dutiable",
        schemeType: "GENERAL",
        applicableExpSchemes: "Free Shipping Bill",
        description: "Controlled staging fixture scheme",
        expLicense: false,
        impLicense: false,
        licenseDepb: false,
        expEou: false,
        expDfiaLicense: false,
        expDrawback: true,
        effectiveFrom: "2026-08-01",
      },
    ],
  },
  {
    masterType: "SINGLE_WINDOW_CTH",
    fileName: "single-window-cth-controlled.csv",
    datasetVersion: "phase15-sw-cth-2026-07-31",
    sourceName: "Controlled single-window CTH staging fixture",
    sourceReference: `${CHA_CUSTOMS_PHASE15_SOURCE_REFERENCE}#SINGLE_WINDOW_CTH`,
    sourcePublicationDate: MASTER_PUBLICATION_DATE,
    sourceEffectiveDate: MASTER_EFFECTIVE_DATE,
    sampleExactCode: "01012100",
    sampleValidOn: "2026-08-15",
    sampleInvalidOn: "2026-07-30",
    sampleBusinessKeys: [{ fromCth: "01012100", agencyCode: "AQCS" }],
    rows: [
      {
        fromCth: "01012100",
        toCth: "01012100",
        agencyName: "AQCS",
        agencyCode: "AQCS",
        effectiveFrom: "2026-08-01",
        effectiveTo: "2027-03-31",
        remarks: "Controlled agency mapping",
      },
    ],
  },
  {
    masterType: "AIDC",
    fileName: "aidc-controlled.csv",
    datasetVersion: "phase15-aidc-2026-07-31",
    sourceName: "Controlled AIDC staging fixture",
    sourceReference: `${CHA_CUSTOMS_PHASE15_SOURCE_REFERENCE}#AIDC`,
    sourcePublicationDate: MASTER_PUBLICATION_DATE,
    sourceEffectiveDate: MASTER_EFFECTIVE_DATE,
    sampleExactCode: "01012100",
    sampleValidOn: "2026-08-01",
    sampleBusinessKeys: [{ notificationNo: "020/2026", serialNo: "1137", cth: "01012100" }],
    rows: [
      {
        notificationType: "C",
        notificationNo: "020/2026",
        notificationDate: "2026-07-14",
        serialNo: "1137",
        cth: "01012100",
        itemDescription: "All goods",
        rate: "20.00000000",
        amount: "0.00000000",
        uqc: "KGS",
        flag: "A",
        condition: "Controlled condition",
        cvdRate: "0.00000000",
        cvdAmount: "0.00000000",
        cvdUqc: "",
        cvdFlag: "",
        acdFlag: "",
        adFlag: "A",
        effectiveFrom: "2026-08-01",
      },
    ],
  },
  {
    masterType: "BCD",
    fileName: "bcd-controlled.csv",
    datasetVersion: "phase15-bcd-2026-07-31",
    sourceName: "Controlled BCD staging fixture",
    sourceReference: `${CHA_CUSTOMS_PHASE15_SOURCE_REFERENCE}#BCD`,
    sourcePublicationDate: MASTER_PUBLICATION_DATE,
    sourceEffectiveDate: MASTER_EFFECTIVE_DATE,
    sampleExactCode: "01012100",
    sampleValidOn: "2026-08-01",
    sampleBusinessKeys: [{ cth: "01012100" }],
    rows: [
      {
        cth: "01012100",
        itemDescription: "Pure-bred breeding animals",
        bcdFlag: "GEN",
        bcdRate: "10.00000000",
        amount: "0.00000000",
        uqc: "NOS",
        preferential: "Y",
        pFlag: "PREF",
        pRate: "5.00000000",
        pAmount: "0.00000000",
        pUqc: "NOS",
        sUqc: "NOS",
        effectiveFrom: "2026-08-01",
      },
    ],
  },
  {
    masterType: "MASTER_NOTIFICATION",
    fileName: "master-notification-controlled.csv",
    datasetVersion: "phase15-master-notification-2026-07-31",
    sourceName: "Controlled customs notification staging fixture",
    sourceReference: `${CHA_CUSTOMS_PHASE15_SOURCE_REFERENCE}#MASTER_NOTIFICATION`,
    sourcePublicationDate: MASTER_PUBLICATION_DATE,
    sourceEffectiveDate: MASTER_EFFECTIVE_DATE,
    sampleExactCode: "020/2026",
    sampleValidOn: "2026-08-01",
    sampleInvalidOn: "2026-07-30",
    sampleBusinessKeys: [{ notificationNo: "020/2026", notificationType: "C", serialNo: "1137", subSerialNo: "" }],
    rows: [
      {
        notificationNo: "020/2026",
        notificationType: "C",
        pflg: "P",
        category: "PREFERENTIAL",
        quota: "N",
        notificationDate: "2026-07-14",
        port: "INMAA1",
        countryFta: "SG",
        serialNo: "1137",
        subSerialNo: "",
        cth: "01012100",
        listItem: "All goods",
        itemDescription: "Controlled preferential notification",
        rate: "0.00000000",
        amount: "0.00000000",
        uqc: "NOS",
        flag: "A",
        condition: "Preferential entitlement",
        cvdRate: "0.00000000",
        cvdAmount: "0.00000000",
        cvdUqc: "",
        cvdFlag: "",
        amendNotification: "019/2026",
        amendYear: "2026",
        amendSerialNo: "1136",
        adFlag: "A",
        preferentialDutyFlag: "Y",
        bcdAmount: "0.00000000",
        bcdUqc: "NOS",
        bondCode: "BOND-01",
        schemeCode: "00",
        drawbackType: "GENERAL",
        effectiveFrom: "2026-08-01",
        effectiveTo: "2027-03-31",
      },
    ],
  },
  {
    masterType: "SUPPORTING_DOCUMENT",
    fileName: "supporting-document-controlled.csv",
    datasetVersion: "phase15-supporting-document-2026-07-31",
    sourceName: "Controlled supporting-document staging fixture",
    sourceReference: `${CHA_CUSTOMS_PHASE15_SOURCE_REFERENCE}#SUPPORTING_DOCUMENT`,
    sourcePublicationDate: MASTER_PUBLICATION_DATE,
    sourceEffectiveDate: MASTER_EFFECTIVE_DATE,
    sampleExactCode: "001002",
    sampleValidOn: "2026-08-01",
    sampleBusinessKeys: [{ documentCode: "001002", invoiceSerialNo: "", itemSerialNo: "" }],
    rows: [
      {
        documentCode: "001002",
        documentName: "Lab analysis Report",
        invoiceSerialNo: "",
        itemSerialNo: "",
        documentDescription: "Controlled lab analysis report",
        effectiveFrom: "2026-08-01",
      },
      {
        documentCode: "001003",
        documentName: "Blood Analysis Report",
        invoiceSerialNo: "1",
        itemSerialNo: "1",
        documentDescription: "Controlled blood analysis report",
        effectiveFrom: "2026-08-01",
      },
    ],
  },
  {
    masterType: "UOM",
    fileName: "uom-controlled.csv",
    datasetVersion: "phase15-uom-2026-07-31",
    sourceName: "Controlled UOM staging fixture",
    sourceReference: `${CHA_CUSTOMS_PHASE15_SOURCE_REFERENCE}#UOM`,
    sourcePublicationDate: MASTER_PUBLICATION_DATE,
    sourceEffectiveDate: MASTER_EFFECTIVE_DATE,
    sampleExactCode: "KGS",
    sampleValidOn: "2026-08-01",
    sampleBusinessKeys: [{ quantityCode: "KGS" }, { quantityCode: "NOS" }],
    rows: [
      {
        quantityCode: "KGS",
        quantityDescription: "Kilograms",
        quantityType: "MASS",
        effectiveFrom: "2026-08-01",
      },
      {
        quantityCode: "NOS",
        quantityDescription: "Numbers",
        quantityType: "COUNT",
        effectiveFrom: "2026-08-01",
      },
    ],
  },
];

export const CHA_CUSTOMS_PHASE15_ROLE_FIXTURES: Phase15RoleFixture[] = [
  {
    roleName: "STAGING CHA Customs Data Entry",
    userId: "stg_user_cha_customs_data_entry",
    email: "cha-data-entry@staging.example.com",
    displayName: "STAGING CHA Customs Data Entry",
    permissionKeys: ["cha.customs.filing.view", "cha.customs.filing.edit_draft"],
  },
  {
    roleName: "STAGING CHA Customs Documentation",
    userId: "stg_user_cha_customs_docs",
    email: "cha-docs@staging.example.com",
    displayName: "STAGING CHA Customs Documentation User",
    permissionKeys: ["cha.customs.filing.view", "cha.customs.filing.edit_draft"],
  },
  {
    roleName: "STAGING CHA Customs Filing",
    userId: "stg_user_cha_customs_filing",
    email: "cha-filing@staging.example.com",
    displayName: "STAGING CHA Customs Filing User",
    permissionKeys: [
      "cha.customs.filing.view",
      "cha.customs.filing.edit_draft",
      "cha.customs.filing.generate_artifact",
      "cha.customs.signing.register",
    ],
  },
  {
    roleName: "STAGING CHA Customs Manager",
    userId: "stg_user_cha_customs_manager",
    email: "cha-manager@staging.example.com",
    displayName: "STAGING CHA Customs Manager",
    permissionKeys: [
      "cha.customs.filing.view",
      "cha.customs.filing.edit_draft",
      "cha.customs.filing.generate_artifact",
      "cha.customs.icegate.response.view",
    ],
  },
  {
    roleName: "STAGING CHA Customs Master Admin",
    userId: "stg_user_cha_customs_master_admin",
    email: "cha-master-admin@staging.example.com",
    displayName: "STAGING CHA Customs Master Administrator",
    permissionKeys: [
      "cha.customs.master.view",
      "cha.customs.master.manage",
      "cha.customs.master.bulk_import",
      "cha.customs.icegate.configure",
    ],
  },
  {
    roleName: "STAGING CHA Customs ICEGATE Submitter",
    userId: "stg_user_cha_customs_icegate",
    email: "cha-icegate@staging.example.com",
    displayName: "STAGING CHA Customs ICEGATE Submitter",
    permissionKeys: [
      "cha.customs.filing.view",
      "cha.customs.filing.generate_artifact",
      "cha.customs.signing.register",
      "cha.customs.icegate.submit",
      "cha.customs.icegate.response.view",
    ],
  },
  {
    roleName: "STAGING CHA Customs Read Only Audit",
    userId: "stg_user_cha_customs_audit",
    email: "cha-audit@staging.example.com",
    displayName: "STAGING CHA Customs Audit User",
    permissionKeys: [
      "cha.customs.master.view",
      "cha.customs.filing.view",
      "cha.customs.icegate.response.view",
    ],
  },
];

export const CHA_CUSTOMS_PHASE15_UAT_SCENARIOS = Object.freeze({
  importJobNumber: "STG-CHA-IMP-0001",
  exportJobNumber: "STG-CHA-EXP-0001",
  exBondJobNumber: "STG-CHA-EXB-0001",
  missingDocumentJobNumber: "STG-CHA-MISS-0001",
  amendmentJobNumber: "STG-CHA-AMD-0001",
});

export function encodeFixtureCsv(rows: Record<string, CsvScalar>[]) {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: CsvScalar) => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return new TextEncoder().encode([
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n"));
}

export function fixtureByMasterType(masterType: CustomsMasterKey) {
  const fixture = CHA_CUSTOMS_PHASE15_MASTER_FIXTURES.find(
    (entry) => entry.masterType === masterType,
  );
  if (!fixture) {
    throw new Error(`Missing Phase 15 fixture for ${masterType}.`);
  }
  return fixture;
}

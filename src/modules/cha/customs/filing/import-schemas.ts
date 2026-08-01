import { z } from "zod";

const MAX_TEXT = 240;
const MAX_LONG_TEXT = 2000;

const optionalText = (max = MAX_TEXT) => z.string().trim().max(max).default("");
const decimalText = z
  .string()
  .trim()
  .max(40)
  .regex(/^\d*(?:\.\d{1,12})?$/, "Use a positive decimal value.")
  .default("");
const dateText = z
  .string()
  .trim()
  .regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .default("");

const lockVersion = z.coerce.number().int().positive();

export const importBeMainDraftSchema = z.object({
  lockVersion,
  jobDate: dateText,
  beType: optionalText(),
  transportMode: optionalText(),
  filingType: optionalText(),
  customsHouse: optionalText(),
  customsHouseCode: optionalText(80),
  warehouseCode: optionalText(80),
  warehouseCustomsSiteId: optionalText(80),
  packageCount: decimalText,
  packageCode: optionalText(80),
  grossWeight: decimalText,
  uom: optionalText(30),
  beNumber: optionalText(80),
  beDate: dateText,
  examinationDate: dateText,
  outOfChargeDate: dateText,
  dutyPaidDate: dateText,
  deliveredDate: dateText,
  icegateIdSnapshot: optionalText(120),
  chaPanSnapshot: optionalText(20),
  atpNameSnapshot: optionalText(),
  atpPanSnapshot: optionalText(20),
  standardIec: z.boolean().default(true),
  importerNameSnapshot: optionalText(),
  importerIecSnapshot: optionalText(20),
  importerBranchSerialNo: optionalText(40),
  importerCategory: optionalText(80),
  importerType: optionalText(80),
  importerAddressSnapshot: optionalText(MAX_LONG_TEXT),
  importerClass: optionalText(80),
  importerCitySnapshot: optionalText(120),
  importerStateSnapshot: optionalText(120),
  importerPinCodeSnapshot: optionalText(20),
  importerAdCodeSnapshot: optionalText(40),
  importerOriginState: optionalText(120),
  importerGstnType: optionalText(80),
  importerTaxRegistrationNo: optionalText(80),
  firstCheck: z.boolean().default(false),
  greenChannel: z.boolean().default(false),
  kacchaBe: z.boolean().default(false),
  provisionalAssessment: z.boolean().default(false),
  highSeaSale: z.boolean().default(false),
  exBond: z.boolean().default(false),
  ucrType: optionalText(80),
  ucrNo: optionalText(120),
  paymentMethod: optionalText(80),
  bondDetailsText: optionalText(MAX_LONG_TEXT),
  certificateDetailsText: optionalText(MAX_LONG_TEXT),
  portOfShipment: optionalText(),
  portOfShipmentCode: optionalText(80),
  countryOfShipment: optionalText(120),
  countryOfShipmentCode: optionalText(20),
  portOfOrigin: optionalText(),
  portOfOriginCode: optionalText(80),
  countryOfOrigin: optionalText(120),
  countryOfOriginCode: optionalText(20),
});

export const importIgmBillRowSchema = z
  .object({
    sequenceNo: z.coerce.number().int().positive().max(9999),
    mblNo: optionalText(120),
    noMbl: z.boolean().default(false),
    mblDate: dateText,
    hblNo: optionalText(120),
    hblDate: dateText,
    packageCount: decimalText,
    packageCode: optionalText(80),
    grossWeight: decimalText,
    netWeight: decimalText,
    uom: optionalText(30),
  })
  .superRefine((row, ctx) => {
    if (row.noMbl && row.mblNo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mblNo"], message: "MBL No must be empty when No MBL is selected." });
    }
    if (!row.noMbl && !row.mblNo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mblNo"], message: "MBL No is required unless No MBL is selected." });
    }
    if (row.hblDate && !row.hblNo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["hblNo"], message: "HBL No is required when HBL Date is present." });
    }
  });

export const importContainerDraftSchema = z.object({
  sequenceNo: z.coerce.number().int().positive().max(9999),
  containerNo: z.string().trim().min(1, "Container No is required.").max(40),
  containerSize: optionalText(20),
  sealNo: optionalText(80),
  packageCount: decimalText,
  grossWeight: decimalText,
  netWeight: decimalText,
});

export const importIgmDraftSchema = z
  .object({
    lockVersion,
    igmNo: optionalText(120),
    fileType: optionalText(80),
    igmDate: dateText,
    inwardDate: dateText,
    gatewayPort: optionalText(120),
    gatewayMode: optionalText(80),
    mblNo: optionalText(120),
    noMbl: z.boolean().default(false),
    mblDate: dateText,
    packageCount: decimalText,
    packageCode: optionalText(80),
    hblNo: optionalText(120),
    hblDate: dateText,
    grossWeight: decimalText,
    netWeight: decimalText,
    uom: optionalText(30),
    marksAndNos: optionalText(MAX_LONG_TEXT),
    section48: z.boolean().default(false),
    section48Text: optionalText(MAX_LONG_TEXT),
    billRows: z.array(importIgmBillRowSchema).max(500).default([]),
    containers: z.array(importContainerDraftSchema).max(500).default([]),
  })
  .superRefine((draft, ctx) => {
    if (draft.section48 && !draft.section48Text) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["section48Text"], message: "Section 48 text is required when Section 48 is selected." });
    }
    const seenSequences = new Set<number>();
    for (const [index, row] of draft.billRows.entries()) {
      if (seenSequences.has(row.sequenceNo)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["billRows", index, "sequenceNo"], message: "Serial No must be unique." });
      }
      seenSequences.add(row.sequenceNo);
    }
  });

export type ImportBeMainDraftInput = z.infer<typeof importBeMainDraftSchema>;
export type ImportIgmDraftInput = z.infer<typeof importIgmDraftSchema>;

export const importInvoiceChargeDraftSchema = z.object({
  sequenceNo: z.coerce.number().int().positive().max(999),
  chargeType: optionalText(80),
  currency: optionalText(10),
  exchangeRate: decimalText,
  rate: decimalText,
  amount: decimalText,
  amountInr: decimalText,
  isActual: z.boolean().default(false),
});

export const importInvoiceDraftSchema = z.object({
  sequenceNo: z.coerce.number().int().positive().max(9999),
  invoiceNo: z.string().trim().min(1, "Invoice number is required.").max(120),
  invoiceDate: dateText,
  natureOfPayment: optionalText(120),
  natureOfTransaction: optionalText(120),
  currency: optionalText(10),
  exchangeRate: decimalText,
  invoiceValue: decimalText,
  invoiceValueInr: decimalText,
  incoTerms: optionalText(80),
  valuationMethod: optionalText(120),
  supplierNameSnapshot: optionalText(),
  supplierAddressSnapshot: optionalText(MAX_LONG_TEXT),
  supplierCountrySnapshot: optionalText(120),
  supplierZipCodeSnapshot: optionalText(40),
  useForAllInvoice: z.boolean().default(false),
  useAsDefaultManufacturer: z.boolean().default(false),
  sellerText: optionalText(MAX_LONG_TEXT),
  brokerText: optionalText(MAX_LONG_TEXT),
  thirdPartyText: optionalText(MAX_LONG_TEXT),
  aeoText: optionalText(MAX_LONG_TEXT),
  svbText: optionalText(MAX_LONG_TEXT),
  singleFreightInsurance: z.boolean().default(false),
  actualFreight: z.boolean().default(false),
  assessableValueFc: decimalText,
  assessableValueInr: decimalText,
  charges: z.array(importInvoiceChargeDraftSchema).max(25).default([]),
});

export const importItemDraftSchema = z.object({
  sequenceNo: z.coerce.number().int().positive().max(9999),
  invoiceSequenceNo: z.coerce.number().int().positive().max(9999).optional().nullable(),
  ritcNo: optionalText(20),
  itemDescription: optionalText(MAX_LONG_TEXT),
  schemeCode: optionalText(80),
  quantity: decimalText,
  unit: optionalText(30),
  unitPrice: decimalText,
  per: decimalText,
  itemAmount: decimalText,
  itemAmountInr: decimalText,
  assessableValue: decimalText,
  totalPmv: decimalText,
  endUse: optionalText(120),
  countryOfOrigin: optionalText(120),
  notificationNo: optionalText(120),
  notificationSerialNo: optionalText(80),
  notificationSubSerialNo: optionalText(80),
  bcdRate: decimalText,
  aidcRate: decimalText,
  cessRate: decimalText,
  otherDutyText: optionalText(MAX_LONG_TEXT),
  bondCode: optionalText(80),
  licenseNo: optionalText(120),
});

export const importDeclarationDraftSchema = z.object({
  sequenceNo: z.coerce.number().int().positive().max(9999),
  statementType: optionalText(80),
  statementCode: optionalText(80),
  statementText: optionalText(MAX_LONG_TEXT),
  declarationType: optionalText(80),
  declarationNo: optionalText(120),
  declarationDate: dateText,
  invoiceSequenceNo: z.coerce.number().int().positive().max(9999).optional().nullable(),
  itemSequenceNo: z.coerce.number().int().positive().max(9999).optional().nullable(),
});

export const importSupportingDocumentDraftSchema = z.object({
  sequenceNo: z.coerce.number().int().positive().max(9999),
  documentCode: z.string().trim().min(1, "Document code is required.").max(80),
  documentNameSnapshot: optionalText(),
  irnNo: optionalText(120),
  drnNo: optionalText(120),
  issueDate: dateText,
  expiryDate: dateText,
  declarationType: optionalText(80),
  fileType: optionalText(80),
  placeOfIssue: optionalText(120),
  invoiceSequenceNo: z.coerce.number().int().positive().max(9999).optional().nullable(),
  itemSequenceNo: z.coerce.number().int().positive().max(9999).optional().nullable(),
  icegateIdSnapshot: optionalText(120),
  documentVersionId: optionalText(120),
  issuingPartyText: optionalText(MAX_LONG_TEXT),
});

export const importRemainingDraftSchema = z.object({
  lockVersion,
  invoices: z.array(importInvoiceDraftSchema).max(500).default([]),
  items: z.array(importItemDraftSchema).max(2000).default([]),
  declarations: z.array(importDeclarationDraftSchema).max(500).default([]),
  supportingDocuments: z.array(importSupportingDocumentDraftSchema).max(500).default([]),
});

export type ImportInvoiceDraftInput = z.infer<typeof importInvoiceDraftSchema>;
export type ImportItemDraftInput = z.infer<typeof importItemDraftSchema>;
export type ImportDeclarationDraftInput = z.infer<typeof importDeclarationDraftSchema>;
export type ImportSupportingDocumentDraftInput = z.infer<typeof importSupportingDocumentDraftSchema>;
export type ImportRemainingDraftInput = z.infer<typeof importRemainingDraftSchema>;

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

export const exportPackageDraftSchema = z.object({
  sequenceNo: z.coerce.number().int().positive().max(9999),
  packageType: optionalText(80),
  packageCode: optionalText(80),
  packageCount: decimalText,
  loosePackageCount: decimalText,
  marksAndNos: optionalText(MAX_LONG_TEXT),
});

export const exportContainerDraftSchema = z.object({
  sequenceNo: z.coerce.number().int().positive().max(9999),
  containerNo: z.string().trim().max(40).default(""),
  containerSize: optionalText(20),
  sealNo: optionalText(80),
  packageCount: decimalText,
  grossWeight: decimalText,
  netWeight: decimalText,
});

export const exportSbMainDraftSchema = z.object({
  lockVersion,
  jobDate: dateText,
  sbType: optionalText(120),
  transportMode: optionalText(80),
  bookingNo: optionalText(120),
  bookingDate: dateText,
  customsHouse: optionalText(120),
  customsHouseCode: optionalText(80),
  sbNumber: optionalText(80),
  sbDate: dateText,
  examinationDate: dateText,
  leoDate: dateText,
  icegateIdSnapshot: optionalText(120),
  chaExporterPanSnapshot: optionalText(20),
  standardIec: z.boolean().default(true),
  exporterNameSnapshot: optionalText(),
  exporterIecSnapshot: optionalText(20),
  exporterBranchSerialNo: optionalText(40),
  exporterType: optionalText(80),
  exporterClass: optionalText(80),
  exporterAddressSnapshot: optionalText(MAX_LONG_TEXT),
  exporterAdCodeSnapshot: optionalText(40),
  exporterCitySnapshot: optionalText(120),
  exporterStateSnapshot: optionalText(120),
  exporterPinCodeSnapshot: optionalText(20),
  nfei: optionalText(80),
  benefitTo: optionalText(80),
  exporterOriginState: optionalText(120),
  exporterGstnType: optionalText(80),
  exporterTaxRegistrationNo: optionalText(80),
  moowr: optionalText(80),
  consigneeNameSnapshot: optionalText(),
  consigneeAddressSnapshot: optionalText(MAX_LONG_TEXT),
  consigneeCountrySnapshot: optionalText(120),
  portOfDischarge: optionalText(120),
  portOfDischargeCode: optionalText(80),
  dischargeCountry: optionalText(120),
  dischargeCountryCode: optionalText(20),
  portOfDestination: optionalText(120),
  portOfDestinationCode: optionalText(80),
  destinationCountry: optionalText(120),
  destinationCountryCode: optionalText(20),
  natureOfCargo: optionalText(120),
  sealType: optionalText(80),
  numberOfContainers: decimalText,
  grossWeight: decimalText,
  netWeight: decimalText,
  uom: optionalText(30),
  numberOfPackages: decimalText,
  packageCode: optionalText(80),
  loosePackage: decimalText,
  mawbNo: optionalText(120),
  mawbDate: dateText,
  hawbNo: optionalText(120),
  hawbDate: dateText,
  marksAndNos: optionalText(MAX_LONG_TEXT),
  rotationStuffingText: optionalText(MAX_LONG_TEXT),
  eouDetailsText: optionalText(MAX_LONG_TEXT),
  packageRows: z.array(exportPackageDraftSchema).max(500).default([]),
  containerRows: z.array(exportContainerDraftSchema).max(500).default([]),
});

export const exportInvoiceChargeDraftSchema = z.object({
  sequenceNo: z.coerce.number().int().positive().max(999),
  chargeType: optionalText(80),
  currency: optionalText(10),
  exchangeRate: decimalText,
  rate: decimalText,
  amount: decimalText,
  amountInr: decimalText,
  isDeduction: z.boolean().default(false),
});

export const exportInvoiceDraftSchema = z.object({
  sequenceNo: z.coerce.number().int().positive().max(9999),
  invoiceNo: z.string().trim().min(1, "Invoice number is required.").max(120),
  invoiceDate: dateText,
  contractNo: optionalText(120),
  natureOfPayment: optionalText(120),
  periodOfPayment: optionalText(120),
  currency: optionalText(10),
  exchangeRate: decimalText,
  productValue: decimalText,
  productValueInr: decimalText,
  incoTerms: optionalText(80),
  addFreight: optionalText(80),
  sameAsConsignee: z.boolean().default(false),
  buyerNameSnapshot: optionalText(),
  buyerAddressSnapshot: optionalText(MAX_LONG_TEXT),
  buyerCountrySnapshot: optionalText(120),
  thirdPartyText: optionalText(MAX_LONG_TEXT),
  aeoText: optionalText(MAX_LONG_TEXT),
  invoiceValueFc: decimalText,
  invoiceValueInr: decimalText,
  fobValueFc: decimalText,
  fobValueInr: decimalText,
  calculationOverrideReason: optionalText(MAX_LONG_TEXT),
  charges: z.array(exportInvoiceChargeDraftSchema).max(25).default([]),
});

export const exportInvoiceDraftSetSchema = z.object({
  lockVersion,
  invoices: z.array(exportInvoiceDraftSchema).max(500).default([]),
});

export const exportItemDraftSchema = z.object({
  sequenceNo: z.coerce.number().int().positive().max(9999),
  invoiceSequenceNo: z.coerce.number().int().positive().max(9999).optional().nullable(),
  invoiceNoSnapshot: optionalText(120),
  totalProductCount: z.coerce.number().int().nonnegative().max(9999).default(0),
  productSequenceNo: z.coerce.number().int().positive().max(9999).optional().nullable(),
  ritcNo: optionalText(20),
  itemDescription: optionalText(MAX_LONG_TEXT),
  schemeCode: optionalText(80),
  quantity: decimalText,
  unit: optionalText(30),
  measurementUqc: optionalText(30),
  unitPrice: decimalText,
  priceUnit: optionalText(30),
  per: decimalText,
  itemAmount: decimalText,
  itemAmountInr: decimalText,
  totalPmv: decimalText,
  endUse: optionalText(120),
  state: optionalText(120),
  district: optionalText(120),
  fta: optionalText(120),
  cess: decimalText,
  additionalDetails: optionalText(MAX_LONG_TEXT),
  rodtepCode: optionalText(80),
  singleWindowType: optionalText(80),
  singleWindowQfr: optionalText(80),
  singleWindowCode: optionalText(80),
  singleWindowText: optionalText(MAX_LONG_TEXT),
  singleWindowMeasurement: optionalText(80),
  singleWindowUqc: optionalText(30),
  gstPaymentStatus: optionalText(80),
  gstIgstOn: optionalText(80),
  taxableValue: decimalText,
  igstRate: decimalText,
  igstAmount: decimalText,
  drawbackScheduleNo: optionalText(80),
  drawbackQuantity: decimalText,
  drawbackRatePercent: decimalText,
  drawbackCapInInr: decimalText,
  drawbackUqc: optionalText(30),
  drawbackAmount: decimalText,
  rosctlRate: decimalText,
  rosctlSpecificRate: decimalText,
  rosctlAmount: decimalText,
  rodtepRate: decimalText,
  rodtepCap: decimalText,
  rodtepQuantity: decimalText,
  rodtepUqc: optionalText(30),
  rodtepAmount: decimalText,
  reward: optionalText(80),
  thirdParty: optionalText(80),
  manufacturer: optionalText(80),
  quota: optionalText(80),
  ar4: optionalText(80),
  jobWork: optionalText(80),
  reExport: optionalText(80),
  license: optionalText(120),
  eouDetails: optionalText(MAX_LONG_TEXT),
  declaration: optionalText(80),
  cessOption: optionalText(80),
});

export const exportSupportingDocumentDraftSchema = z.object({
  sequenceNo: z.coerce.number().int().positive().max(9999),
  documentCode: z.string().trim().min(1, "Document code is required.").max(80),
  documentNameSnapshot: optionalText(),
  irnNo: optionalText(120),
  drnNo: optionalText(120),
  issueDate: dateText,
  declarationType: optionalText(80),
  fileType: optionalText(80),
  placeOfIssue: optionalText(120),
  invoiceSequenceNo: z.coerce.number().int().positive().max(9999).optional().nullable(),
  itemSequenceNo: z.coerce.number().int().positive().max(9999).optional().nullable(),
  expiryDate: dateText,
  invoiceNoSnapshot: optionalText(120),
  icegateIdSnapshot: optionalText(120),
  issuingPartyCode: optionalText(80),
  issuingPartyNameSnapshot: optionalText(),
  issuingPartyAddressSnapshot: optionalText(MAX_LONG_TEXT),
  issuingPartyCitySnapshot: optionalText(120),
  issuingPartyPinSnapshot: optionalText(20),
  beneficiaryCode: optionalText(80),
  beneficiaryNameSnapshot: optionalText(),
  beneficiaryAddressSnapshot: optionalText(MAX_LONG_TEXT),
  beneficiaryCitySnapshot: optionalText(120),
  beneficiaryPinSnapshot: optionalText(20),
  documentVersionId: optionalText(120),
});

export const exportRemainingDraftSchema = z.object({
  lockVersion,
  items: z.array(exportItemDraftSchema).max(2000).default([]),
  supportingDocuments: z.array(exportSupportingDocumentDraftSchema).max(500).default([]),
});

export type ExportPackageDraftInput = z.infer<typeof exportPackageDraftSchema>;
export type ExportContainerDraftInput = z.infer<typeof exportContainerDraftSchema>;
export type ExportSbMainDraftInput = z.infer<typeof exportSbMainDraftSchema>;
export type ExportInvoiceDraftInput = z.infer<typeof exportInvoiceDraftSchema>;
export type ExportInvoiceDraftSetInput = z.infer<typeof exportInvoiceDraftSetSchema>;
export type ExportItemDraftInput = z.infer<typeof exportItemDraftSchema>;
export type ExportSupportingDocumentDraftInput = z.infer<typeof exportSupportingDocumentDraftSchema>;
export type ExportRemainingDraftInput = z.infer<typeof exportRemainingDraftSchema>;

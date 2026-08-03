export type MovementDirection = "IMPORT" | "EXPORT";

export type ImportJobTabId =
  | "be-main-details"
  | "igm"
  | "invoice"
  | "item-details"
  | "declaration"
  | "supporting-documents"
  | "checklist"
  | "flat-file";

export type ImportJobDraftStatus = "DRAFT" | "LOCKED";

export type TabCompletionState = "empty" | "in-progress" | "complete" | "invalid";

export type MoneyString = string;
export type IsoDateString = string;

export type ImportChargeKey =
  | "miscellaneous"
  | "freight"
  | "insurance"
  | "agency"
  | "loading"
  | "discount"
  | "highSeaSale";

export type ImportDutyKey =
  | "bcd"
  | "aidc"
  | "sws"
  | "igst"
  | "igstExemption"
  | "compensationCess"
  | "compensationExemption"
  | "safeguard"
  | "sapta";

export interface ImportJobMainDetails {
  jobNo: string;
  jobDate: IsoDateString;
  beType: string;
  transportMode: string;
  filingType: string;
  customsHouse: string;
  customsHouseCode: string;
  warehouseCode: string;
  warehouseCustomsSiteId: string;
  numberOfPackages: MoneyString;
  packageCode: string;
  grossWeight: MoneyString;
  uom: string;
  beNo: string;
  beDate: IsoDateString;
  examinationDate: IsoDateString;
  oocDate: IsoDateString;
  dutyPaidDate: IsoDateString;
  deliveredDate: IsoDateString;
  icegateId: string;
  chaPanNo: string;
  atpName: string;
  atpPanNo: string;
  standardIec: string;
  importerName: string;
  iecNo: string;
  branchSerialNo: string;
  importerCategory: string;
  importerType: string;
  importerClass: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  adCode: string;
  stateOfOrigin: string;
  gstnType: string;
  taxRegistrationNo: string;
  firstCheck: boolean;
  greenChannel: boolean;
  kacchaBe: boolean;
  provisionalAssessment: boolean;
  highSeaSale: boolean;
  exBond: boolean;
  ucrType: string;
  ucrNo: string;
  paymentMethod: string;
  bondDetails: string;
  certificateDetails: string;
  portOfShipment: string;
  portOfShipmentCode: string;
  countryOfShipment: string;
  countryOfShipmentCode: string;
  portOfOrigin: string;
  portOfOriginCode: string;
  countryOfOrigin: string;
  countryOfOriginCode: string;
  otherDetails: string;
}

export interface ImportIgmRecord {
  id: string;
  serialNo: number;
  igmNo: string;
  igmDate: IsoDateString;
  inwardDate: IsoDateString;
  gatewayPort: string;
  gatewayMode: string;
  mblNo: string;
  noMbl: boolean;
  mblDate: IsoDateString;
  numberOfPackages: MoneyString;
  packageCode: string;
  twentyFtCount: MoneyString;
  fortyFtCount: MoneyString;
  hblNo: string;
  hblDate: IsoDateString;
  grossWeight: MoneyString;
  netWeight: MoneyString;
  uom: string;
  marksAndNumbers: string;
  section48: boolean;
  section48Details: string;
  containerDetails: string;
}

export interface ImportInvoiceCharge {
  key: ImportChargeKey;
  apply: boolean;
  currency: string;
  exchangeRate: MoneyString;
  rate: MoneyString;
  amount: MoneyString;
}

export interface ImportInvoiceRecord {
  id: string;
  serialNo: number;
  jobNo: string;
  invoiceNo: string;
  invoiceDate: IsoDateString;
  natureOfPayment: string;
  natureOfTransaction: string;
  currency: string;
  exchangeRate: MoneyString;
  invoiceValue: MoneyString;
  incoterms: string;
  valuationMethod: string;
  totalInvoice: boolean;
  useForAllInvoices: boolean;
  useAsDefaultManufacturer: boolean;
  supplierName: string;
  supplierAddress: string;
  supplierCountry: string;
  zipCode: string;
  sellerDetails: string;
  brokerDetails: string;
  thirdParty: boolean;
  aeo: boolean;
  svbDetails: string;
  singleFreightAndInsurance: boolean;
  actualFreight: boolean;
  charges: ImportInvoiceCharge[];
}

export interface ImportDutyRow {
  key: ImportDutyKey;
  notification: string;
  serialNo: string;
  rate: MoneyString;
  amount: MoneyString;
  uom: string;
  flag: string;
  manualOverride: boolean;
}

export interface ImportItemRecord {
  id: string;
  serialNo: number;
  jobNo: string;
  invoiceId: string;
  invoiceSerialNo: number | "";
  invoiceNo: string;
  totalNumberOfProducts: MoneyString;
  productSerialNo: string;
  ritcNo: string;
  productDescription: string;
  dutyRate: MoneyString;
  schemeType: string;
  quantity: MoneyString;
  unit: string;
  unitPrice: MoneyString;
  endUse: string;
  countryOfOrigin: string;
  cthNo: string;
  cethNo: string;
  schemeCode: string;
  schemeNotification: string;
  notificationSerialNo: string;
  genericDescription: string;
  foc: boolean;
  squc: string;
  sqc: string;
  duties: ImportDutyRow[];
  otherDuty: string;
  rsp: string;
  tariff: string;
  antiDumping: string;
  manufacturer: string;
  reImport: string;
  licence: string;
  ftaDetails: string;
  singleWindow: string;
  sez: string;
}

export interface ImportDeclarationRecord {
  id: string;
  serialNo: number;
  statementType: string;
  statementCode: string;
  statementText: string;
  declarationType: string;
  declarationNo: string;
  date: IsoDateString;
  invoiceId: string;
  invoiceSerialNo: number | "";
  itemId: string;
  itemSerialNo: number | "";
}

export interface ImportSupportingDocumentRecord {
  id: string;
  serialNo: number;
  documentTypeCode: string;
  irnNo: string;
  drnNo: string;
  issueDate: IsoDateString;
  declarationType: string;
  fileType: string;
  placeOfIssue: string;
  invoiceId: string;
  invoiceSerialNo: number | "";
  itemId: string;
  itemSerialNo: number | "";
  expiryDate: IsoDateString;
  invoiceNo: string;
  icegateId: string;
  attachmentName: string;
  attachmentSize: number;
  attachmentType: string;
  partyCode: string;
  partyName: string;
  partyAddress: string;
  partyCity: string;
  partyPin: string;
  beneficiaryCode: string;
  beneficiaryName: string;
  beneficiaryAddress: string;
  beneficiaryCity: string;
  beneficiaryPin: string;
}

export interface ImportChecklistOptions {
  selectedJobNo: string;
  jobDate: IsoDateString;
  withDeclaration: boolean;
  printGeneratedAt: IsoDateString;
}

export interface ImportFlatFileHistoryEntry {
  id: string;
  generatedAt: string;
  checksum: string;
  validationErrorCount: number;
}

export interface ImportFlatFileOptions {
  selectedJobNo: string;
  jobDate: IsoDateString;
  dummyJob: boolean;
  lastGeneratedAt: string;
  lastChecksum: string;
  lastFlatFile: string;
  lastJson: string;
  lastValidationReport: string;
  history: ImportFlatFileHistoryEntry[];
}

export interface ImportJobDraft {
  id: string;
  schemaVersion: 1;
  movementDirection: MovementDirection;
  status: ImportJobDraftStatus;
  activeTab: ImportJobTabId;
  createdAt: string;
  updatedAt: string;
  mainDetails: ImportJobMainDetails;
  igmRecords: ImportIgmRecord[];
  invoiceRecords: ImportInvoiceRecord[];
  itemRecords: ImportItemRecord[];
  declarationRecords: ImportDeclarationRecord[];
  supportingDocumentRecords: ImportSupportingDocumentRecord[];
  checklistOptions: ImportChecklistOptions;
  flatFileOptions: ImportFlatFileOptions;
}

export interface ImportJobIntegrityWarning {
  parentType: "invoice" | "item";
  parentId: string;
  childType: "item" | "declaration" | "supportingDocument";
  childIds: string[];
  message: string;
}

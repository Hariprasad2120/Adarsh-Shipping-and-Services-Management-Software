export type QuoteStatus = "draft" | "sent";

export type QuoteApprovalStage =
  | "DRAFT"
  | "PENDING_MANAGER_APPROVAL"
  | "PENDING_CUSTOMER_APPROVAL"
  | "CUSTOMER_APPROVED"
  | "BOOKING_CREATED";

export type QuoteApprovalAuditEntry = {
  stage: "MANAGER" | "CUSTOMER" | "BOOKING";
  decision:
    | "SUBMITTED"
    | "APPROVED"
    | "REJECTED"
    | "CREATED"
    | "PROCESSING_PENDING";
  remarks?: string | null;
  actedAt?: string | null;
  actedById?: string | null;
  actedByName?: string | null;
};

export type QuoteApprovalFlowState = {
  selectedManagerId?: string | null;
  selectedManagerName?: string | null;
  submittedAt?: string | null;
  submittedById?: string | null;
  submittedByName?: string | null;
  managerStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  managerDecisionAt?: string | null;
  managerDecisionById?: string | null;
  managerDecisionByName?: string | null;
  managerRemarks?: string | null;
  customerStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  customerDecisionAt?: string | null;
  customerDecisionById?: string | null;
  customerDecisionByName?: string | null;
  customerRemarks?: string | null;
  lastRejectedStage?: "MANAGER" | "CUSTOMER" | null;
  rejectionReturnedToDraftAt?: string | null;
  notifications?: string[];
  auditTrail?: QuoteApprovalAuditEntry[];
};

export type QuotePricingFreshnessStatus =
  | "CURRENT"
  | "STALE"
  | "MISSING"
  | "UNLINKED";

export type QuotePricingTrace = {
  status: QuotePricingFreshnessStatus;
  snapshotId?: string | null;
  snapshotVersionLabel?: string | null;
  sellTotal?: number | null;
  buyTotal?: number | null;
  marginAmount?: number | null;
  marginPercent?: number | null;
  currentSnapshotId?: string | null;
  currentSnapshotVersionLabel?: string | null;
  currentFinalizedVersionId?: string | null;
  currentFinalizedVersionLabel?: string | null;
  message?: string | null;
  checkedAt?: string | null;
};

export type QuoteConversionState = {
  createdAt?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  chaJobId?: string | null;
  chaJobNumber?: string | null;
  chaStatus?: "CREATED" | "PROCESSING_PENDING" | "PROCESSING" | null;
  freightBookingNumber?: string | null;
  freightBookingGroupId?: string | null;
  freightTransactionId?: string | null;
  freightTransactionType?: "MBL" | "HBL" | null;
  freightStatus?: "CREATED" | "PROCESSING_PENDING" | null;
  linkedLeadId?: string | null;
};

export type QuoteWorkflowContext = {
  mode: "freight-only" | "customs-only" | "combined" | "newly-added-only";
  includedDepartments: Array<"FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE">;
  pendingDepartments: Array<"FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE">;
  latestQuoteId?: string | null;
  latestQuoteVersion?: number | null;
  quoteBaseNumber?: string | null;
  recreateRequired?: boolean;
  pricingSnapshotId?: string | null;
  pricingSnapshotVersionLabel?: string | null;
  pricingSellTotal?: number | null;
  pricingBuyTotal?: number | null;
  pricingMarginAmount?: number | null;
  pricingMarginPercent?: number | null;
  pricingTrace?: QuotePricingTrace | null;
  approvalFlow?: QuoteApprovalFlowState | null;
  conversion?: QuoteConversionState | null;
};

export type QuoteListStatus =
  | "all"
  | "draft"
  | "pending-manager-approval"
  | "pending-customer-approval"
  | "customer-approved"
  | "booking-created"
  | "pending-approval"
  | "approved"
  | "sent"
  | "customer-viewed"
  | "accepted"
  | "invoiced"
  | "declined"
  | "rework";


export type LineItem = {
  id: string;
  description: string;
  hsnSac?: string;
  unit: string;
  quantity: number;
  rate: number;
  tax: string;
  tds: string;
  amount: number;
  currency?: string;
  exchangeRate?: number;
};

export type QuoteFormValues = {
  customerId: string;
  location: string;
  placeOfSupply: string;
  quoteNumber: string;
  referenceNumber?: string;
  quoteDate: string;
  expiryDate?: string;
  salesperson?: string;
  projectId?: string;
  portOfLoading?: string;
  portOfLoadingCountry?: string;
  portOfDischarge?: string;
  portOfDestinationCountry?: string;
  incoterm?: string;
  containerType?: string;
  numberOfContainers?: number;
  commodity?: string;
  weight?: string;
  lineItems: LineItem[];
  customerNotes?: string;
  terms?: string;
  bankDetailsId?: string;
  discountType: "percentage" | "amount";
  discountValue: number;
  adjustment: number;
  roundOff: number;
  subtotal: number;
  total: number;
};

export type ComboboxOption = {
  id: string;
  label: string;
  description?: string;
  meta?: string;
};

export type CustomerOption = ComboboxOption & {
  billingAddress?: string;
  contactEmail?: string;
  phone?: string;
  gstin?: string;
};

export type QuoteTemplateOption = "Spreadsheet Template" | "Standard Template" | "Compact Template";

export type QuoteRecord = {
  id: string;
  date: string;
  location: string;
  quoteNumber: string;
  referenceNumber?: string;
  customerName: string;
  status: Exclude<QuoteListStatus, "all">;
  amount: number;
  favorite?: boolean;
};

export type QuoteSummaryLine = {
  label: string;
  amount: number;
};

export type QuoteDetailItem = {
  id: string;
  name: string;
  description?: string;
  hsnSac?: string;
  quantity: number;
  unit?: string;
  price: number;
  tax?: string;
  tds?: string;
  amount: number;
  currency?: string;
  exchangeRate?: number;
};

export type QuoteDetailRecord = QuoteRecord & {
  creationDate: string;
  salesperson?: string;
  placeOfSupply: string;
  pdfTemplate: QuoteTemplateOption;
  customerInitial: string;
  customerEmail?: string;
  billingAddress?: string;
  shippingAddress?: string;
  notes?: string;
  terms?: string;
  bankDetailsId?: string;
  items: QuoteDetailItem[];
  taxes: QuoteSummaryLine[];
  discount: number;
  discountType?: string;
  adjustment: number;
  roundOff: number;
  subtotal: number;
  total: number;
  portOfLoading?: string;
  portOfLoadingCountry?: string;
  portOfDischarge?: string;
  portOfDestinationCountry?: string;
  incoterm?: string;
  containerType?: string;
  numberOfContainers?: number;
  commodity?: string;
  weight?: string;
  slaDeadline?: string | null;
  reworkNote?: string | null;
  versionNumber?: number | null;
  rootQuoteNumber?: string | null;
  workflowContext?: QuoteWorkflowContext | null;
  managerOptions?: Array<{ id: string; name: string }>;
  versionHistory?: Array<{
    id: string;
    quoteNumber: string;
    versionNumber: number;
    status: Exclude<QuoteListStatus, "all">;
    createdAt: string;
    createdBy?: string | null;
  }>;
};

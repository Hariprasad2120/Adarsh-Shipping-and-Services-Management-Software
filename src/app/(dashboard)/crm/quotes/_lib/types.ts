export type QuoteStatus = "draft" | "sent";

export type QuoteListStatus =
  | "all"
  | "draft"
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
  unit: string;
  quantity: number;
  rate: number;
  tax: string;
  tds: string;
  amount: number;
};

export type QuoteFormValues = {
  customerId: string;
  location: string;
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
  quantity: number;
  unit?: string;
  price: number;
  tax?: string;
  tds?: string;
  amount: number;
};

export type QuoteDetailRecord = QuoteRecord & {
  creationDate: string;
  salesperson?: string;
  placeOfSupply: string;
  pdfTemplate: QuoteTemplateOption;
  customerInitial: string;
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
  portOfDischarge?: string;
  incoterm?: string;
  containerType?: string;
  numberOfContainers?: number;
  commodity?: string;
  weight?: string;
  slaDeadline?: string | null;
  reworkNote?: string | null;
};

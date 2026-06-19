import type { ComboboxOption, CustomerOption, LineItem, QuoteFormValues, QuoteTemplateOption } from "./types";

export const customers: CustomerOption[] = [
  {
    id: "cust_adarsh",
    label: "Adarsh Shipping & Services",
    description: "adarsh@shipping.example",
    billingAddress: "Old No. 14, New No. 28, NSC Bose Road, Chennai",
    contactEmail: "quotes@adarshshipping.com",
    phone: "+91 98410 22110",
  },
  {
    id: "cust_blue_ocean",
    label: "Blue Ocean Logistics",
    description: "ops@blueocean.example",
    billingAddress: "Harbour Estate, Royapuram, Chennai",
    contactEmail: "ops@blueoceanlogistics.com",
    phone: "+91 97909 77831",
  },
  {
    id: "cust_chennai_ff",
    label: "Chennai Freight Forwarders",
    description: "sales@cff.example",
    billingAddress: "GST Road, Guindy, Chennai",
    contactEmail: "sales@chennaifreight.com",
    phone: "+91 98845 66411",
  },
  {
    id: "cust_global_ie",
    label: "Global Import Export Pvt Ltd",
    description: "trade@globalie.example",
    billingAddress: "SIPCOT Industrial Park, Sriperumbudur",
    contactEmail: "trade@globalimportexport.com",
    phone: "+91 99620 44882",
  },
];

export const locations = ["Chennai", "Mumbai", "Delhi", "Kolkata", "Mundra"] as const;

export const sourceOfSupplyByLocation: Record<(typeof locations)[number], string> = {
  Chennai: "Tamil Nadu",
  Mumbai: "Maharashtra",
  Delhi: "Delhi",
  Kolkata: "West Bengal",
  Mundra: "Gujarat",
};

export const salespersons: ComboboxOption[] = [
  { id: "sales_hari", label: "Hari Prasad" },
  { id: "sales_purush", label: "Purushothaman" },
  { id: "sales_admin", label: "Admin User" },
];

export const projects: Array<ComboboxOption & { customerId: string }> = [
  { id: "project_export_june", label: "Export Shipment - June", customerId: "cust_adarsh" },
  { id: "project_import_clearance", label: "Import Clearance - Chennai", customerId: "cust_blue_ocean" },
  { id: "project_freight_quote", label: "Freight Forwarding Quote", customerId: "cust_global_ie" },
];

export type BankAccount = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upi?: string;
};

export const bankAccounts: BankAccount[] = [
  {
    id: "bank_sbi",
    bankName: "State Bank of India",
    accountName: "Adarsh Shipping & Services",
    accountNumber: "XXXX XXXX 7892",
    ifsc: "SBIN0001234",
    branch: "NSC Bose Road, Chennai",
    upi: "adarshshipping@sbi",
  },
  {
    id: "bank_hdfc",
    bankName: "HDFC Bank",
    accountName: "Adarsh Shipping & Services",
    accountNumber: "XXXX XXXX 4451",
    ifsc: "HDFC0002847",
    branch: "Royapuram, Chennai",
    upi: "adarshshipping@hdfc",
  },
  {
    id: "bank_icici",
    bankName: "ICICI Bank",
    accountName: "Adarsh Shipping & Services",
    accountNumber: "XXXX XXXX 9034",
    ifsc: "ICIC0003912",
    branch: "Anna Nagar, Chennai",
  },
];

export const taxes = ["GST 0%", "GST 5%", "GST 12%", "GST 18%", "IGST 18%"] as const;
export const tdsOptions = ["None", "TDS 1%", "TDS 2%", "TDS 10%"] as const;
export const incoterms = ["EXW", "FOB", "CIF", "CFR", "DAP", "DDP", "FCA"] as const;
export const containerTypes = ["20FT", "40FT", "40HQ", "LCL", "Air Cargo"] as const;
export const units = ["PCS", "KG", "TON", "CBM", "Container", "Shipment"] as const;
export const pdfTemplates: QuoteTemplateOption[] = ["Spreadsheet Template", "Standard Template", "Compact Template"];

export function createEmptyLineItem(): LineItem {
  return {
    id: `line_${Math.random().toString(36).slice(2, 10)}`,
    description: "",
    hsnSac: "",
    unit: "PCS",
    quantity: 0,
    rate: 0,
    tax: "",
    tds: "None",
    amount: 0,
  };
}

export const defaultQuoteValues: QuoteFormValues = {
  customerId: "",
  location: "Chennai",
  placeOfSupply: "33",
  quoteNumber: "QT-2026-001",
  referenceNumber: "",
  quoteDate: new Date().toISOString().slice(0, 10),
  expiryDate: "",
  salesperson: "",
  projectId: "",
  portOfLoading: "",
  portOfLoadingCountry: "",
  portOfDischarge: "",
  portOfDestinationCountry: "",
  incoterm: "",
  containerType: "",
  numberOfContainers: 0,
  commodity: "",
  weight: "",
  lineItems: [createEmptyLineItem()],
  customerNotes: "",
  terms: "",
  bankDetailsId: "",
  discountType: "percentage",
  discountValue: 0,
  adjustment: 0,
  roundOff: 0,
  subtotal: 0,
  total: 0,
};

export type FixtureOption = {
  value: string;
  label: string;
  code?: string;
};

export const importMasterData = {
  beTypes: [
    { value: "Home Consumption", label: "Home Consumption" },
    { value: "Warehousing", label: "Warehousing" },
    { value: "Ex-Bond", label: "Ex-Bond" },
  ],
  transportModes: [
    { value: "Sea", label: "Sea" },
    { value: "Air", label: "Air" },
    { value: "Road", label: "Road" },
    { value: "Rail", label: "Rail" },
  ],
  filingTypes: [
    { value: "Prior", label: "Prior" },
    { value: "Normal", label: "Normal" },
    { value: "Advance", label: "Advance" },
  ],
  customsHouses: [
    { value: "JNCH Nhava Sheva", label: "JNCH Nhava Sheva", code: "INNSA1" },
    { value: "ACC Mumbai", label: "ACC Mumbai", code: "INBOM4" },
    { value: "Chennai Sea", label: "Chennai Sea", code: "INMAA1" },
  ],
  countries: [
    { value: "China", label: "China", code: "CN" },
    { value: "India", label: "India", code: "IN" },
    { value: "Germany", label: "Germany", code: "DE" },
    { value: "United States", label: "United States", code: "US" },
  ],
  ports: [
    { value: "Shanghai", label: "Shanghai", code: "CNSHA" },
    { value: "Hamburg", label: "Hamburg", code: "DEHAM" },
    { value: "Los Angeles", label: "Los Angeles", code: "USLAX" },
    { value: "JNPT", label: "JNPT", code: "INNSA" },
  ],
  currencies: [
    { value: "USD", label: "USD" },
    { value: "EUR", label: "EUR" },
    { value: "INR", label: "INR" },
    { value: "CNY", label: "CNY" },
  ],
  packageCodes: [
    { value: "PKG", label: "PKG - Package" },
    { value: "CTN", label: "CTN - Carton" },
    { value: "PCS", label: "PCS - Pieces" },
  ],
  uoms: [
    { value: "KGS", label: "KGS" },
    { value: "NOS", label: "NOS" },
    { value: "MTS", label: "MTS" },
    { value: "LTR", label: "LTR" },
  ],
  importerCategories: [
    { value: "Manufacturer", label: "Manufacturer" },
    { value: "Trader", label: "Trader" },
    { value: "EOU", label: "EOU" },
  ],
  importerTypes: [
    { value: "Private", label: "Private" },
    { value: "Public", label: "Public" },
    { value: "Government", label: "Government" },
  ],
  importerClasses: [
    { value: "Regular", label: "Regular" },
    { value: "AEO", label: "AEO" },
    { value: "First Time", label: "First Time" },
  ],
  gstnTypes: [
    { value: "GSTIN", label: "GSTIN" },
    { value: "PAN", label: "PAN" },
    { value: "UNREGISTERED", label: "Unregistered" },
  ],
  paymentMethods: [
    { value: "Transaction", label: "Transaction" },
    { value: "Deferred", label: "Deferred" },
    { value: "Bond", label: "Bond" },
  ],
  incoterms: [
    { value: "CIF", label: "CIF" },
    { value: "FOB", label: "FOB" },
    { value: "EXW", label: "EXW" },
  ],
  paymentNatures: [
    { value: "LC", label: "LC" },
    { value: "Advance", label: "Advance" },
    { value: "Open Account", label: "Open Account" },
  ],
  transactionNatures: [
    { value: "Sale", label: "Sale" },
    { value: "Stock Transfer", label: "Stock Transfer" },
    { value: "Sample", label: "Sample" },
  ],
  valuationMethods: [
    { value: "Transaction Value", label: "Transaction Value" },
    { value: "Deductive", label: "Deductive" },
    { value: "Computed", label: "Computed" },
  ],
  schemeTypes: [
    { value: "Normal", label: "Normal" },
    { value: "Project Import", label: "Project Import" },
    { value: "Advance Authorization", label: "Advance Authorization" },
  ],
  statementTypes: [
    { value: "General", label: "General" },
    { value: "Invoice", label: "Invoice" },
    { value: "Item", label: "Item" },
  ],
  declarationTypes: [
    { value: "BE", label: "BE" },
    { value: "Invoice", label: "Invoice" },
    { value: "Item", label: "Item" },
  ],
  documentTypes: [
    { value: "380000", label: "Commercial Invoice" },
    { value: "271000", label: "Packing List" },
    { value: "705000", label: "Bill of Lading" },
  ],
  fileTypes: [
    { value: "PDF", label: "PDF" },
    { value: "JPG", label: "JPG" },
    { value: "PNG", label: "PNG" },
  ],
  igmLookup: [
    {
      igmNo: "2255667",
      igmDate: "2026-07-26",
      inwardDate: "2026-07-28",
      gatewayPort: "JNPT",
      gatewayMode: "Sea",
      mblNo: "MSCU1234567",
      mblDate: "2026-07-18",
      numberOfPackages: "120",
      packageCode: "PKG",
      grossWeight: "24500",
      netWeight: "23800",
      uom: "KGS",
      marksAndNumbers: "AS PER PACKING LIST",
      containerDetails: "MSCU7654321 / 40FT; TLLU1122334 / 20FT",
    },
  ],
  defaultDeclarations: [
    {
      statementType: "General",
      statementCode: "DEC001",
      statementText: "Importer declares that the information is true for the test workspace.",
      declarationType: "BE",
    },
    {
      statementType: "Invoice",
      statementCode: "INVDEC",
      statementText: "Invoice value and supplier details are provided for testing only.",
      declarationType: "Invoice",
    },
  ],
} satisfies Record<string, unknown>;

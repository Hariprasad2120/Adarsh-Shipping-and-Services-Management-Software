export type ItemType = "Goods" | "Service";
export type TaxPreference = "Taxable" | "Non-Taxable";
export type ItemStatus = "Active" | "Inactive";
export type ItemFilter = "all" | "active" | "inactive" | "goods" | "services" | "sales" | "purchase";

export type ItemListItem = {
  id: string;
  name: string;
  sku?: string;
  purchaseDescription?: string;
  purchaseRate: number;
  description?: string;
  rate: number;
  hsnSac?: string;
  usageUnit?: string;
  type: ItemType;
  taxPreference: TaxPreference;
  status: ItemStatus;
};

export type ItemFormValues = {
  name: string;
  type: ItemType;
  unit?: string;
  sku?: string;
  hsnSac?: string;
  taxPreference: TaxPreference;
  taxRate?: string;
  exemptionReason?: string;
  sellingPrice: number;
  salesAccount: string;
  salesDescription?: string;
  purchaseInformation: boolean;
  costPrice?: number;
  purchaseAccount?: string;
  purchaseDescription?: string;
  inventoryTracking: boolean;
  openingStock?: number;
  reorderPoint?: number;
  chargeCategory?: string;
  applicableFor?: string;
  defaultContainerType?: string;
};

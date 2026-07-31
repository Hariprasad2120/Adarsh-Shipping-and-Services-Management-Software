import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { ItemFormSchema } from "@/lib/items/validation";

type ItemPayload = ItemFormSchema;
type AccountingItemRecord = {
  id: string;
  name: string;
  sku: string | null;
  purchaseDescription: string | null;
  purchaseRate: Prisma.Decimal | null;
  salesDescription: string | null;
  salesRate: Prisma.Decimal | null;
  hsnSac: string | null;
  usageUnit: string | null;
  itemType: string;
  taxPreference: string;
  status: string;
  priceList: unknown;
  priceListAuto: boolean;
  imageDataUrl: string | null;
  salesAccount: string | null;
  purchaseAccount: string | null;
  taxRate: string | null;
  exemptionReason: string | null;
  preferredVendorId: string | null;
  preferredVendorName: string | null;
  salesInformation: boolean;
  purchaseInformation: boolean;
  inventoryTracking: boolean;
  openingStock: Prisma.Decimal | null;
  reorderPoint: Prisma.Decimal | null;
  chargeCategory: string | null;
  applicableFor: string | null;
  defaultContainerType: string | null;
  rowVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

type AccountingItemMasterDelegate = {
  findMany(args: unknown): Promise<AccountingItemRecord[]>;
  findFirst(args: unknown): Promise<AccountingItemRecord | null>;
  create(args: unknown): Promise<AccountingItemRecord>;
  updateMany(args: unknown): Promise<{ count: number }>;
  deleteMany(args: unknown): Promise<{ count: number }>;
};

const accountingItemMaster = (
  db as unknown as { accountingItemMaster: AccountingItemMasterDelegate }
).accountingItemMaster;

function mapItem(row: AccountingItemRecord) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    purchaseDescription: row.purchaseDescription,
    purchaseRate: Number(row.purchaseRate ?? 0),
    description: row.salesDescription,
    rate: Number(row.salesRate ?? 0),
    hsnSac: row.hsnSac,
    usageUnit: row.usageUnit,
    type: row.itemType,
    taxPreference: row.taxPreference,
    status: row.status,
    priceList: Array.isArray(row.priceList) ? row.priceList : [],
    priceListAuto: row.priceListAuto,
    imageDataUrl: row.imageDataUrl,
    salesAccount: row.salesAccount,
    purchaseAccount: row.purchaseAccount,
    taxRate: row.taxRate,
    exemptionReason: row.exemptionReason,
    preferredVendorId: row.preferredVendorId,
    preferredVendorName: row.preferredVendorName,
    salesInformation: row.salesInformation,
    purchaseInformation: row.purchaseInformation,
    inventoryTracking: row.inventoryTracking,
    openingStock: Number(row.openingStock ?? 0),
    reorderPoint: Number(row.reorderPoint ?? 0),
    chargeCategory: row.chargeCategory,
    applicableFor: row.applicableFor,
    defaultContainerType: row.defaultContainerType,
    rowVersion: row.rowVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDecimal(value: number | undefined) {
  return new Prisma.Decimal(value ?? 0);
}

export async function listAccountingItems(orgId: string, input?: {
  activeOnly?: boolean;
  limit?: number;
}) {
  const rows = await accountingItemMaster.findMany({
    where: {
      orgId,
      ...(input?.activeOnly ? { status: "Active" } : {}),
    },
    orderBy: [{ name: "asc" }],
    take: input?.limit && input.limit > 0 ? Math.min(input.limit, 1000) : undefined,
  });

  return rows.map(mapItem);
}

export async function getAccountingItem(orgId: string, id: string) {
  const row = await accountingItemMaster.findFirst({
    where: { orgId, id },
  });
  return row ? mapItem(row) : null;
}

export async function createAccountingItem(orgId: string, data: ItemPayload) {
  const vendorId = data.preferredVendorId?.trim() || null;
  let vendorName = data.preferredVendorName?.trim() || "";
  if (vendorId) {
    const vendor = await db.crmVendor.findFirst({
      where: { orgId, id: vendorId, status: "ACTIVE" },
      select: { id: true, name: true },
    });
    if (!vendor) throw new Error("Preferred vendor is invalid");
    vendorName = vendor.name;
  }

  const created = await accountingItemMaster.create({
    data: {
      orgId,
      name: data.name.trim(),
      sku: data.sku?.trim() || null,
      purchaseDescription: data.purchaseDescription?.trim() || null,
      purchaseRate: toDecimal(data.purchaseInformation ? data.costPrice ?? 0 : 0),
      salesDescription: data.salesDescription?.trim() || null,
      salesRate: toDecimal(data.salesInformation ? data.sellingPrice : 0),
      hsnSac: data.hsnSac?.trim() || null,
      usageUnit: data.unit?.trim() || null,
      itemType: data.type,
      taxPreference: data.taxPreference,
      status: "Active",
      priceList: (data.priceList ?? []) as unknown as Prisma.InputJsonValue,
      priceListAuto: data.priceListAuto ?? true,
      imageDataUrl: data.imageDataUrl?.trim() || null,
      salesAccount: data.salesAccount?.trim() || null,
      purchaseAccount: data.purchaseAccount?.trim() || null,
      taxRate: data.taxRate?.trim() || null,
      exemptionReason: data.exemptionReason?.trim() || null,
      preferredVendorId: vendorId,
      preferredVendorName: vendorName || null,
      salesInformation: data.salesInformation,
      purchaseInformation: data.purchaseInformation,
      inventoryTracking: data.inventoryTracking,
      openingStock:
        data.inventoryTracking && data.openingStock != null
          ? new Prisma.Decimal(data.openingStock)
          : null,
      reorderPoint:
        data.inventoryTracking && data.reorderPoint != null
          ? new Prisma.Decimal(data.reorderPoint)
          : null,
      chargeCategory: data.chargeCategory?.trim() || null,
      applicableFor: data.applicableFor?.trim() || null,
      defaultContainerType: data.defaultContainerType?.trim() || null,
    },
  });

  return mapItem(created);
}

export async function updateAccountingItemsStatus(
  orgId: string,
  ids: string[],
  status: "Active" | "Inactive",
) {
  if (!ids.length) return 0;
  const result = await accountingItemMaster.updateMany({
    where: { orgId, id: { in: ids } },
    data: {
      status,
      rowVersion: { increment: 1 },
    },
  });
  return result.count;
}

export async function deleteAccountingItems(orgId: string, ids: string[]) {
  if (!ids.length) return 0;
  const result = await accountingItemMaster.deleteMany({
    where: { orgId, id: { in: ids } },
  });
  return result.count;
}

import { z } from "zod";

export const itemFormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    salesInformation: z.boolean(),
    type: z.enum(["Goods", "Service"] as const),
    unit: z.string().optional(),
    sku: z.string().optional(),
    hsnSac: z.string().optional(),
    taxPreference: z.enum(["Taxable", "Non-Taxable"] as const),
    taxRate: z.string().optional(),
    exemptionReason: z.string().optional(),
    sellingPrice: z.coerce.number().min(0, "Selling price must be 0 or more"),
    salesAccount: z.string().min(1, "Sales account is required"),
    salesDescription: z.string().optional(),
    purchaseInformation: z.boolean(),
    costPrice: z.coerce.number().min(0, "Cost price must be 0 or more").optional(),
    purchaseAccount: z.string().optional(),
    purchaseDescription: z.string().optional(),
    preferredVendorId: z.string().optional(),
    preferredVendorName: z.string().optional(),
    inventoryTracking: z.boolean(),
    openingStock: z.coerce.number().min(0, "Opening stock must be 0 or more").optional(),
    reorderPoint: z.coerce.number().min(0, "Reorder point must be 0 or more").optional(),
    chargeCategory: z.string().optional(),
    applicableFor: z.string().optional(),
    defaultContainerType: z.string().optional(),
    imageDataUrl: z.string().optional(),
    priceList: z.array(
      z.object({
        currency: z.string(),
        exchangeRate: z.coerce.number(),
        customPrice: z.coerce.number().optional(),
        useAutomatic: z.boolean().optional(),
      })
    ).optional(),
    priceListAuto: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.taxPreference === "Taxable" && !data.taxRate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tax rate is required for taxable items",
        path: ["taxRate"],
      });
    }
    if (data.taxPreference === "Non-Taxable" && !data.exemptionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exemption reason is required for non-taxable items",
        path: ["exemptionReason"],
      });
    }
    if (data.salesInformation && !data.salesAccount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sales account is required when sales information is enabled",
        path: ["salesAccount"],
      });
    }
    if (data.purchaseInformation && !data.purchaseAccount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Purchase account is required when purchase information is enabled",
        path: ["purchaseAccount"],
      });
    }
  });

export type ItemFormSchema = z.infer<typeof itemFormSchema>;

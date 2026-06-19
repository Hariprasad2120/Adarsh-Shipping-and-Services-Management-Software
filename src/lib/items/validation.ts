import { z } from "zod";

export const itemFormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
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
    inventoryTracking: z.boolean(),
    openingStock: z.coerce.number().min(0, "Opening stock must be 0 or more").optional(),
    reorderPoint: z.coerce.number().min(0, "Reorder point must be 0 or more").optional(),
    chargeCategory: z.string().optional(),
    applicableFor: z.string().optional(),
    defaultContainerType: z.string().optional(),
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
  });

export type ItemFormSchema = z.infer<typeof itemFormSchema>;

import { z } from "zod";

const numberField = z.coerce.number().min(0, "Must be 0 or more");

export const lineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  hsnSac: z.string().optional(),
  unit: z.string(),
  quantity: numberField,
  rate: numberField,
  tax: z.string(),
  tds: z.string(),
  amount: z.coerce.number(),
  currency: z.string().optional(),
  exchangeRate: z.coerce.number().optional(),
});

export const quoteFormSchema = z
  .object({
    customerId: z.string().min(1, "Customer Name is required"),
    location: z.string().min(1, "Location is required"),
    placeOfSupply: z.string().min(1, "Place of Supply is required"),
    quoteNumber: z.string().min(1, "Quote# is required"),
    referenceNumber: z.string().optional(),
    quoteDate: z.string().min(1, "Quote Date is required"),
    expiryDate: z.string().optional(),
    salesperson: z.string().optional(),
    projectId: z.string().optional(),
    portOfLoading: z.string().optional(),
    portOfLoadingCountry: z.string().optional(),
    portOfDischarge: z.string().optional(),
    portOfDestinationCountry: z.string().optional(),
    incoterm: z.string().optional(),
    containerType: z.string().optional(),
    numberOfContainers: z.coerce.number().min(0, "No of Containers must be 0 or more").optional(),
    commodity: z.string().optional(),
    weight: z.string().optional(),
    lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
    customerNotes: z.string().optional(),
    terms: z.string().optional(),
    bankDetailsId: z.string().optional(),
    discountType: z.enum(["percentage", "amount"]),
    discountValue: numberField,
    adjustment: z.coerce.number(),
    roundOff: z.coerce.number(),
    subtotal: z.coerce.number(),
    total: z.coerce.number(),
  })
  .superRefine((values, ctx) => {
    if (values.expiryDate && values.quoteDate && new Date(values.expiryDate) <= new Date(values.quoteDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiryDate"],
        message: "Expiry Date should be after Quote Date",
      });
    }
  });

export type QuoteFormSchemaValues = z.infer<typeof quoteFormSchema>;

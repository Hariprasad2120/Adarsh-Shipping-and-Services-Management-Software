import { z } from "zod";

export const AccountSchema = z.object({
  accountCode: z.string().min(1, "Account code is required"),
  accountName: z.string().min(1, "Account name is required"),
  parentAccountId: z.string().nullable().optional(),
  rootType: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
  accountType: z.enum([
    "CASH",
    "BANK",
    "RECEIVABLE",
    "PAYABLE",
    "TAX",
    "SALES",
    "PURCHASE",
    "EXPENSE",
    "FIXED_ASSET",
    "DEPRECIATION",
    "EQUITY",
    "ROUND_OFF",
    "OTHER",
  ]),
  isGroup: z.boolean().default(false),
  isActive: z.boolean().default(true),
  openingDebit: z.number().nonnegative().default(0),
  openingCredit: z.number().nonnegative().default(0),
  branchId: z.string().nullable().optional(),
});

export const JournalEntryLineSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  debit: z.number().nonnegative().default(0),
  credit: z.number().nonnegative().default(0),
  partyType: z.string().nullable().optional(),
  partyId: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
});

export const JournalEntrySchema = z.object({
  postingDate: z.coerce.date(),
  remarks: z.string().nullable().optional(),
  branchId: z.string().nullable().optional(),
  lines: z.array(JournalEntryLineSchema).min(2, "At least two lines are required"),
});

export const InvoiceItemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  qty: z.number().positive("Quantity must be positive"),
  rate: z.number().nonnegative("Rate cannot be negative"),
  currency: z.string().default("INR").optional(),
  exchangeRate: z.number().positive().default(1).optional(),
});

export const SalesInvoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  crmDealId: z.string().nullable().optional(),
  postingDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  branchId: z.string().nullable().optional(),
  items: z.array(InvoiceItemSchema).min(1, "At least one item is required"),
  discountAmount: z.number().nonnegative().default(0),
  taxRate: z.number().nonnegative().default(18), // Default GST 18%
  remarks: z.string().nullable().optional(),
  bankDetails: z.string().nullable().optional(),
  manualNotes: z.string().nullable().optional(),
});

export const PurchaseInvoiceSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  postingDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  branchId: z.string().nullable().optional(),
  items: z.array(InvoiceItemSchema).min(1, "At least one item is required"),
  discountAmount: z.number().nonnegative().default(0),
  taxRate: z.number().nonnegative().default(18),
  remarks: z.string().nullable().optional(),
});

export const PaymentAllocationSchema = z.object({
  salesInvoiceId: z.string().nullable().optional(),
  purchaseInvoiceId: z.string().nullable().optional(),
  allocatedAmount: z.number().positive("Allocation must be positive"),
});

export const PaymentEntrySchema = z.object({
  paymentType: z.enum(["RECEIVE", "PAY"]),
  postingDate: z.coerce.date(),
  partyType: z.enum(["CUSTOMER", "SUPPLIER"]),
  partyId: z.string().min(1, "Party is required"),
  paidFromAccountId: z.string().min(1, "Source account is required"),
  paidToAccountId: z.string().min(1, "Destination account is required"),
  amount: z.number().positive("Amount must be positive"),
  referenceNo: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  branchId: z.string().nullable().optional(),
  allocations: z.array(PaymentAllocationSchema).optional(),
});

export const AccountingSettingsSchema = z.object({
  defaultReceivableAccountId: z.string().nullable().optional(),
  defaultPayableAccountId: z.string().nullable().optional(),
  defaultCashAccountId: z.string().nullable().optional(),
  defaultBankAccountId: z.string().nullable().optional(),
  defaultSalesAccountId: z.string().nullable().optional(),
  defaultPurchaseAccountId: z.string().nullable().optional(),
  defaultTaxAccountId: z.string().nullable().optional(),
  defaultRoundOffAccountId: z.string().nullable().optional(),
  defaultSalaryExpenseAccountId: z.string().nullable().optional(),
  defaultSalaryPayableAccountId: z.string().nullable().optional(),
  defaultDepreciationExpenseAccountId: z.string().nullable().optional(),
  defaultAccumulatedDepreciationAccountId: z.string().nullable().optional(),
});

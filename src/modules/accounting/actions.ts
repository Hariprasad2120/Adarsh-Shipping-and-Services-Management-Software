"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import * as accService from "./service";
import * as accReports from "./reports";
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { Prisma } from "@/generated/prisma/client";

type ActionResponse = { ok: true; data?: any } | { ok: false; error: string };

// ─── Account Actions ─────────────────────────────────────────────────────────

export async function createAccountAction(data: any): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.account.create");

    const account = await accService.createAccount(orgId, session.user.id, data);
    revalidatePath("/accounting/accounts");
    return { ok: true, data: account };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create account" };
  }
}

export async function updateAccountAction(id: string, data: any): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.account.update");

    const account = await accService.updateAccount(orgId, id, session.user.id, data);
    revalidatePath("/accounting/accounts");
    return { ok: true, data: account };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update account" };
  }
}

// ─── Journal Entry Actions ────────────────────────────────────────────────────

export async function createJournalEntryAction(data: any): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.journal.create");

    const journal = await accService.createJournalEntry(orgId, session.user.id, data);
    revalidatePath("/accounting/journal-entries");
    return { ok: true, data: journal };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create journal entry" };
  }
}

export async function submitJournalEntryAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.journal.submit");

    const journal = await accService.submitJournalEntry(orgId, id, session.user.id);
    revalidatePath("/accounting/journal-entries");
    revalidatePath(`/accounting/journal-entries/${id}`);
    return { ok: true, data: journal };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to submit journal entry" };
  }
}

export async function cancelJournalEntryAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.journal.cancel");

    const journal = await accService.cancelJournalEntry(orgId, id, session.user.id);
    revalidatePath("/accounting/journal-entries");
    revalidatePath(`/accounting/journal-entries/${id}`);
    return { ok: true, data: journal };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to cancel journal entry" };
  }
}

// ─── Sales Invoice Actions ───────────────────────────────────────────────────

export async function createSalesInvoiceAction(data: any): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.invoice.create");

    const invoice = await accService.createSalesInvoice(orgId, session.user.id, data);
    revalidatePath("/accounting/sales-invoices");
    return { ok: true, data: invoice };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create sales invoice" };
  }
}

export async function submitSalesInvoiceAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.invoice.submit");

    const invoice = await accService.submitSalesInvoice(orgId, id, session.user.id);
    revalidatePath("/accounting/sales-invoices");
    revalidatePath(`/accounting/sales-invoices/${id}`);
    return { ok: true, data: invoice };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to submit sales invoice" };
  }
}

export async function cancelSalesInvoiceAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.invoice.cancel");

    const invoice = await accService.cancelSalesInvoice(orgId, id, session.user.id);
    revalidatePath("/accounting/sales-invoices");
    revalidatePath(`/accounting/sales-invoices/${id}`);
    return { ok: true, data: invoice };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to cancel sales invoice" };
  }
}

// ─── Purchase Invoice Actions ─────────────────────────────────────────────────

export async function createPurchaseInvoiceAction(data: any): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.invoice.create");

    const invoice = await accService.createPurchaseInvoice(orgId, session.user.id, data);
    revalidatePath("/accounting/purchase-invoices");
    return { ok: true, data: invoice };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create purchase invoice" };
  }
}

export async function submitPurchaseInvoiceAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.invoice.submit");

    const invoice = await accService.submitPurchaseInvoice(orgId, id, session.user.id);
    revalidatePath("/accounting/purchase-invoices");
    revalidatePath(`/accounting/purchase-invoices/${id}`);
    return { ok: true, data: invoice };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to submit purchase invoice" };
  }
}

export async function cancelPurchaseInvoiceAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.invoice.cancel");

    const invoice = await accService.cancelPurchaseInvoice(orgId, id, session.user.id);
    revalidatePath("/accounting/purchase-invoices");
    revalidatePath(`/accounting/purchase-invoices/${id}`);
    return { ok: true, data: invoice };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to cancel purchase invoice" };
  }
}

// ─── Payment Actions ─────────────────────────────────────────────────────────

export async function createPaymentEntryAction(data: any): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.payment.create");

    const payment = await accService.createPaymentEntry(orgId, session.user.id, data);
    revalidatePath("/accounting/payment-entries");
    return { ok: true, data: payment };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create payment entry" };
  }
}

export async function submitPaymentEntryAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.payment.submit");

    const payment = await accService.submitPaymentEntry(orgId, id, session.user.id);
    revalidatePath("/accounting/payment-entries");
    revalidatePath(`/accounting/payment-entries/${id}`);
    return { ok: true, data: payment };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to submit payment entry" };
  }
}

export async function cancelPaymentEntryAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.payment.submit"); // cancel pays maps to submit/edit permission

    const payment = await accService.cancelPaymentEntry(orgId, id, session.user.id);
    revalidatePath("/accounting/payment-entries");
    revalidatePath(`/accounting/payment-entries/${id}`);
    return { ok: true, data: payment };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to cancel payment entry" };
  }
}

// ─── Settings Actions ────────────────────────────────────────────────────────

export async function updateAccountingSettingsAction(data: any): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.settings.manage");

    const settings = await accService.updateAccountingSettings(orgId, session.user.id, data);
    revalidatePath("/accounting/settings");
    return { ok: true, data: settings };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update settings" };
  }
}

export async function initializeCOAAction(): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.settings.manage");

    await accService.seedChartOfAccounts(orgId);
    revalidatePath("/accounting/accounts");
    revalidatePath("/accounting/settings");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to initialize Chart of Accounts" };
  }
}

// ─── CRM Integration ──────────────────────────────────────────────────────────

export async function generateInvoiceFromDealAction(dealId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    // CRM users who have permissions to manage invoices can generate this
    await requirePermission(session.user.id, "crm.invoice.manage");

    // Fetch the deal
    const deal = await db.crmDeal.findFirst({
      where: { id: dealId, orgId },
      include: {
        owner: true,
      },
    });

    if (!deal) return { ok: false, error: "Deal not found" };
    if (deal.stage !== "WON") return { ok: false, error: "Only WON deals can generate sales invoices" };
    if (!deal.accountId) return { ok: false, error: "Deal must have an Account linked to generate an invoice" };

    // Verify if an invoice is already generated for this deal
    const existingInvoice = await db.salesInvoice.findFirst({
      where: { orgId, crmDealId: dealId },
    });
    if (existingInvoice) return { ok: false, error: "An invoice has already been generated for this deal" };

    const settings = await db.accountingSettings.findUnique({ where: { orgId } });
    if (!settings?.defaultReceivableAccountId || !settings?.defaultSalesAccountId) {
      return { ok: false, error: "Receivables or Sales accounts are not configured. Go to Accounting Settings first." };
    }

    const sysDate = await getNow();

    const invoiceData = {
      customerId: deal.accountId,
      crmDealId: deal.id,
      postingDate: sysDate,
      dueDate: new Date(sysDate.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days due
      branchId: deal.owner?.branchId || null,
      discountAmount: 0,
      taxRate: 18, // default 18% tax rate
      remarks: `Generated from CRM Won Deal: ${deal.name}`,
      items: [
        {
          itemName: `Logistics Service: ${deal.serviceType || "Freight Forwarding"} - ${deal.name}`,
          qty: 1,
          rate: deal.amount,
        },
      ],
    };

    const invoice = await accService.createSalesInvoice(orgId, session.user.id, invoiceData);

    revalidatePath(`/crm/deals/${dealId}`);
    revalidatePath("/crm/deals");
    return { ok: true, data: invoice };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to generate sales invoice" };
  }
}

// ─── Payroll Actions ──────────────────────────────────────────────────────────

export async function getPayrollBatchesAction(): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.journal.read");

    const batches = await accService.getPayrollBatches(orgId);
    return { ok: true, data: batches };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch payroll batches" };
  }
}

export async function compilePayrollBatchAction(monthDate: Date): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.journal.create");

    const compilation = await accService.compilePayrollBatch(orgId, monthDate);
    return { ok: true, data: compilation };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to compile payroll details" };
  }
}

export async function createPayrollBatchAction(monthDate: Date): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.journal.create");

    const batch = await accService.createPayrollBatch(orgId, session.user.id, monthDate);
    revalidatePath("/hrms/payroll");
    return { ok: true, data: batch };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create payroll batch" };
  }
}

export async function finalizePayrollBatchAction(batchId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.journal.submit");

    const batch = await accService.finalizePayrollBatch(orgId, batchId, session.user.id);
    revalidatePath("/hrms/payroll");
    revalidatePath("/accounting/journal-entries");
    return { ok: true, data: batch };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to finalize payroll batch" };
  }
}

export async function payPayrollBatchAction(batchId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.journal.submit");

    const batch = await accService.payPayrollBatch(orgId, batchId, session.user.id);
    revalidatePath("/hrms/payroll");
    revalidatePath("/accounting/journal-entries");
    return { ok: true, data: batch };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to pay payroll batch" };
  }
}

// ─── Asset Actions ────────────────────────────────────────────────────────────

export async function listAssetsAction(): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.journal.read");

    const assets = await accService.listAssets(orgId);
    return { ok: true, data: assets };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to list assets" };
  }
}

export async function getAssetAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.journal.read");

    const asset = await accService.getAsset(orgId, id);
    return { ok: true, data: asset };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to get asset" };
  }
}

export async function createAssetAction(data: any): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.journal.create");

    const asset = await accService.createAsset(orgId, session.user.id, data);
    revalidatePath("/ams/assets");
    return { ok: true, data: asset };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create asset" };
  }
}

export async function runDepreciationAction(assetId: string, monthDate: Date): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.journal.submit");

    const entry = await accService.runDepreciationForAsset(orgId, assetId, monthDate, session.user.id);
    revalidatePath("/ams/assets");
    revalidatePath(`/ams/assets/${assetId}`);
    revalidatePath("/accounting/journal-entries");
    return { ok: true, data: entry };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to run asset depreciation" };
  }
}

// ─── Quotation Actions ────────────────────────────────────────────────────────
export async function listQuotationsAction(): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const data = await accService.listQuotations(orgId);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to list quotations" };
  }
}

export async function getQuotationAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const data = await accService.getQuotation(orgId, id);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to get quotation" };
  }
}

export async function createQuotationAction(data: any): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const quotation = await accService.createQuotation(orgId, session.user.id, data);
    revalidatePath("/accounting/quotations");
    return { ok: true, data: quotation };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create quotation" };
  }
}

export async function convertQuotationToInvoiceAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const invoice = await accService.convertQuotationToInvoice(orgId, id, session.user.id);
    revalidatePath("/accounting/quotations");
    revalidatePath("/accounting/sales-invoices");
    return { ok: true, data: invoice };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to convert quotation" };
  }
}

// ─── Customer Note Actions ───────────────────────────────────────────────────
export async function listCustomerNotesAction(): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const data = await accService.listCustomerNotes(orgId);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to list customer notes" };
  }
}

export async function getCustomerNoteAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const data = await accService.getCustomerNote(orgId, id);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to get customer note" };
  }
}

export async function createCustomerNoteAction(data: any): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const note = await accService.createCustomerNote(orgId, session.user.id, data);
    revalidatePath("/accounting/quotations");
    return { ok: true, data: note };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create customer note" };
  }
}

export async function submitCustomerNoteAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const note = await accService.submitCustomerNote(orgId, id, session.user.id);
    revalidatePath("/accounting/quotations");
    return { ok: true, data: note };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to submit customer note" };
  }
}

// ─── Period Lock Actions ─────────────────────────────────────────────────────
export async function getTransactionLockAction(): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const data = await accService.getTransactionLock(orgId);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to get period lock" };
  }
}

export async function updateTransactionLockAction(data: any): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const lock = await accService.updateTransactionLock(orgId, data);
    revalidatePath("/accounting");
    return { ok: true, data: lock };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update period lock" };
  }
}

// ─── Cargo Job Actions ───────────────────────────────────────────────────────
export async function listJobCostingsAction(): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const data = await accService.listJobCostings(orgId);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to list jobs" };
  }
}

export async function getJobCostingAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const data = await accService.getJobCosting(orgId, id);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to get job costing details" };
  }
}

export async function createJobCostingAction(data: any): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const job = await accService.createJobCosting(orgId, data);
    revalidatePath("/accounting/jobs");
    return { ok: true, data: job };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create job" };
  }
}

export async function updateJobCostingAction(id: string, data: any): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const job = await accService.updateJobCosting(orgId, id, data);
    revalidatePath("/accounting/jobs");
    revalidatePath(`/accounting/jobs/${id}`);
    return { ok: true, data: job };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to update job" };
  }
}

// ─── Reporting Actions ───────────────────────────────────────────────────────
export async function getARAgeingAction(asOfDate?: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const parsedDate = asOfDate ? new Date(asOfDate) : new Date();
    const data = await accReports.getARAgeing(orgId, parsedDate);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch AR Ageing" };
  }
}

export async function getAPAgeingAction(asOfDate?: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const parsedDate = asOfDate ? new Date(asOfDate) : new Date();
    const data = await accReports.getAPAgeing(orgId, parsedDate);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch AP Ageing" };
  }
}

export async function getSalesRegisterAction(filters: any = {}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const parsed = {
      fromDate: filters.fromDate ? new Date(filters.fromDate) : undefined,
      toDate: filters.toDate ? new Date(filters.toDate) : undefined,
    };
    const data = await accReports.getSalesRegister(orgId, parsed);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch Sales Register" };
  }
}

export async function getPurchaseRegisterAction(filters: any = {}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const parsed = {
      fromDate: filters.fromDate ? new Date(filters.fromDate) : undefined,
      toDate: filters.toDate ? new Date(filters.toDate) : undefined,
    };
    const data = await accReports.getPurchaseRegister(orgId, parsed);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch Purchase Register" };
  }
}

export async function getGSTR1SummaryAction(filters: any = {}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const parsed = {
      fromDate: filters.fromDate ? new Date(filters.fromDate) : undefined,
      toDate: filters.toDate ? new Date(filters.toDate) : undefined,
    };
    const data = await accReports.getGSTR1Summary(orgId, parsed);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch GSTR-1 Summary" };
  }
}

export async function getGSTR2BSummaryAction(filters: any = {}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const parsed = {
      fromDate: filters.fromDate ? new Date(filters.fromDate) : undefined,
      toDate: filters.toDate ? new Date(filters.toDate) : undefined,
    };
    const data = await accReports.getGSTR2BSummary(orgId, parsed);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch GSTR-2B Summary" };
  }
}

export async function getConsolidatedGSTLedgerAction(filters: any = {}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const parsed = {
      fromDate: filters.fromDate ? new Date(filters.fromDate) : undefined,
      toDate: filters.toDate ? new Date(filters.toDate) : undefined,
    };
    const data = await accReports.getConsolidatedGSTLedger(orgId, parsed);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch Consolidated GST Ledger" };
  }
}

export async function getDayBookAction(dateStr: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const parsedDate = new Date(dateStr);
    const data = await accReports.getDayBook(orgId, parsedDate);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch Day Book" };
  }
}

export async function getJournalRegisterAction(filters: any = {}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const parsed = {
      fromDate: filters.fromDate ? new Date(filters.fromDate) : undefined,
      toDate: filters.toDate ? new Date(filters.toDate) : undefined,
    };
    const data = await accReports.getJournalRegister(orgId, parsed);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch Journal Register" };
  }
}

export async function getJobProfitabilityAction(): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const data = await accReports.getJobProfitability(orgId);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch Job Profitability Report" };
  }
}

export async function getCashAndBankLedgerAction(filters: any = {}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const parsed = {
      fromDate: filters.fromDate ? new Date(filters.fromDate) : undefined,
      toDate: filters.toDate ? new Date(filters.toDate) : undefined,
    };
    const data = await accReports.getCashAndBankLedger(orgId, parsed);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch Cash and Bank Ledger" };
  }
}

export async function recordBankTransferAction(data: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  postingDate: string;
  remarks: string;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };

    await requirePermission(session.user.id, "accounting.journal.create");

    // Validate period lock
    await accService.validatePostingDateNotLocked(orgId, data.postingDate);

    // Create a Journal Entry for the transfer
    const jv = await db.$transaction(async (tx) => {
      const count = await tx.journalEntry.count({ where: { orgId } });
      const voucherNo = `BT-${1001 + count}`;
      const postingDate = new Date(data.postingDate);

      const entry = await tx.journalEntry.create({
        data: {
          orgId,
          voucherNo,
          postingDate,
          remarks: data.remarks || "Bank Transfer",
          status: "SUBMITTED",
          totalDebit: new Prisma.Decimal(data.amount),
          totalCredit: new Prisma.Decimal(data.amount),
          createdById: session.user.id,
          lines: {
            create: [
              {
                accountId: data.toAccountId,
                debit: new Prisma.Decimal(data.amount),
                credit: new Prisma.Decimal(0),
                remarks: data.remarks || "Transfer In",
              },
              {
                accountId: data.fromAccountId,
                debit: new Prisma.Decimal(0),
                credit: new Prisma.Decimal(data.amount),
                remarks: data.remarks || "Transfer Out",
              }
            ]
          }
        }
      });

      const glLines = [
        {
          accountId: data.toAccountId,
          debit: data.amount,
          credit: 0,
          remarks: data.remarks || "Transfer In",
        },
        {
          accountId: data.fromAccountId,
          debit: 0,
          credit: data.amount,
          remarks: data.remarks || "Transfer Out",
        }
      ];

      await accService.postGLTransactions(tx, orgId, "JOURNAL_ENTRY", entry.id, postingDate, glLines, null, session.user.id);
      return entry;
    });

    revalidatePath("/accounting/banking");
    return { ok: true, data: jv };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to record bank transfer" };
  }
}

export async function getProfitAndLossAction(filters: any = {}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const parsed = {
      fromDate: filters.fromDate ? new Date(filters.fromDate) : null,
      toDate: filters.toDate ? new Date(filters.toDate) : null,
    };
    const data = await accReports.getProfitAndLoss(orgId, parsed);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch Profit and Loss" };
  }
}

export async function getBalanceSheetAction(filters: any = {}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const parsed = {
      toDate: filters.toDate ? new Date(filters.toDate) : null,
    };
    const data = await accReports.getBalanceSheet(orgId, parsed);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch Balance Sheet" };
  }
}

export async function getTrialBalanceAction(filters: any = {}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    const parsed = {
      fromDate: filters.fromDate ? new Date(filters.fromDate) : null,
      toDate: filters.toDate ? new Date(filters.toDate) : null,
      includeZero: !!filters.includeZero,
    };
    const data = await accReports.getTrialBalance(orgId, parsed);
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch Trial Balance" };
  }
}




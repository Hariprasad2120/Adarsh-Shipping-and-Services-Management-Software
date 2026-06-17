"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import * as accService from "./service";
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";

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

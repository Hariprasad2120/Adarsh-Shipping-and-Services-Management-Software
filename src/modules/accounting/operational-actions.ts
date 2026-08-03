"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

import {
  approveAndPostAccountingDocument,
  approveAndPostAccountingPayment,
  cancelCanonicalDocumentByLegacyRecord,
  rejectAccountingDocument,
  rejectAccountingPayment,
  reverseCanonicalPaymentByLegacyRecord,
} from "./document-adapters";
import { mapAccountingError } from "./operational-helpers";
import {
  moveAccountingOutboxToManualReview,
  retryAccountingOutbox,
} from "./outbox-operations";
import { rejectJournalEntry, submitJournalEntry } from "./service";

type OperationalActionResult =
  | { ok: true; data?: { id: string; status?: string } }
  | { ok: false; code: string; error: string };

async function actionContext() {
  const session = await auth();
  if (!session?.user?.orgId) throw new Error("Unauthorized");
  return {
    orgId: session.user.orgId,
    userId: session.user.id,
  };
}

function failure(error: unknown): OperationalActionResult {
  const mapped = mapAccountingError(error);
  return { ok: false, code: mapped.code, error: mapped.message };
}

function revalidateAccountingRecord(id?: string) {
  revalidatePath("/accounting");
  revalidatePath("/accounting/approvals");
  revalidatePath("/accounting/sales-invoices");
  revalidatePath("/accounting/purchase-invoices");
  revalidatePath("/accounting/customer-receipts");
  revalidatePath("/accounting/vendor-payments");
  revalidatePath("/accounting/payments");
  revalidatePath("/accounting/allocations");
  revalidatePath("/accounting/journal-entries");
  revalidatePath("/accounting/general-ledger");
  if (id) revalidatePath(`/accounting/documents/${id}`);
}

export async function approveOperationalDocumentAction(
  documentId: string,
  expectedVersion: number,
): Promise<OperationalActionResult> {
  try {
    const { orgId, userId } = await actionContext();
    await requirePermission(userId, "accounting.document.approve");
    await requirePermission(userId, "accounting.post");
    const result = await approveAndPostAccountingDocument({
      orgId,
      documentId,
      approverId: userId,
      expectedVersion,
    });
    revalidateAccountingRecord(documentId);
    return { ok: true, data: { id: result.journalEntryId, status: "POSTED" } };
  } catch (error) {
    return failure(error);
  }
}

export async function rejectOperationalDocumentAction(
  documentId: string,
  expectedVersion: number,
  reason: string,
): Promise<OperationalActionResult> {
  try {
    const { orgId, userId } = await actionContext();
    await requirePermission(userId, "accounting.document.approve");
    const result = await rejectAccountingDocument({
      orgId,
      documentId,
      approverId: userId,
      expectedVersion,
      reason,
    });
    revalidateAccountingRecord(documentId);
    return { ok: true, data: { id: result.id, status: result.status } };
  } catch (error) {
    return failure(error);
  }
}

export async function approveOperationalPaymentAction(
  paymentId: string,
  expectedVersion: number,
): Promise<OperationalActionResult> {
  try {
    const { orgId, userId } = await actionContext();
    await requirePermission(userId, "accounting.payment.approve");
    await requirePermission(userId, "accounting.payment.post");
    const result = await approveAndPostAccountingPayment({
      orgId,
      paymentId,
      approverId: userId,
      expectedVersion,
    });
    revalidateAccountingRecord();
    revalidatePath(`/accounting/payments/${paymentId}`);
    return { ok: true, data: { id: result.journalEntryId, status: "POSTED" } };
  } catch (error) {
    return failure(error);
  }
}

export async function rejectOperationalPaymentAction(
  paymentId: string,
  expectedVersion: number,
  reason: string,
): Promise<OperationalActionResult> {
  try {
    const { orgId, userId } = await actionContext();
    await requirePermission(userId, "accounting.payment.approve");
    const result = await rejectAccountingPayment({
      orgId,
      paymentId,
      approverId: userId,
      expectedVersion,
      reason,
    });
    revalidateAccountingRecord();
    revalidatePath(`/accounting/payments/${paymentId}`);
    return { ok: true, data: { id: result.id, status: result.status } };
  } catch (error) {
    return failure(error);
  }
}

export async function approveOperationalJournalAction(
  journalId: string,
  expectedVersion: number,
): Promise<OperationalActionResult> {
  try {
    const { orgId, userId } = await actionContext();
    await requirePermission(userId, "accounting.journal.approve");
    await requirePermission(userId, "accounting.post");
    const result = await submitJournalEntry(
      orgId,
      journalId,
      userId,
      expectedVersion,
    );
    revalidateAccountingRecord();
    revalidatePath(`/accounting/journal-entries/${journalId}`);
    revalidatePath(`/accounting/journal-entries/${result.id}`);
    return { ok: true, data: { id: result.id, status: result.status } };
  } catch (error) {
    return failure(error);
  }
}

export async function rejectOperationalJournalAction(
  journalId: string,
  expectedVersion: number,
  reason: string,
): Promise<OperationalActionResult> {
  try {
    const { orgId, userId } = await actionContext();
    await requirePermission(userId, "accounting.journal.approve");
    const result = await rejectJournalEntry(
      orgId,
      journalId,
      userId,
      reason,
      expectedVersion,
    );
    revalidateAccountingRecord();
    revalidatePath(`/accounting/journal-entries/${journalId}`);
    return { ok: true, data: { id: result.id, status: result.status } };
  } catch (error) {
    return failure(error);
  }
}

export async function reverseOperationalDocumentAction(
  documentId: string,
  expectedVersion: number,
  reason: string,
): Promise<OperationalActionResult> {
  try {
    const { orgId, userId } = await actionContext();
    if (reason.trim().length < 8) {
      throw new Error("A reason of at least 8 characters is required");
    }
    const document = await db.accountingDocument.findFirst({
      where: {
        id: documentId,
        orgId,
        status: "POSTED",
        rowVersion: expectedVersion,
      },
      select: {
        legacyRecordType: true,
        legacyRecordId: true,
      },
    });
    if (
      !document?.legacyRecordId ||
      !["SalesInvoice", "PurchaseInvoice", "CustomerNote", "VendorNote"].includes(
        document.legacyRecordType ?? "",
      )
    ) {
      throw new Error("POLICY_GATED: this document has no approved reversal adapter");
    }
    const result = await cancelCanonicalDocumentByLegacyRecord({
      orgId,
      legacyRecordType: document.legacyRecordType as
        | "SalesInvoice"
        | "PurchaseInvoice"
        | "CustomerNote"
        | "VendorNote",
      legacyRecordId: document.legacyRecordId,
      actorId: userId,
      reason,
      expectedVersion,
    });
    revalidateAccountingRecord(documentId);
    return { ok: true, data: { id: result.journalEntryId, status: "REVERSED" } };
  } catch (error) {
    return failure(error);
  }
}

export async function reverseOperationalPaymentAction(
  paymentId: string,
  expectedVersion: number,
  reason: string,
): Promise<OperationalActionResult> {
  try {
    const { orgId, userId } = await actionContext();
    if (reason.trim().length < 8) {
      throw new Error("A reason of at least 8 characters is required");
    }
    const payment = await db.accountingPayment.findFirst({
      where: {
        id: paymentId,
        orgId,
        status: "POSTED",
        rowVersion: expectedVersion,
      },
      select: { legacyPaymentEntryId: true },
    });
    if (!payment?.legacyPaymentEntryId) {
      throw new Error("POLICY_GATED: this payment has no approved reversal adapter");
    }
    const result = await reverseCanonicalPaymentByLegacyRecord({
      orgId,
      legacyPaymentEntryId: payment.legacyPaymentEntryId,
      actorId: userId,
      reason,
      expectedVersion,
    });
    revalidateAccountingRecord();
    revalidatePath(`/accounting/payments/${paymentId}`);
    return { ok: true, data: { id: result.journalEntryId, status: "REVERSED" } };
  } catch (error) {
    return failure(error);
  }
}

export async function retryOperationalOutboxAction(
  outboxId: string,
  expectedVersion: number,
  reasonCode: string,
): Promise<OperationalActionResult> {
  try {
    const { orgId, userId } = await actionContext();
    const result = await retryAccountingOutbox({
      orgId,
      outboxId,
      actorId: userId,
      expectedVersion,
      reasonCode,
    });
    revalidatePath("/accounting/outbox");
    revalidatePath("/accounting/manual-review");
    return { ok: true, data: { id: result.id, status: result.status } };
  } catch (error) {
    return failure(error);
  }
}

export async function moveOperationalOutboxToReviewAction(
  outboxId: string,
  expectedVersion: number,
  reasonCode: string,
): Promise<OperationalActionResult> {
  try {
    const { orgId, userId } = await actionContext();
    const result = await moveAccountingOutboxToManualReview({
      orgId,
      outboxId,
      actorId: userId,
      expectedVersion,
      reasonCode,
    });
    revalidatePath("/accounting/outbox");
    revalidatePath("/accounting/manual-review");
    return { ok: true, data: { id: result.id, status: result.status } };
  } catch (error) {
    return failure(error);
  }
}

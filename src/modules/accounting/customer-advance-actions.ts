"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  cancelCustomerAdvanceRequest,
  createCustomerAdvanceReceiptDraft,
  createCustomerAdvanceRequest,
} from "@/modules/accounting/customer-advances";

type ActionResult =
  | { ok: true; data: { id: string } }
  | { ok: false; error: string };

async function actionContext() {
  const session = await auth();
  if (!session?.user?.orgId) throw new Error("Unauthorized");
  return {
    orgId: session.user.orgId,
    userId: session.user.id,
  };
}

function failure(error: unknown): ActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Unexpected accounting error",
  };
}

function revalidateAdvancePaths() {
  revalidatePath("/accounting/customer-advances");
  revalidatePath("/accounting/customer-receipts");
  revalidatePath("/accounting/sales-receipts");
  revalidatePath("/accounting/payment-entries");
  revalidatePath("/accounting/payments");
}

export async function createCustomerAdvanceRequestAction(input: {
  requestType: "CUSTOMER_ADVANCE" | "RETAINER_INVOICE";
  customerId: string;
  branchId?: string | null;
  postingDate: string | Date;
  dueDate?: string | Date | null;
  requestedAmount: string;
  currencyCode?: string | null;
  referenceNo?: string | null;
  remarks?: string | null;
}): Promise<ActionResult> {
  try {
    const { orgId, userId } = await actionContext();
    await requirePermission(userId, "accounting.payment.create");
    const request = await createCustomerAdvanceRequest(orgId, userId, input);
    revalidateAdvancePaths();
    return { ok: true, data: { id: request.id } };
  } catch (error) {
    return failure(error);
  }
}

export async function createCustomerAdvanceReceiptDraftAction(input: {
  advanceId: string;
  amount?: string | null;
  postingDate?: string | Date | null;
  paidToAccountId?: string | null;
  referenceNo?: string | null;
  remarks?: string | null;
}): Promise<ActionResult> {
  try {
    const { orgId, userId } = await actionContext();
    await requirePermission(userId, "accounting.payment.create");
    const payment = await createCustomerAdvanceReceiptDraft(orgId, userId, input);
    revalidateAdvancePaths();
    revalidatePath(`/accounting/payment-entries/${payment.id}`);
    return { ok: true, data: { id: payment.id } };
  } catch (error) {
    return failure(error);
  }
}

export async function cancelCustomerAdvanceRequestAction(
  advanceId: string,
): Promise<ActionResult> {
  try {
    const { orgId, userId } = await actionContext();
    await requirePermission(userId, "accounting.payment.create");
    const request = await cancelCustomerAdvanceRequest(orgId, advanceId);
    revalidateAdvancePaths();
    return { ok: true, data: { id: request.id } };
  } catch (error) {
    return failure(error);
  }
}

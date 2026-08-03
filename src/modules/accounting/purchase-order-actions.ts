"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { convertPurchaseOrderToPurchaseInvoiceDraft } from "@/modules/accounting/purchase-orders";

type ActionResponse =
  | { ok: true; data: { id: string } }
  | { ok: false; error: string };

export async function convertPurchaseOrderToPurchaseInvoiceAction(
  purchaseOrderId: string,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.orgId) return { ok: false, error: "Unauthorized" };

    await requirePermission(session.user.id, "crm.invoice.manage");
    await requirePermission(session.user.id, "accounting.purchase-invoice.prepare");

    const invoice = await convertPurchaseOrderToPurchaseInvoiceDraft({
      orgId: session.user.orgId,
      actorId: session.user.id,
      purchaseOrderId,
    });
    revalidatePath("/accounting/purchase-orders");
    revalidatePath(`/accounting/purchase-orders/${purchaseOrderId}`);
    revalidatePath("/accounting/purchase-invoices");
    return { ok: true, data: { id: invoice.id } };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to convert purchase order",
    };
  }
}

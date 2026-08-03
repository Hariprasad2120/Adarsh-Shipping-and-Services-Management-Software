"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  cancelRecurringSalesInvoiceProfile,
  createRecurringSalesInvoiceProfile,
  generateDueRecurringSalesInvoices,
  generateRecurringSalesInvoiceOccurrence,
  pauseRecurringSalesInvoiceProfile,
  resumeRecurringSalesInvoiceProfile,
  skipRecurringSalesInvoiceOccurrence,
} from "./recurring-sales-invoices";

type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

async function getRecurringActor() {
  const session = await auth();
  if (!session?.user?.orgId) {
    throw new Error("Unauthorized");
  }
  return { orgId: session.user.orgId, userId: session.user.id };
}

function refreshRecurringPaths() {
  revalidatePath("/accounting/recurring");
  revalidatePath("/accounting/sales-invoices");
}

export async function createRecurringSalesInvoiceProfileAction(input: {
  profileName: string;
  branchId?: string | null;
  customerId: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  timezone?: string | null;
  startDate: string;
  endDate?: string | null;
  nextInvoiceDate?: string | null;
  currencyCode?: string | null;
  autoSend?: boolean;
  approvalRequired?: boolean;
  autoChargeTokenRef?: string | null;
  paymentTermName?: string | null;
  subject?: string | null;
  remarks?: string | null;
  lines: Array<{
    itemName: string;
    description?: string | null;
    qty: string;
    rate: string;
    taxRate: string;
    unit?: string | null;
  }>;
}): Promise<ActionResult> {
  try {
    const { orgId, userId } = await getRecurringActor();
    await requirePermission(userId, "accounting.recurring-template.admin");
    const profile = await createRecurringSalesInvoiceProfile({
      orgId,
      actorId: userId,
      ...input,
    });
    refreshRecurringPaths();
    return { ok: true, data: profile };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create recurring invoice profile" };
  }
}

export async function generateRecurringSalesInvoiceOccurrenceAction(
  profileId: string,
): Promise<ActionResult> {
  try {
    const { orgId, userId } = await getRecurringActor();
    await requirePermission(userId, "accounting.recurring-occurrence.process");
    const invoice = await generateRecurringSalesInvoiceOccurrence({
      orgId,
      actorId: userId,
      profileId,
    });
    refreshRecurringPaths();
    return { ok: true, data: invoice };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to generate recurring invoice" };
  }
}

export async function generateDueRecurringSalesInvoicesAction(): Promise<ActionResult> {
  try {
    const { orgId, userId } = await getRecurringActor();
    await requirePermission(userId, "accounting.recurring-occurrence.process");
    const result = await generateDueRecurringSalesInvoices({
      orgId,
      actorId: userId,
    });
    refreshRecurringPaths();
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to process due recurring invoices" };
  }
}

export async function pauseRecurringSalesInvoiceProfileAction(
  profileId: string,
): Promise<ActionResult> {
  try {
    const { orgId, userId } = await getRecurringActor();
    await requirePermission(userId, "accounting.recurring-template.admin");
    const result = await pauseRecurringSalesInvoiceProfile({
      orgId,
      actorId: userId,
      profileId,
    });
    refreshRecurringPaths();
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to pause recurring profile" };
  }
}

export async function resumeRecurringSalesInvoiceProfileAction(
  profileId: string,
): Promise<ActionResult> {
  try {
    const { orgId, userId } = await getRecurringActor();
    await requirePermission(userId, "accounting.recurring-template.admin");
    const result = await resumeRecurringSalesInvoiceProfile({
      orgId,
      actorId: userId,
      profileId,
    });
    refreshRecurringPaths();
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to resume recurring profile" };
  }
}

export async function skipRecurringSalesInvoiceOccurrenceAction(
  profileId: string,
): Promise<ActionResult> {
  try {
    const { orgId, userId } = await getRecurringActor();
    await requirePermission(userId, "accounting.recurring-occurrence.process");
    await skipRecurringSalesInvoiceOccurrence({
      orgId,
      actorId: userId,
      profileId,
    });
    refreshRecurringPaths();
    return { ok: true, data: { profileId } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to skip recurring occurrence" };
  }
}

export async function cancelRecurringSalesInvoiceProfileAction(
  profileId: string,
): Promise<ActionResult> {
  try {
    const { orgId, userId } = await getRecurringActor();
    await requirePermission(userId, "accounting.recurring-template.admin");
    const result = await cancelRecurringSalesInvoiceProfile({
      orgId,
      actorId: userId,
      profileId,
    });
    refreshRecurringPaths();
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to cancel recurring profile" };
  }
}

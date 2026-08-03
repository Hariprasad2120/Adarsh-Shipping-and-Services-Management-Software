"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  cancelRecurringExpenseProfile,
  createRecurringExpenseProfile,
  generateDueRecurringExpenses,
  generateRecurringExpenseOccurrence,
  pauseRecurringExpenseProfile,
  resumeRecurringExpenseProfile,
  skipRecurringExpenseOccurrence,
} from "./recurring-expenses";

type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

async function getActor() {
  const session = await auth();
  if (!session?.user?.orgId) throw new Error("Unauthorized");
  return { orgId: session.user.orgId, userId: session.user.id };
}

function refreshPaths() {
  revalidatePath("/accounting/recurring");
  revalidatePath("/accounting/purchase-invoices");
}

export async function createRecurringExpenseProfileAction(input: {
  templateName: string;
  vendorId: string;
  expenseAccountId: string;
  amount: string;
  taxRate?: string | number | null;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  branchId?: string | null;
  startDate: string;
  endDate?: string | null;
  nextDueDate?: string | null;
  narration?: string | null;
  paymentMethod?: string | null;
  paymentTermName?: string | null;
}): Promise<ActionResult> {
  try {
    const { orgId, userId } = await getActor();
    await requirePermission(userId, "accounting.recurring-template.admin");
    const profile = await createRecurringExpenseProfile({
      orgId,
      actorId: userId,
      ...input,
    });
    refreshPaths();
    return { ok: true, data: profile };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create recurring bill profile" };
  }
}

export async function generateRecurringExpenseOccurrenceAction(
  profileId: string,
): Promise<ActionResult> {
  try {
    const { orgId, userId } = await getActor();
    await requirePermission(userId, "accounting.recurring-occurrence.process");
    const invoice = await generateRecurringExpenseOccurrence({
      orgId,
      actorId: userId,
      templateId: profileId,
    });
    refreshPaths();
    return { ok: true, data: invoice };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to generate recurring bill" };
  }
}

export async function generateDueRecurringExpensesAction(): Promise<ActionResult> {
  try {
    const { orgId, userId } = await getActor();
    await requirePermission(userId, "accounting.recurring-occurrence.process");
    const result = await generateDueRecurringExpenses({ orgId, actorId: userId });
    refreshPaths();
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to process due recurring bills" };
  }
}

export async function pauseRecurringExpenseProfileAction(profileId: string): Promise<ActionResult> {
  try {
    const { orgId, userId } = await getActor();
    await requirePermission(userId, "accounting.recurring-template.admin");
    const result = await pauseRecurringExpenseProfile({ orgId, profileId });
    refreshPaths();
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to pause recurring bill profile" };
  }
}

export async function resumeRecurringExpenseProfileAction(profileId: string): Promise<ActionResult> {
  try {
    const { orgId, userId } = await getActor();
    await requirePermission(userId, "accounting.recurring-template.admin");
    const result = await resumeRecurringExpenseProfile({ orgId, profileId });
    refreshPaths();
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to resume recurring bill profile" };
  }
}

export async function skipRecurringExpenseOccurrenceAction(profileId: string): Promise<ActionResult> {
  try {
    const { orgId, userId } = await getActor();
    await requirePermission(userId, "accounting.recurring-occurrence.process");
    await skipRecurringExpenseOccurrence({ orgId, profileId });
    refreshPaths();
    return { ok: true, data: { profileId } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to skip recurring bill occurrence" };
  }
}

export async function cancelRecurringExpenseProfileAction(profileId: string): Promise<ActionResult> {
  try {
    const { orgId, userId } = await getActor();
    await requirePermission(userId, "accounting.recurring-template.admin");
    const result = await cancelRecurringExpenseProfile({ orgId, profileId });
    refreshPaths();
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to cancel recurring bill profile" };
  }
}

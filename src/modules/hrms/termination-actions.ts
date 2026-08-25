"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  createTerminationPayrollRun,
  createTerminationDraft,
  updateTerminationDraft,
  finalizeTerminationDraft,
  discardTerminationDraft,
  type TerminationEntryInput,
  type TerminationDraftEntry,
} from "./termination-payroll";

type ActionResponse = { ok: true } | { ok: false; error: string };
type DataActionResponse<T> = { ok: true; data: T } | { ok: false; error: string };

export async function createTerminationPayrollRunAction(
  entries: TerminationEntryInput[],
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");
    await requirePermission(session.user.id, "accounting.integration.post");

    await createTerminationPayrollRun(orgId, session.user.id, entries);

    revalidatePath("/payroll/pay-runs");
    revalidatePath("/payroll");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to process settlement" };
  }
}

// Phase 34: pre-finalize draft actions backing the termination "Edit" screen
// (src/app/(dashboard)/payroll/pay-runs/[draftId]/edit/page.tsx).
export async function createTerminationDraftAction(
  employeeIds: string[],
): Promise<DataActionResponse<{ draftId: string }>> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const draft = await createTerminationDraft(orgId, session.user.id, employeeIds);
    revalidatePath("/payroll/pay-runs");
    return { ok: true, data: { draftId: draft.id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to start settlement draft" };
  }
}

export async function updateTerminationDraftAction(
  draftId: string,
  input: { payDate?: string; notes?: string; entries: TerminationDraftEntry[] },
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    await updateTerminationDraft(orgId, draftId, input);
    revalidatePath(`/payroll/pay-runs/${draftId}/edit`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save draft" };
  }
}

export async function finalizeTerminationDraftAction(draftId: string): Promise<ActionResponse> {
  let batchId: string | null = null;
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");
    await requirePermission(session.user.id, "accounting.integration.post");

    batchId = await finalizeTerminationDraft(orgId, session.user.id, draftId);
    revalidatePath("/payroll/pay-runs");
    revalidatePath("/payroll");
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to finalize settlement" };
  }
  redirect(batchId ? `/payroll/pay-runs/${batchId}` : "/payroll/pay-runs");
}

export async function discardTerminationDraftAction(draftId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    await discardTerminationDraft(orgId, draftId);
    revalidatePath("/payroll/pay-runs");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to discard draft" };
  }
}

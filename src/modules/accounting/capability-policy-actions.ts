"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  approveAccountingCapabilityPolicy,
  assertAccountingCapabilityCode,
  rejectAccountingCapabilityPolicy,
  revokeAccountingCapabilityPolicy,
  saveAccountingCapabilityPolicyDraft,
  submitAccountingCapabilityPolicyForApproval,
  supersedeAccountingCapabilityPolicy,
} from "./capability-policies";
import { mapAccountingError } from "./operational-helpers";

type ActionResponse = { ok: true; data?: unknown } | { ok: false; error: string };

function safeAccountingActionError(error: unknown) {
  return mapAccountingError(error).message;
}

export async function saveAccountingCapabilityPolicyDraftAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.capability-policy.manage");
    const result = await saveAccountingCapabilityPolicyDraft({
      policyId: String(formData.get("policyId") ?? "").trim() || undefined,
      orgId,
      actorId: session.user.id,
      expectedVersion:
        Number(String(formData.get("expectedVersion") ?? "").trim() || 0) ||
        undefined,
      capabilityCode: assertAccountingCapabilityCode(
        String(formData.get("capabilityCode") ?? "").trim(),
      ),
      legalEntityId: String(formData.get("legalEntityId") ?? "").trim() || null,
      effectiveFrom: String(formData.get("effectiveFrom") ?? "").trim(),
      effectiveTo: String(formData.get("effectiveTo") ?? "").trim() || null,
      configuration: String(formData.get("configurationJson") ?? ""),
      supersedesId: String(formData.get("supersedesId") ?? "").trim() || null,
    });
    revalidatePath("/accounting/capabilities");
    revalidatePath("/accounting/configuration");
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function submitAccountingCapabilityPolicyAction(
  policyId: string,
  expectedVersion: number,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.capability-policy.manage");
    const result = await submitAccountingCapabilityPolicyForApproval({
      orgId,
      actorId: session.user.id,
      policyId,
      expectedVersion,
    });
    revalidatePath("/accounting/capabilities");
    revalidatePath("/accounting/configuration");
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function approveAccountingCapabilityPolicyAction(
  policyId: string,
  expectedVersion: number,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.capability-policy.approve");
    const result = await approveAccountingCapabilityPolicy({
      orgId,
      actorId: session.user.id,
      policyId,
      expectedVersion,
    });
    revalidatePath("/accounting/capabilities");
    revalidatePath("/accounting/configuration");
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function rejectAccountingCapabilityPolicyAction(
  policyId: string,
  expectedVersion: number,
  reason: string,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.capability-policy.approve");
    const result = await rejectAccountingCapabilityPolicy({
      orgId,
      actorId: session.user.id,
      policyId,
      expectedVersion,
      reason,
    });
    revalidatePath("/accounting/capabilities");
    revalidatePath("/accounting/configuration");
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function revokeAccountingCapabilityPolicyAction(
  policyId: string,
  expectedVersion: number,
  reason: string,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.capability-policy.manage");
    const result = await revokeAccountingCapabilityPolicy({
      orgId,
      actorId: session.user.id,
      policyId,
      expectedVersion,
      reason,
    });
    revalidatePath("/accounting/capabilities");
    revalidatePath("/accounting/configuration");
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

export async function supersedeAccountingCapabilityPolicyAction(
  policyId: string,
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.capability-policy.manage");
    const result = await supersedeAccountingCapabilityPolicy({
      orgId,
      actorId: session.user.id,
      policyId,
    });
    revalidatePath("/accounting/capabilities");
    revalidatePath("/accounting/configuration");
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeAccountingActionError(error) };
  }
}

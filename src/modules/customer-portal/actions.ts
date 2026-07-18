"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  createInternalCustomerQuery,
  inviteCustomerPortalUser,
  resendCustomerPortalInvitation,
  suspendCustomerPortalUser,
} from "./service";

type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

async function getInternalActor() {
  const session = await auth();
  if (!session?.user?.orgId) {
    throw new Error("Unauthorized");
  }
  await requirePermission(session.user.id, "crm.account.manage");
  return { userId: session.user.id, orgId: session.user.orgId };
}

export async function inviteCustomerPortalUserAction(customerId: string, contactId: string): Promise<ActionResult> {
  try {
    const { userId, orgId } = await getInternalActor();
    const result = await inviteCustomerPortalUser({
      actorUserId: userId,
      orgId,
      customerId,
      contactId,
    });
    revalidatePath(`/crm/customers/${customerId}`);
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to invite portal user" };
  }
}

export async function resendCustomerPortalInvitationAction(portalUserId: string, customerId: string): Promise<ActionResult> {
  try {
    const { userId, orgId } = await getInternalActor();
    const result = await resendCustomerPortalInvitation({
      actorUserId: userId,
      orgId,
      portalUserId,
    });
    revalidatePath(`/crm/customers/${customerId}`);
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to resend invitation" };
  }
}

export async function suspendCustomerPortalUserAction(portalUserId: string, customerId: string, reason: string): Promise<ActionResult> {
  try {
    const { userId, orgId } = await getInternalActor();
    const result = await suspendCustomerPortalUser({
      actorUserId: userId,
      orgId,
      portalUserId,
      reason,
    });
    revalidatePath(`/crm/customers/${customerId}`);
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to suspend portal user" };
  }
}

export async function createCustomerPortalQueryAction(input: {
  customerId: string;
  jobId: string;
  title: string;
  description: string;
}): Promise<ActionResult> {
  try {
    const { userId, orgId } = await getInternalActor();
    const result = await createInternalCustomerQuery({
      actorUserId: userId,
      orgId,
      customerId: input.customerId,
      jobId: input.jobId,
      title: input.title,
      description: input.description,
    });
    revalidatePath(`/cha/jobs/${input.jobId}`);
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create query" };
  }
}

export async function getPortalFeatureFlagAction(flag: "CUSTOMER_PORTAL_SHIPMENT_UPLOADS"): Promise<ActionResult<boolean>> {
  try {
    const session = await auth();
    if (!session?.user?.orgId) throw new Error("Unauthorized");
    const { getPortalFeatureFlag } = await import("./feature-flags");
    const value = await getPortalFeatureFlag(session.user.orgId, flag);
    return { ok: true, data: value };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to read feature flag" };
  }
}

export async function setPortalFeatureFlagAction(flag: "CUSTOMER_PORTAL_SHIPMENT_UPLOADS", value: boolean): Promise<ActionResult<boolean>> {
  try {
    const session = await auth();
    if (!session?.user?.orgId) throw new Error("Unauthorized");
    await requirePermission(session.user.id, "cha.settings.manage");
    const { setPortalFeatureFlag } = await import("./feature-flags");
    await setPortalFeatureFlag(session.user.orgId, flag, value);
    revalidatePath("/cha/settings");
    return { ok: true, data: value };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to update feature flag" };
  }
}


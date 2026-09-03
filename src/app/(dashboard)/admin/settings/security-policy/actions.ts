"use server";

import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { logSecurityEvent } from "@/lib/session-service";
import { assertStepUp } from "@/lib/step-up";

/**
 * Organisation authentication policy (Stage 1 §27). An org admin may enable /
 * disable "require MFA" for the organisation, but cannot weaken it below the
 * platform minimum (platform admins are always MFA-mandatory regardless).
 * Sensitive change → step-up re-auth (password re-entry).
 */

async function requireOrgPolicyActor(password: string) {
  const session = await getSession();
  if (!session?.user?.id || !session.user.orgId) {
    throw new Error("Not authenticated.");
  }
  await requirePermission(session.user.id, "admin.settings.manage");

  const row = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  const ok = row?.passwordHash ? await compare(password, row.passwordHash) : false;
  if (!ok) throw new Error("Password is incorrect.");

  if (session.user.sessionNonce) {
    await db.userSession
      .update({
        where: { token: session.user.sessionNonce },
        data: { strongAuthAt: new Date() },
      })
      .catch(() => {});
  }
  assertStepUp("org.auth_policy.change", new Date());
  return { userId: session.user.id, orgId: session.user.orgId };
}

export async function getOrgSecurityPolicy() {
  const session = await getSession();
  if (!session?.user?.orgId) throw new Error("Not authenticated.");
  await requirePermission(session.user.id, "admin.settings.manage");
  const org = await db.organisation.findUnique({
    where: { id: session.user.orgId },
    select: { requireMfa: true },
  });
  return { requireMfa: org?.requireMfa ?? false };
}

export async function setOrgRequireMfa(password: string, enabled: boolean) {
  const { userId, orgId } = await requireOrgPolicyActor(password);
  await db.organisation.update({
    where: { id: orgId },
    data: { requireMfa: enabled },
  });
  await logSecurityEvent({
    event: "ORG_SECURITY_POLICY_CHANGED",
    outcome: "SUCCESS",
    userId,
    actorUserId: userId,
    reason: `requireMfa=${enabled}`,
  });
  return { requireMfa: enabled };
}

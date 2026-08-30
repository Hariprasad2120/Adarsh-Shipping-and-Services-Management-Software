"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logSecurityEvent } from "@/lib/session-service";
import { assertStepUp, type SensitiveAction } from "@/lib/step-up";
import { compare } from "bcryptjs";
import {
  beginEnrollment,
  confirmEnrollment,
  disableMfa,
  listFactors,
  regenerateRecoveryCodes,
} from "@/lib/mfa/service";

/**
 * Account Security Center server actions (MON-S1-002 / §5).
 *
 * Every sensitive change (disable MFA, regenerate recovery codes) requires a
 * fresh step-up: the caller re-enters their password, which we verify and then
 * stamp `strongAuthAt` on the current session so `assertStepUp` passes.
 */

async function currentActor() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Not authenticated.");
  return session.user;
}

async function requireStepUp(action: SensitiveAction, password: string) {
  const user = await currentActor();
  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  const ok = row?.passwordHash ? await compare(password, row.passwordHash) : false;
  if (!ok) {
    await logSecurityEvent({
      event: "MFA_FAILED",
      outcome: "FAILURE",
      userId: user.id,
      reason: `Step-up password check failed for ${action}`,
    });
    throw new Error("Password is incorrect.");
  }
  // Fresh strong auth — record it on the current session.
  if (user.sessionNonce) {
    await db.userSession
      .update({
        where: { token: user.sessionNonce },
        data: { strongAuthAt: new Date() },
      })
      .catch(() => {});
  }
  assertStepUp(action, new Date());
  return user;
}

export async function startMfaEnrollment(password: string) {
  const user = await requireStepUp("mfa.enroll", password);
  return beginEnrollment(user.id, user.email);
}

export async function confirmMfaEnrollment(otp: string) {
  const user = await currentActor();
  return confirmEnrollment(user.id, otp);
}

export async function disableMfaAction(password: string) {
  const user = await requireStepUp("mfa.disable", password);
  await disableMfa(user.id, { actorUserId: user.id });
  return { ok: true as const };
}

export async function regenerateRecoveryCodesAction(password: string) {
  const user = await requireStepUp("recovery.regenerate", password);
  const codes = await regenerateRecoveryCodes(user.id);
  return { recoveryCodes: codes };
}

export async function getSecurityOverview() {
  const user = await currentActor();
  const [factors, org] = await Promise.all([
    listFactors(user.id),
    user.orgId
      ? db.organisation.findUnique({
          where: { id: user.orgId },
          select: { requireMfa: true },
        })
      : Promise.resolve(null),
  ]);
  return {
    factors: factors.factors,
    recoveryCodesRemaining: factors.recoveryCodesRemaining,
    orgRequiresMfa: org?.requireMfa ?? false,
    platformAdminMfaMandatory: user.isPlatformAdmin === true,
  };
}

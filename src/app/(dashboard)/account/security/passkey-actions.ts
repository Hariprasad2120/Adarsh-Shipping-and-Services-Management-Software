"use server";

import { cookies } from "next/headers";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logSecurityEvent } from "@/lib/session-service";
import { assertStepUp } from "@/lib/step-up";
import {
  buildRegistrationOptions,
  verifyRegistration,
} from "@/lib/mfa/webauthn";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";

/**
 * Passkey (WebAuthn) registration + management for the Security Center
 * (Stage 1 §6). v1: one passkey per user, used as a second factor.
 *
 * The registration challenge is held in a short-lived HttpOnly cookie
 * (`pk_reg_challenge`) between `beginPasskeyRegistration` and
 * `finishPasskeyRegistration`.
 */

const CHALLENGE_COOKIE = "pk_reg_challenge";
const CHALLENGE_TTL_S = 300;

async function actor() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Not authenticated.");
  return session.user;
}

async function requireStepUp(password: string) {
  const user = await actor();
  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  const ok = row?.passwordHash ? await compare(password, row.passwordHash) : false;
  if (!ok) throw new Error("Password is incorrect.");
  if (user.sessionNonce) {
    await db.userSession
      .update({ where: { token: user.sessionNonce }, data: { strongAuthAt: new Date() } })
      .catch(() => {});
  }
  assertStepUp("factor.add", new Date());
  return user;
}

export async function hasPasskey(): Promise<boolean> {
  const user = await actor();
  return (
    (await db.authenticationFactor.count({
      where: { userId: user.id, type: "webauthn", status: "ACTIVE" },
    })) > 0
  );
}

export async function beginPasskeyRegistration(password: string) {
  const user = await requireStepUp(password);
  if (await hasPasskey()) {
    throw new Error("A passkey is already registered. Remove it first.");
  }
  const options = await buildRegistrationOptions({
    userId: user.id,
    userName: user.email ?? user.id,
  });
  (await cookies()).set(CHALLENGE_COOKIE, options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: CHALLENGE_TTL_S,
  });
  return options;
}

export async function finishPasskeyRegistration(
  response: RegistrationResponseJSON,
) {
  const user = await actor();
  const store = await cookies();
  const challenge = store.get(CHALLENGE_COOKIE)?.value;
  store.delete(CHALLENGE_COOKIE);
  if (!challenge) throw new Error("Registration timed out. Start again.");

  const result = await verifyRegistration({ response, expectedChallenge: challenge });
  if (!result.verified) {
    await logSecurityEvent({
      event: "MFA_FAILED",
      outcome: "FAILURE",
      userId: user.id,
      reason: "Passkey registration verification failed",
    });
    throw new Error("Could not verify the passkey.");
  }

  await db.authenticationFactor.upsert({
    where: { userId_type: { userId: user.id, type: "webauthn" } },
    update: {
      status: "ACTIVE",
      confirmedAt: new Date(),
      disabledAt: null,
      credentialId: result.credentialId,
      credentialPublic: result.credentialPublic,
      counter: result.counter,
      deviceType: result.deviceType,
      backedUp: result.backedUp,
    },
    create: {
      userId: user.id,
      type: "webauthn",
      status: "ACTIVE",
      confirmedAt: new Date(),
      credentialId: result.credentialId,
      credentialPublic: result.credentialPublic,
      counter: result.counter,
      deviceType: result.deviceType,
      backedUp: result.backedUp,
    },
  });

  await logSecurityEvent({
    event: "MFA_ENABLED",
    outcome: "SUCCESS",
    userId: user.id,
    reason: "passkey",
  });
  return { ok: true as const };
}

export async function removePasskey(password: string) {
  const user = await requireStepUp(password);
  await db.authenticationFactor.updateMany({
    where: { userId: user.id, type: "webauthn" },
    data: {
      status: "DISABLED",
      disabledAt: new Date(),
      credentialId: null,
      credentialPublic: null,
    },
  });
  await logSecurityEvent({
    event: "MFA_DISABLED",
    outcome: "SUCCESS",
    userId: user.id,
    actorUserId: user.id,
    reason: "passkey removed",
  });
  return { ok: true as const };
}

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";
import { getAppUrl } from "@/lib/app-url";

/**
 * WebAuthn / passkey primitives (Stage 1 §6). Thin wrappers over
 * `@simplewebauthn/server` v9 that pin the Relying-Party id + origin to the
 * configured app URL. The challenge lifecycle (issue, stash, consume) is the
 * caller's job — see `passkey-actions.ts` and the login challenge route.
 *
 * v1 scope: one passkey per user, usable as a second factor at the MFA
 * challenge alongside TOTP / recovery codes.
 */

export const RP_NAME = "Monolith";

export function rpID(): string {
  try {
    return new URL(getAppUrl()).hostname;
  } catch {
    return "localhost";
  }
}

export function expectedOrigin(): string {
  try {
    return new URL(getAppUrl()).origin;
  } catch {
    return "http://localhost:3000";
  }
}

function credentialDescriptor(id: string) {
  return {
    id: Buffer.from(id, "base64url"),
    type: "public-key" as const,
  };
}

export async function buildRegistrationOptions(params: {
  userId: string;
  userName: string;
  existingCredentialId?: string | null;
}) {
  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpID(),
    userID: params.userId,
    userName: params.userName,
    attestationType: "none",
    excludeCredentials: params.existingCredentialId
      ? [credentialDescriptor(params.existingCredentialId)]
      : [],
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });
}

export async function verifyRegistration(params: {
  response: RegistrationResponseJSON;
  expectedChallenge: string;
}) {
  const verification = await verifyRegistrationResponse({
    response: params.response,
    expectedChallenge: params.expectedChallenge,
    expectedOrigin: expectedOrigin(),
    expectedRPID: rpID(),
    requireUserVerification: false,
  });
  if (!verification.verified || !verification.registrationInfo) {
    return { verified: false as const };
  }
  const info = verification.registrationInfo;
  return {
    verified: true as const,
    credentialId: Buffer.from(info.credentialID).toString("base64url"),
    credentialPublic: Buffer.from(info.credentialPublicKey).toString("base64url"),
    counter: info.counter,
    deviceType: info.credentialDeviceType,
    backedUp: info.credentialBackedUp,
  };
}

export async function buildAuthenticationOptions(credentialId?: string | null) {
  return generateAuthenticationOptions({
    rpID: rpID(),
    userVerification: "preferred",
    allowCredentials: credentialId ? [credentialDescriptor(credentialId)] : [],
  });
}

export async function verifyAuthentication(params: {
  response: AuthenticationResponseJSON;
  expectedChallenge: string;
  credentialId: string;
  credentialPublic: string;
  counter: number;
}) {
  const verification = await verifyAuthenticationResponse({
    response: params.response,
    expectedChallenge: params.expectedChallenge,
    expectedOrigin: expectedOrigin(),
    expectedRPID: rpID(),
    requireUserVerification: false,
    authenticator: {
      credentialID: Buffer.from(params.credentialId, "base64url"),
      credentialPublicKey: Buffer.from(params.credentialPublic, "base64url"),
      counter: params.counter,
    },
  });
  return {
    verified: verification.verified,
    newCounter: verification.authenticationInfo?.newCounter ?? params.counter,
  };
}

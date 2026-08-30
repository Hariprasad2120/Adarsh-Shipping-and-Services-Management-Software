/**
 * Step-up (re-authentication) policy for sensitive operations
 * (OWASP ASVS 2.7 / MFA Cheat Sheet).
 *
 * A recent, explicit re-auth (password or a fresh OTP) is required before:
 *   - disabling MFA / removing an authentication factor / resetting MFA
 *   - adding an authentication factor
 *   - changing password
 *   - changing the primary email
 *   - changing administrator privileges / org authentication policy
 *   - generating API credentials
 *
 * This module is pure policy — the caller supplies `lastVerifiedAt` (the time
 * of the last strong auth event for the session) and gets back whether the
 * action may proceed.
 */

export type SensitiveAction =
  | "mfa.disable"
  | "mfa.enroll"
  | "mfa.reset"
  | "factor.add"
  | "factor.remove"
  | "recovery.regenerate"
  | "password.change"
  | "email.change"
  | "admin.privilege.change"
  | "org.auth_policy.change"
  | "api_credentials.generate";

/** Max age of the last strong-auth event for the action to be allowed. */
const FRESHNESS_SECONDS: Record<SensitiveAction, number> = {
  "mfa.disable": 5 * 60,
  "mfa.reset": 5 * 60,
  "mfa.enroll": 10 * 60,
  "factor.add": 10 * 60,
  "factor.remove": 5 * 60,
  "recovery.regenerate": 10 * 60,
  "password.change": 10 * 60,
  "email.change": 5 * 60,
  "admin.privilege.change": 5 * 60,
  "org.auth_policy.change": 5 * 60,
  "api_credentials.generate": 10 * 60,
};

export interface StepUpResult {
  ok: boolean;
  /** Seconds since the last strong auth (Infinity when never / unknown). */
  ageSeconds: number;
  requiredWithinSeconds: number;
}

export function evaluateStepUp(
  action: SensitiveAction,
  lastVerifiedAt: Date | number | null | undefined,
  now: Date | number = Date.now(),
): StepUpResult {
  const required = FRESHNESS_SECONDS[action];
  const nowMs = typeof now === "number" ? now : now.getTime();
  const lastMs =
    lastVerifiedAt == null
      ? null
      : typeof lastVerifiedAt === "number"
        ? lastVerifiedAt
        : lastVerifiedAt.getTime();
  const ageSeconds = lastMs == null ? Infinity : Math.max(0, (nowMs - lastMs) / 1000);
  return {
    ok: ageSeconds <= required,
    ageSeconds,
    requiredWithinSeconds: required,
  };
}

export class StepUpRequiredError extends Error {
  constructor(readonly action: SensitiveAction) {
    super(`Re-authentication required for: ${action}`);
    this.name = "StepUpRequiredError";
  }
}

export function assertStepUp(
  action: SensitiveAction,
  lastVerifiedAt: Date | number | null | undefined,
  now?: Date | number,
): void {
  if (!evaluateStepUp(action, lastVerifiedAt, now).ok) {
    throw new StepUpRequiredError(action);
  }
}

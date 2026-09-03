/**
 * Stage 2 — enterprise platform: organisation-membership lifecycle (PURE).
 *
 * Per-org user lifecycle (spec §30). No DB — just the state set and the allowed
 * transitions, so the engine and any UI share one definition.
 */

export const MEMBERSHIP_STATUSES = [
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED",
  "ARCHIVED",
] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export function isMembershipStatus(v: string): v is MembershipStatus {
  return (MEMBERSHIP_STATUSES as readonly string[]).includes(v);
}

/** A membership in one of these statuses can authenticate / act in the org. */
export function isActiveMembership(status: string): boolean {
  return status === "ACTIVE";
}

const TRANSITIONS: Record<MembershipStatus, readonly MembershipStatus[]> = {
  INVITED: ["ACTIVE", "DEACTIVATED", "ARCHIVED"],
  ACTIVE: ["SUSPENDED", "DEACTIVATED", "ARCHIVED"],
  SUSPENDED: ["ACTIVE", "DEACTIVATED", "ARCHIVED"],
  DEACTIVATED: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: [], // terminal
};

export function canTransition(from: string, to: string): boolean {
  if (!isMembershipStatus(from) || !isMembershipStatus(to)) return false;
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export class MembershipTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot change membership status from ${from} to ${to}.`);
    this.name = "MembershipTransitionError";
  }
}

export function assertTransition(from: string, to: string): void {
  if (!canTransition(from, to)) throw new MembershipTransitionError(from, to);
}

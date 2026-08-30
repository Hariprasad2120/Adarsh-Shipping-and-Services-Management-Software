/**
 * Safe OAuth / OIDC identity acceptance (MON-S1-013).
 *
 * Google authenticates the identity; Monolith then establishes its own session.
 * Account linking must NEVER happen just because a token carries some email
 * address. Rules enforced here:
 *
 *  1. The provider must assert the email is verified (`email_verified === true`).
 *  2. If an org / deployment pins allowed domains, the email domain must match.
 *  3. The email is normalised (trim + lowercase) for all downstream lookups.
 *
 * The DB-level check — "this Google `sub` is the one already linked to this
 * user, or this user has no link yet" — belongs in the sign-in callback with
 * the identity table; this module covers the profile-shape rules.
 */

export interface OAuthProfileLike {
  email?: string | null;
  email_verified?: boolean | string | null;
  hd?: string | null; // Google hosted-domain claim
}

export type OAuthAcceptance =
  | { ok: true; email: string; domain: string }
  | { ok: false; reason: "NO_EMAIL" | "EMAIL_UNVERIFIED" | "DOMAIN_NOT_ALLOWED" };

function isVerified(v: OAuthProfileLike["email_verified"]): boolean {
  return v === true || v === "true";
}

export function parseAllowedDomains(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

export function assessOAuthProfile(
  profile: OAuthProfileLike,
  opts: { allowedDomains?: string[] } = {},
): OAuthAcceptance {
  const email = (profile.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { ok: false, reason: "NO_EMAIL" };
  if (!isVerified(profile.email_verified)) {
    return { ok: false, reason: "EMAIL_UNVERIFIED" };
  }
  const domain = email.slice(email.lastIndexOf("@") + 1);
  const allowed = opts.allowedDomains ?? [];
  if (allowed.length > 0) {
    const hd = (profile.hd ?? "").trim().toLowerCase();
    const domainOk = allowed.includes(domain);
    const hdOk = hd ? allowed.includes(hd) : true;
    if (!domainOk || !hdOk) return { ok: false, reason: "DOMAIN_NOT_ALLOWED" };
  }
  return { ok: true, email, domain };
}

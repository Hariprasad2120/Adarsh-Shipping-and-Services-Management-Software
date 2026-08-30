# SESSION_SECURITY

Implementation: `src/lib/session-service.ts`, `src/lib/session-config.ts`,
`src/lib/auth.ts` (jwt/session callbacks), `src/proxy.ts`.

---

## 1. Model — opaque server-side session

The NextAuth JWT carries **only** an opaque `sessionNonce`. The `UserSession`
row is the source of truth for whether a session is alive.

```
UserSession {
  token         (random UUID = the nonce)   @unique
  userId, status ("ACTIVE" | "EXPIRED" | "REVOKED")
  loginAt, lastSeenAt, expiresAt (absolute cap)
  strongAuthAt  (last password / OTP re-auth — step-up basis)
  mfaVerified
  ipAddress (masked), ipHash (sha256(ip+secret)), userAgent, device
  rememberMe
  logoutAt, revokedAt, revokedById, revokeReason
}
```

On **every** protected request the `jwt` callback calls
`validateSession(nonce)`:
- row missing / not `ACTIVE` → invalid
- `user.active === false` → invalid (+ `DISABLED_USER_ACCESS`)
- `now > expiresAt` (absolute) → `EXPIRED` (+ audit)
- idle beyond the idle limit → `EXPIRED` (+ audit)
- **any DB error → invalid (fail closed, MON-S1-012)**

Invalid → the JWT is rejected → the cookie is cleared → redirect to `/login`.
A 5-second per-instance result cache means revocation propagates within ≤5s
(`MON-S1-051`, accepted, configurable).

## 2. Cookies

| Prod name | Attributes |
|---|---|
| `__Host-monolith.session-token` | HttpOnly · Secure · SameSite=Lax · Path=/ · **no Domain** |
| `__Host-monolith.csrf-token` | HttpOnly · Secure · SameSite=Lax · Path=/ |
| `__Secure-monolith.callback-url` | HttpOnly · Secure · SameSite=Lax |

- `__Host-` prefix in production = the strongest cookie scoping the platform
  offers. Dev/staging use unprefixed, environment-namespaced names.
- Names are Monolith-specific so a co-hosted app (AMS) can never read or be read
  by a Monolith session. `LEGACY_COOKIE_NAMES` (old NextAuth/AMS defaults) are
  never accepted and are purged on logout.
- Session/CSRF tokens are **never** placed in `localStorage`, `sessionStorage`,
  URLs or query parameters. Mobile clients use an `Authorization: Bearer`
  header carrying the same opaque token (same `validateSession` core).

## 3. Timeouts (env-driven, `session-config.ts`)

| Setting | Env | Default |
|---|---|---|
| Idle timeout (user) | `SESSION_IDLE_TIMEOUT_MINUTES` | 30 |
| Idle timeout (admin) | `SESSION_ADMIN_IDLE_TIMEOUT_MINUTES` | 15 |
| Absolute lifetime | `SESSION_ABSOLUTE_TIMEOUT_HOURS` | 12 |
| Remember-me lifetime | `SESSION_REMEMBER_ME_DAYS` | 7 (hard cap 7) |
| Activity write throttle | `SESSION_ACTIVITY_THROTTLE_MINUTES` | 5 |
| Login lockout attempts / window | `LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCKOUT_MINUTES` | 5 / 15 |

Org-configurable policy within these safe platform bounds is a tracked
follow-up (`§27` of the brief).

## 4. Rotation & fixation

- **Every login** creates a brand-new `UserSession` row + nonce — a
  pre-authentication session id cannot be promoted (fixation defence).
- `rotateSession({ currentToken, reason, markMfaVerified })` — revokes the old
  row, issues a fresh nonce with the same lifetime, stamps `strongAuthAt` and
  `mfaVerified`, audits `SESSION_ROTATED`. Call after MFA completion, password
  change and privilege escalation. `createSession` stamps `strongAuthAt` at
  login; the MFA path sets `mfaVerified: true` directly.
- `markStrongAuth(token)` — refresh `strongAuthAt` after a step-up check.

## 5. Revocation

- `revokeSessionById` — one session (self from the security page, or by admin).
- `revokeAllSessionsForUser({ exceptToken })` — "sign out all other devices";
  also used on password reset (`reason: "PASSWORD_CHANGED"`).
- Logout (`events.signOut`) marks the row `REVOKED` and clears the 5s cache.
- All revocations write a `SecurityEvent`.

## 6. Active session inventory

`listActiveSessions(userId)` returns id, login/last-seen, masked IP, device
label, user-agent, remember-me — for the account security page (current device
indication + revoke controls). Exact token values are never returned to the
browser.

## 7. Caching of sensitive responses

`proxy.ts` sets `Cache-Control: no-store, no-cache, must-revalidate` +
`Pragma: no-cache` + `Expires: 0` on authenticated responses (Back-button
exposure after logout). `/api/*` also gets `no-store` from `next.config.ts`.

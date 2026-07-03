# Session Security — Monolith Engine

Authoritative reference for the authentication/session architecture introduced in the
secure-session rebuild (July 2026).

## Architecture

- **Auth.js (NextAuth v5) with JWT strategy + database-backed session records.**
  The HttpOnly cookie carries an encrypted JWT whose only session-critical claim is an
  **opaque session nonce** (`sessionNonce`, a UUID). The `UserSession` table is the
  **source of truth**: every protected request re-validates the nonce against the DB in
  the `jwt` callback ([src/lib/auth.ts](../src/lib/auth.ts)). If the DB row is missing,
  revoked, idle-expired, absolute-expired, or belongs to a disabled user, the callback
  returns `null` — the cookie is invalidated and the user lands on `/login`.
- Session lifecycle lives in [src/lib/session-service.ts](../src/lib/session-service.ts):
  `createSession`, `validateSession`, `revokeSessionById`, `revokeAllSessionsForUser`,
  `listActiveSessions`, plus audit logging (`logSecurityEvent`).
- Timeout and lockout configuration lives in
  [src/lib/session-config.ts](../src/lib/session-config.ts) — env-driven, never
  hardcoded in business logic.

## Cookie isolation (the AMS auto-login fix)

Previously Monolith used the Auth.js default cookie names
(`authjs.session-token` / `next-auth.session-token`). Any other app on the same
host — e.g. AMS on another `localhost` port — that used the same defaults **and a
shared `AUTH_SECRET`** could produce a cookie Monolith would happily decode:
opening Monolith would silently "log in" as the last AMS user.

Fixes in place:

| Concern | Fix |
|---|---|
| Cookie name collision | Dev: `monolith.dev.session-token`; Prod: `__Host-monolith.session-token` (plus `monolith.*` CSRF/callback cookies) |
| Shared JWT secret | Monolith now has its **own `AUTH_SECRET`** in `.env`. Never copy it to AMS or any other app. |
| Legacy cookies lingering | The proxy only accepts Monolith cookie names; logout and the dev utility purge all legacy names (`next-auth.*`, `authjs.*`, `ams.*`) |
| Foreign token replay | Even a validly-signed foreign JWT fails DB nonce validation → forced logout |

Cookie attributes: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production, no
`Domain` attribute. The `__Host-` prefix makes the browser enforce Secure+Path=/+no-Domain.

### Localhost is shared across ports

Browsers scope cookies by **host, not port**. `localhost:3000` (Monolith) and
`localhost:4000` (AMS) share a cookie jar. Unique cookie names fix the collision, but for
full isolation run each app on its own hostname:

```
# hosts file or *.localhost (resolves automatically in modern browsers)
http://monolith.localhost:3000
http://ams.localhost:4000
```

If old cookies are causing weirdness in dev, open
`http://localhost:3000/api/dev/clear-auth-cookies` — a **dev-only** route (404 in
production) that expires every known auth cookie.

## Timeouts

| Env var | Default | Meaning |
|---|---|---|
| `SESSION_IDLE_TIMEOUT_MINUTES` | 30 | Idle timeout, normal users |
| `SESSION_ADMIN_IDLE_TIMEOUT_MINUTES` | 15 | Idle timeout, platform admins |
| `SESSION_ABSOLUTE_TIMEOUT_HOURS` | 12 | Hard cap regardless of activity |
| `SESSION_REMEMBER_ME_DAYS` | 7 (max 7) | Absolute cap when "Remember me" is checked |
| `SESSION_ACTIVITY_THROTTLE_MINUTES` | 5 | Min gap between `lastSeenAt` writes |
| `LOGIN_MAX_ATTEMPTS` | 5 | Failed logins before lockout (per email+IP) |
| `LOGIN_LOCKOUT_MINUTES` | 15 | Lockout window |

`lastSeenAt` updates are throttled and fire-and-forget, so the per-request cost of DB
validation is one indexed `findUnique`.

## Logout

`performLogout()` in [src/lib/logout.ts](../src/lib/logout.ts) is the **only** approved
logout path. It clears client storage, broadcasts to other tabs, then calls the
`secureLogoutAction` server action ([src/lib/auth-actions.ts](../src/lib/auth-actions.ts))
which revokes the DB session, audit-logs, signs out of Auth.js, and purges Monolith +
legacy cookies. Authenticated responses already carry
`Cache-Control: no-store` (see [src/proxy.ts](../src/proxy.ts)), so browser Back after
logout cannot expose protected content.

## Session visibility & control

- **Users**: `/account/security` — active sessions with device, masked IP, login/last
  activity/expiry times, current-session indicator, per-session revoke, and
  "Logout from all other devices".
- **Admins**: `/admin/sessions` — org-wide live sessions with **Force logout**
  (single session) and **All devices** (all of a user's sessions), plus session history
  and the security-event log. Requires `admin.org.manage`.
- **Automatic revocation**: password reset (`PASSWORD_CHANGED`), user disable
  (`USER_DISABLED`), and role change (`ROLE_CHANGED`) revoke all of the affected user's
  sessions (see [src/modules/core/user/service.ts](../src/modules/core/user/service.ts)).

## Audit log

All events go to the `SecurityEvent` table with masked IP, user agent, and a
**hashed token reference** (sha256 prefix — raw tokens are never persisted in logs):

`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGIN_LOCKED`, `LOGOUT`, `SESSION_IDLE_EXPIRED`,
`SESSION_ABSOLUTE_EXPIRED`, `SESSION_REVOKED_BY_USER`, `SESSION_REVOKED_BY_ADMIN`,
`ALL_SESSIONS_REVOKED`, `PASSWORD_CHANGED`, `DISABLED_USER_ACCESS`, `SESSION_MISMATCH`.
Admin-initiated events carry `details.actorUserId` and `details.reason`.

## Hardening notes / future work

- **MFA**: `verifySecondFactor()` in `auth.ts` is the placeholder hook — wire TOTP or
  passkeys (an `/admin/passkeys` page already exists as a starting point).
- **Rate limiter scale-out**: the login limiter is in-memory (fine for one instance).
  Move to Redis/Upstash if Monolith runs on multiple serverless instances — on Vercel,
  treat the current limiter as best-effort.
- **CSRF**: Auth.js CSRF protection is active (monolith-named CSRF cookie); do not
  disable it. Server actions get origin-checking from Next.js.
- Never store tokens, roles, or PII in `localStorage`; the only client-readable session
  datum is the non-secret `sessionNonce` used for the welcome animation.
- The known-broken migration `20260625110000_enhance_cha_filing_workflow` prevents
  `prisma migrate dev` (shadow DB failure); schema changes currently ship via
  `prisma db push`. Repair the migration history before production cutover.

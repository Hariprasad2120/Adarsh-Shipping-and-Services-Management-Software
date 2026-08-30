# SECURITY_ARCHITECTURE

The security-relevant components of Monolith and how a request is authorised.

---

## 1. Identity model

```
User (1) ──< UserRole >── Role ──< RolePermission >── Permission(key)
  │
  ├──< AuthenticationFactor   (type: "totp" | future "webauthn"; secretEnc AES-256-GCM)
  ├──< MfaRecoveryCode        (codeHash only; single-use)
  ├──< IdentityLink           ((provider, providerAccountId=sub) unique)
  ├──< PasswordResetToken     (tokenHash only; short TTL; single-use)
  ├──< UserSession            (opaque token; strongAuthAt; mfaVerified; status)
  └──< SecurityEvent

Organisation ──< User          (User.orgId — the tenant boundary)
Organisation.requireMfa        (org authentication policy)

RateLimitCounter               (shared atomic counter; key = purpose:dimension:value)
```

Separate identity stacks (consolidation tracked): customer-portal
(`CustomerPortalUser` / `CustomerPortalSession`), mobile staff + CRM (reuse
`UserSession.token` as a bearer, same `validateSession` core).

## 2. Control modules (`src/lib`)

| Module | Responsibility |
|---|---|
| `auth.ts` | Auth.js config: Credentials + Google providers, `authorize` (rate-limit → bcrypt → MFA), `signIn` (OAuth profile + `IdentityLink`), `jwt`/`session` (server-side nonce enforcement), `redirect` (safe-redirect clamp) |
| `session-service.ts` | `createSession` / `validateSession` (fail-closed) / `rotateSession` / `markStrongAuth` / revoke one / revoke all / `logSecurityEvent` (IP masking, token hashing) |
| `session-config.ts` | Cookie names (`__Host-` in prod), timeouts, lockout constants — all env-driven |
| `api-auth.ts` | `requireApiActor` / `requireApiPermission` / `withApiAuth` — deny-by-default route gate |
| `rbac.ts` | `can` / `canAll` / `requirePermission` / `loadCaps`; permission expansion; legacy dept-grant behind an off-by-default flag |
| `tenant.ts` | `tenantWhere` / `assertSameOrg` / `assertFound` / `assertOrgMatchesSession` |
| `security-headers.ts` | Single source for CSP / HSTS / the header set (mirrored by `next.config.ts`, test-enforced) |
| `request-integrity.ts` | `checkRequestIntegrity` / `assertRequestIntegrity` (Fetch-Metadata + Origin) |
| `safe-fetch.ts` | SSRF-guarded outbound fetch |
| `safe-redirect.ts` | Open-redirect guard for `returnTo` / `callbackUrl` |
| `upload-validation.ts` | `validateUpload` / `assertSafeFileContent` / `sniffType` |
| `rate-limit-store.ts` | Postgres-backed atomic rate limiting |
| `mfa/totp.ts` `mfa/secret-encryption.ts` `mfa/recovery-codes.ts` `mfa/service.ts` | TOTP, AEAD for secrets, recovery codes, MFA lifecycle |
| `password-reset.ts` `password-reset-token.ts` | Local-account reset flow + token primitives |
| `step-up.ts` | Per-action re-authentication freshness policy |
| `oauth-linking.ts` | `assessOAuthProfile` (email-verified + domain policy) |
| `workspace-oauth.ts` | Google token exchange/refresh; `encryptToken` / `encryptAccessToken` / `readAccessToken` |
| `security.ts` | `sanitizeFilename`, `resolveInside` (path-traversal guard), `contentDisposition`, `requireCronSecret`, `requireProductionSecret`, legacy in-process `rateLimit` |

## 3. Request lifecycle (authenticated dashboard / API)

```
1. src/proxy.ts (edge)
   - block edition-disabled paths
   - public allow-list → pass
   - else: session cookie present? no → 302 /login
   - on the response: Cache-Control no-store + security headers (HSTS in prod)
      ⚠ cookie PRESENCE only — not a security decision

2. Route handler / RSC
   - getSession()  →  NextAuth jwt callback:
       decode JWT → read opaque sessionNonce
       validateSession(nonce): DB row ACTIVE? user active? idle/absolute ok?
         └ any DB error → { valid:false }  (fail closed)
       invalid → JWT rejected → cookie cleared → redirect /login

3. Authorization
   - requireApiActor({ requireOrg })  → ApiActor { userId, orgId, roleIds, ... }
   - requirePermission(userId, key)   → ForbiddenError (403) if missing

4. Tenant boundary
   - orgId ALWAYS from the ApiActor / session, never the URL/body/query
   - query: where { id, ...tenantWhere(orgId) }   OR   fetch + assertSameOrg
   - cross-org → 404 (indistinguishable from "not found")

5. Input
   - Zod DTO (only intended fields) → service layer
   - outbound URL → safeFetch ; upload → validateUpload

6. Business action → audit (SecurityEvent for sensitive operations)
```

## 4. Cookies

| Cookie (prod name) | Attributes |
|---|---|
| `__Host-monolith.session-token` | HttpOnly, Secure, SameSite=Lax, Path=/, no Domain |
| `__Host-monolith.csrf-token` | HttpOnly, Secure, SameSite=Lax, Path=/ |
| `__Secure-monolith.callback-url` | HttpOnly, Secure, SameSite=Lax |

Legacy / foreign names (old NextAuth defaults, AMS) are never accepted and are
purged on logout (`LEGACY_COOKIE_NAMES`).

## 5. Headers (every response)

`Content-Security-Policy` (default-src 'self'; frame-ancestors 'none';
object-src 'none'; base-uri 'self'; form-action 'self'; script-src 'self'
'unsafe-inline' 'wasm-unsafe-eval' [prod]; …; upgrade-insecure-requests [prod]),
`Strict-Transport-Security` [prod], `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Cross-Origin-Opener-Policy: same-origin`, `Permissions-Policy`.
`/api/*` additionally: `Cache-Control: no-store`.

## 6. Keys

| Key | Purpose | Notes |
|---|---|---|
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | JWT signing, IP hashing, recovery-code pepper fallback | required in prod |
| `MFA_ENCRYPTION_KEY` | AES-256-GCM for TOTP secrets | separate from AUTH_SECRET; 32 bytes; required in prod |
| `MFA_RECOVERY_PEPPER` | recovery-code hash pepper | falls back to AUTH_SECRET |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | AES-256-GCM for Google refresh + access tokens | 32-byte hex |
| `FACE_ENCRYPTION_KEY` | biometric face descriptor encryption | existing |
| `CRON_SECRET`, `SETUP_SECRET` | endpoint auth | header/Bearer only |

Rotation: see `SECURITY_DEPLOYMENT_CHECKLIST.md`.

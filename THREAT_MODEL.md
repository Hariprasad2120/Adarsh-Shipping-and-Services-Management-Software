# THREAT_MODEL

Monolith Engine — Stage 1. STRIDE-style analysis of the authentication, session
and tenant-isolation surface. Living document; revise when a trust boundary or
data flow changes.

---

## 1. Assets

| Asset | Sensitivity |
|---|---|
| User credentials (bcrypt hashes), TOTP secrets, recovery codes, reset tokens | Critical |
| Session tokens / cookies | Critical (equivalent to credentials while live) |
| Google OAuth refresh + access tokens (Gmail/Drive/Calendar/Chat scopes) | Critical |
| Organisation business data: employees, payroll/salary, invoices, journals, CHA jobs, documents, customer records | High (per-tenant) |
| Security / audit event log | High (integrity) |
| Platform-admin capability | Critical |
| Encryption keys (`AUTH_SECRET`, `MFA_ENCRYPTION_KEY`, `GOOGLE_TOKEN_ENCRYPTION_KEY`, `FACE_ENCRYPTION_KEY`) | Critical |
| Email / SMTP credentials, `CRON_SECRET`, `SETUP_SECRET` | High |

## 2. Actors

- **Anonymous internet user** — can hit any public endpoint, craft any request.
- **Authenticated staff user (Org A)** — valid session, some RBAC permissions.
- **Malicious / compromised org administrator (Org A)** — high in-tenant power.
- **Platform / SaaS administrator** — cross-tenant power; MFA mandatory.
- **Mobile app client** — bearer-token authenticated.
- **Customer-portal user** — separate identity, scoped to one customer/org.
- **Third-party integration** — Google Workspace, cron trigger, ESSL biometric DB, document-automation service.
- **Insider with DB read** — backups, a SQLi elsewhere, a rogue operator.

## 3. Entry points

Login (`/login`, credentials + Google), `/api/auth/*` (NextAuth + password
reset), `/api/mobile/*` (bearer), `/api/customer-portal/*`, `/api/cron/*`
(shared secret), `/api/google-chat/webhook` (bearer), `/api/setup`
(`SETUP_SECRET`), every `(dashboard)` RSC + `/api/*` route handler + server
action, file upload + download routes, the OAuth callback.

## 4. Trust boundaries

1. Internet ⇄ edge (`src/proxy.ts`) — cookie **presence** only; not a security
   boundary on its own.
2. Edge ⇄ route/RSC — `getSession()` validates the opaque nonce against the
   `UserSession` row (fail-closed). **This is the real authN boundary.**
3. Route ⇄ business logic — `requireApiActor` / `requirePermission` (authZ) +
   `tenantWhere` / `assertSameOrg` (tenant boundary).
4. App ⇄ Postgres — parameterised Prisma only; no `*Unsafe` raw queries.
5. App ⇄ Google APIs — `safeFetch` / fixed API bases; tokens encrypted at rest.
6. App ⇄ email/SMS/cron/biometric — outbound, secret-authenticated.

## 5. Key data flows

- **Credential login:** form → `authorize()` → rate-limit check → bcrypt compare
  → (if MFA active) TOTP/recovery verify → `createSession()` (new row + nonce,
  `strongAuthAt`, `mfaVerified`) → JWT carries only the nonce → per-request
  `validateSession()`.
- **Google login:** OAuth (state/PKCE by Auth.js) → `signIn` callback:
  `email_verified` + domain gate → pre-provisioned+active user lookup →
  `IdentityLink` bind/verify (`sub`) → server session created in `jwt` callback.
- **Password reset:** `forgot` (generic response, rate-limited, token hashed +
  emailed from `APP_URL`) → `reset` (validate hash/TTL/one-time → set hash →
  revoke ALL sessions → no auto-login).
- **Tenant-scoped read:** session → `orgId` from session (never the URL) →
  `where: { id, ...tenantWhere(orgId) }` or fetch + `assertSameOrg`.

---

## 6. STRIDE per major flow

### 6.1 Credential login
| Threat | Vector | Control |
|---|---|---|
| Spoofing | Credential stuffing / brute force | bcrypt(12); per-email+IP lockout; **shared Postgres rate-limit store**; MFA for enrolled/mandated accounts |
| Tampering | Modified `role`/`orgId` in the request | server derives role/org from DB; body never trusted |
| Repudiation | "I didn't log in" | `SecurityEvent` LOGIN_SUCCESS/FAILURE/LOCKED with masked IP + UA + token hash |
| Info disclosure | User enumeration via timing/response | same failure path + response for unknown user / bad password; reset flow generic |
| DoS | Lock a victim out permanently | lockout is windowed + email+IP keyed, not permanent; controlled backoff |
| Elevation | Skip the second factor | `authorize()` throws `MfaRequiredError`; no session without a verified factor when required |

### 6.2 Session handling
| Threat | Vector | Control |
|---|---|---|
| Spoofing | Forged / replayed cookie | opaque nonce → DB row; `__Host-` prefix, HttpOnly, SameSite=Lax, Secure |
| Tampering | Edit JWT claims | claims re-derived server-side; nonce validated every request |
| Info disclosure | Token in URL / localStorage / logs | tokens only in HttpOnly cookies (or mobile bearer); audit logs store a hash |
| DoS → bypass | Make the DB error to fail-open | `validateSession()` **fails closed** |
| Elevation | Keep a session after role downgrade / disable | `active:false` and idle/absolute limits enforced per request; revoke-all on password reset; `rotateSession` on privilege change |
| Session fixation | Reuse a pre-login session id | every login creates a fresh row + nonce |

### 6.3 OAuth / account linking
| Threat | Vector | Control |
|---|---|---|
| Spoofing | Google account with a victim's email | `email_verified === true` required; `hd` + `GOOGLE_WORKSPACE_DOMAIN` policy; pre-provisioned + active user only |
| Elevation / takeover | Link a Google `sub` to someone else's account | `IdentityLink (provider, sub)` unique; conflict → reject + `OAUTH_IDENTITY_CONFLICT` |
| Info disclosure | Access token leak from DB | encrypted at rest (AES-256-GCM); refresh token already encrypted |
| Tampering | Open redirect after callback | `redirect` callback clamps via `safeRedirectPath` |

### 6.4 Tenant isolation
| Threat | Vector | Control |
|---|---|---|
| Elevation / info disclosure | `?organisationId=` / id swap in URL | org comes from the session only; `tenantWhere` / `assertSameOrg`; 404 (not 403) on cross-org so existence isn't revealed |
| Tampering | Cross-org write/delete | scoped `updateMany`/`delete` predicates; confirmed IDOR sites fixed |
| Detection gap | New unscoped `findUnique` merged later | `scan-tenant-scope-coverage` CI gate |

### 6.5 MFA recovery
| Threat | Vector | Control |
|---|---|---|
| Spoofing | Guess a recovery code | cryptographically random; hashed at rest; constant-time match; rate-limited via the login path |
| Replay | Reuse a recovery code | single-use (`usedAt` set in the same statement) |
| Elevation | Disable MFA without re-auth | `mfa-actions.ts` enforces step-up (password re-entry) before `disableMfa` |

### 6.6 SSRF / uploads / injection
| Threat | Vector | Control |
|---|---|---|
| SSRF | User-controlled URL → internal / metadata | `safeFetch` (protocol + private/loopback/metadata block, redirect re-check, timeout, size cap) |
| Malicious upload | HTML/script disguised as a document | `validateUpload` / `assertSafeFileContent` (magic-byte + markup sniff); `sanitizeFilename` + `resolveInside`; random storage names |
| SQL injection | Raw query concatenation | none — tagged-template Prisma only; **no `*Unsafe`** in app code |
| XSS | HTML render sinks | DOMPurify on the two real sinks; strict CSP (`frame-ancestors 'none'`, `object-src 'none'`); theme CSS validated against an anchored grammar |
| Mass assignment | `data: body` spread | explicit Zod DTOs on new routes; the confirmed Prisma-spread sites use explicitly-shaped objects (broader sweep tracked) |

### 6.7 Compromised administrator / insider
| Threat | Control |
|---|---|
| Org admin runs script in other org users' browsers via theme CSS | palette values validated against an anchored colour grammar on read + write |
| Org admin silently escalates to full accounting via a department rename | implicit dept grant removed; explicit `RolePermission` only; assignment audited |
| Insider with DB read harvests secrets | passwords/TOTP/recovery/reset/OAuth tokens all hashed or AEAD-encrypted with a separately-managed key |
| Platform admin impersonates a user | MFA mandatory for platform admins; `admin/simulation` path flagged for audit (§3 of the after-audit) |

### 6.8 Denial of service
| Vector | Control |
|---|---|
| Expensive endpoints / exports | rate-limit store available; per-route limits to be applied (tracked) |
| Auth endpoint flooding | shared rate-limit store, windowed lockout, no permanent lock |
| Platform-level volumetric | out of app scope — see `SECURITY_DEPLOYMENT_CHECKLIST.md` (WAF / Vercel Firewall / Attack Mode) |

---

## 7. Out of scope for the application layer (infrastructure controls required)

- Network DDoS / L3-L4 mitigation, WAF managed rulesets, bot management.
- Database encryption at rest, backup encryption + access control, PITR.
- Secret manager (rotation, access audit) for the `*_KEY` / `*_SECRET` values.
- TLS termination, HSTS preload submission, certificate management.
- Trusted reverse-proxy configuration (`X-Forwarded-*` hop count).
- Centralised log aggregation + alerting + SIEM for `SecurityEvent`.
- Endpoint / CI runner hardening; branch protection + required checks.

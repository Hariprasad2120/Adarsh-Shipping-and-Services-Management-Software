# Security

How to report a vulnerability, what Monolith's security baseline is, and where
the detailed docs live. This project does **not** claim any certification and is
not "unhackable".

## Reporting a vulnerability

Email the maintainers (see repo owners) with:
- affected route / file / feature,
- a minimal reproduction,
- impact and any suggested fix.

Please do not open a public issue for an unpatched vulnerability. Expect an
acknowledgement within a few business days.

## Security baseline

Target: **OWASP ASVS Level 2** for the application layer. Controls that do not
apply, or are delegated to infrastructure, are documented in
`THREAT_MODEL.md` §7 and `SECURITY_DEPLOYMENT_CHECKLIST.md`.

Implemented (Stage 1):

- **Authentication** — bcrypt(12) local passwords; Google OIDC via Auth.js with
  `email_verified` + domain policy + verified-`sub` linking; RFC-6238 TOTP MFA
  with one-time hashed recovery codes; mandatory MFA for platform admins and
  org-configurable `requireMfa`. See `AUTHENTICATION.md`.
- **Sessions** — opaque server-side session validated against the DB on every
  request (fail-closed), `__Host-` cookies, idle + absolute timeouts, active
  session inventory, revoke one / revoke all, rotation on privilege change. See
  `SESSION_SECURITY.md`.
- **Authorization** — deny-by-default `requireApiActor` / `requirePermission`;
  0 unguarded API routes (CI-enforced); no hardcoded privileged identities.
- **Tenant isolation** — org context from the session only; `tenantWhere` /
  `assertSameOrg`; cross-org lookups return 404; static coverage gate.
- **Password reset** — 256-bit token, hashed at rest, single-use, short TTL,
  enumeration-safe response, link origin pinned to `APP_URL`, all sessions
  revoked on reset.
- **Transport / headers** — HSTS (prod), CSP (`frame-ancestors 'none'`,
  `object-src 'none'`, no `unsafe-eval` in prod), `nosniff`, `Referrer-Policy`,
  COOP, `Permissions-Policy`.
- **Request integrity** — `Sec-Fetch-Site` + Origin checks, SameSite=Lax,
  NextAuth CSRF token, Next Server-Action origin check.
- **Input / output** — Zod DTOs; SSRF-guarded `safeFetch`; magic-byte upload
  validation; DOMPurify on HTML sinks; parameterised Prisma only.
- **Secrets** — no secrets in the repo or its history (CI secret-scan);
  passwords / TOTP secrets / recovery codes / reset tokens / OAuth tokens all
  hashed or AEAD-encrypted with separately-managed keys.
- **Audit** — centralised `SecurityEvent` (actor, target, IP masked, UA,
  outcome, reason) for auth, MFA, session, OAuth-link, password-reset and
  privilege events; not editable by ordinary org users.
- **Supply chain** — `npm audit` gate fails CI on unresolved critical/high in
  the production tree; residuals triaged with review-by dates in
  `DEPENDENCY_REMEDIATION.md`.

## Document map

| File | Contents |
|---|---|
| `SECURITY_ARCHITECTURE.md` | Component + control map, request lifecycle |
| `AUTHENTICATION.md` | Local + Google + MFA flows, password policy, reset |
| `SESSION_SECURITY.md` | Session model, cookies, timeouts, rotation, revocation |
| `THREAT_MODEL.md` | Assets, actors, boundaries, STRIDE per flow |
| `SECURITY_TESTING.md` | The attacker-style test suite + how to run it |
| `SECURITY_DEPLOYMENT_CHECKLIST.md` | Env, keys, proxy, infra controls before prod |
| `SECURITY_AUDIT_BEFORE_STAGE1.md` | Baseline findings + per-cluster progress log |
| `SECURITY_AUDIT_AFTER_STAGE1.md` | Before→after verdicts + residual risk |
| `DEPENDENCY_REMEDIATION.md` | Dependency plan + CI-gate allow-list |

## Known residual risk

See `SECURITY_AUDIT_AFTER_STAGE1.md` §3. In brief: a full multi-route BOLA
sweep, `orgId` schema constraints, `xlsx`/`nodemailer` upgrades, nonce-based
CSP, the Security Center UI, and an external penetration test remain.

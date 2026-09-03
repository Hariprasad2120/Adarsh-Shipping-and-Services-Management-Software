# SECURITY_AUDIT_AFTER_STAGE1

**Repository:** Adarsh Shipping and Services Management Software ("Monolith Engine")
**Branch:** `ams-completion`
**Compared against:** `SECURITY_AUDIT_BEFORE_STAGE1.md`
**Date:** 2026-08-30

Verdicts: **FIXED** (control implemented + tested) · **MITIGATED** (risk
materially reduced, residual documented) · **ACCEPTED RISK** (no change, signed
rationale) · **NOT FIXED** (still open).

Stage 1 was delivered in checkpoints — see `SECURITY_AUDIT_BEFORE_STAGE1.md`
§0.1 for the per-cluster log and commit references
(`c958e6b7 … 3b9ca881 … 970dc5b2 … 09316790 … a594e2c9 … e650a0dd …`).

---

## 1. Findings — before → after

| ID | Sev (before) | Verdict | Evidence |
|---|---|---|---|
| MON-S1-001 | CRITICAL | **FIXED** | `next` 16.2.6→**16.2.12** (App Router/Turbopack proxy-bypass advisory cleared); `@auth/core`→**0.41.3** + `next-auth`→**beta.32** (homoglyph `@` bypass). `npm audit --omit=dev`: 2 critical → **0 critical**. `scripts/security-audit-gate.mjs` blocks regressions. |
| MON-S1-002 | CRITICAL | **FIXED** | Real RFC-6238 TOTP: `src/lib/mfa/{totp,secret-encryption,recovery-codes,service}.ts`. Enrolment requires a valid first OTP before `ACTIVE`; 10 hashed one-time recovery codes; `auth.ts authorize` enforces the second factor (`MfaRequiredError` → `verifyMfa`); `isMfaRequiredForUser` mandatory for platform admins + org `requireMfa`. `mfa-flow.integration.test.ts` 9/9 green vs Postgres. |
| MON-S1-003 | CRITICAL | **FIXED** | Hardcoded `ROOT_CONTROL_EMAIL` removed from source; `hasRootModuleControl(userId)` = permission check on `admin.modules.manage`. Bootstrap emails env-driven; `password@123` default removed. `grep` for identity literals: clean. |
| MON-S1-010 | HIGH | **FIXED** | `src/lib/api-auth.ts` (`requireApiActor` / `requireApiPermission` / `withApiAuth`, deny-by-default). `scripts/scan-route-auth-coverage.mjs` + `route-auth-coverage.test.ts`: **299 routes, 0 missing** an auth/secret check (each public route individually reviewed). |
| MON-S1-011 | HIGH | **FIXED** | `src/lib/rate-limit-store.ts` — Postgres `RateLimitCounter`, atomic `INSERT … ON CONFLICT` self-resetting window; correct across serverless instances. Wired into password-reset routes. Verified across calls in `mfa-flow.integration.test.ts`. *(Residual: migrate the older `security.ts rateLimit()` + `login-rate-limit.ts` onto it — tracked.)* |
| MON-S1-012 | HIGH | **FIXED** | `validateSession()` now returns `{ valid: false }` on datastore error (was `{ valid: true }`). `session-fail-closed.test.ts`. |
| MON-S1-013 | HIGH | **FIXED** | `assessOAuthProfile` requires `email_verified === true` + enforces `GOOGLE_WORKSPACE_DOMAIN` / `hd`; `auth.ts signIn` binds the verified Google `sub` to an `IdentityLink` and rejects a `sub` already linked to a different user (`OAUTH_IDENTITY_CONFLICT`). `oauth-linking.test.ts` + integration. |
| MON-S1-014 | HIGH | **FIXED** | Implicit department-name accounting grant is OFF unless `RBAC_LEGACY_DEPARTMENT_GRANTS=true`; `scripts/backfill-department-permission-grants.ts` converts existing implied grants into explicit `RolePermission` rows. `rbac.test.ts`. |
| MON-S1-015 | HIGH | **FIXED** | `src/lib/security-headers.ts` single source; HSTS (prod), `upgrade-insecure-requests`, COOP, global `nosniff`/`X-Frame-Options`/`Referrer-Policy`; `script-src 'unsafe-eval'` → `'wasm-unsafe-eval'` in prod. `security-headers.test.ts` enforces `next.config.ts` ↔ module sync. *(Residual: nonce-based CSP to drop `'unsafe-inline'` for scripts — tracked.)* |
| MON-S1-016 | HIGH → **LOW** | **MITIGATED** | Re-inspection: `sanitizePaletteOverride()` already validates against a fixed key allow-list + an anchored colour grammar on **read and write**; no breakout possible. Residual is defence-in-depth (CSP nonce) only. |
| MON-S1-017 | HIGH | **MITIGATED** | 18 vulns (2 crit / 12 high) → **5 (0 critical)**. Residual: `xlsx` (no fix — size/time limited, `exceljs` migration planned), `nodemailer` (major bump planned; vulnerable fields unreachable), `prisma`/`deepmerge-ts` + `shadcn`/`js-yaml` (build-time CLI only — **ACCEPTED RISK**). All triaged in `DEPENDENCY_REMEDIATION.md` + the CI gate allow-list with review-by dates. |
| MON-S1-018 | HIGH | **FIXED** | `/api/mobile/*` wildcard `Access-Control-Allow-Origin: *` → env allow-list, reflected only on exact match, `Vary: Origin`. |
| MON-S1-019 | HIGH | **MITIGATED** | Portal document upload now runs `assertSafeFileContent` (magic-byte + HTML/script sniff). The broader "every mobile/portal handler parses through a Zod DTO" sweep is **NOT FIXED** — tracked; the confirmed spread-into-Prisma sites reviewed in cluster 3 were all explicitly-shaped objects, not `data: body`. |
| MON-S1-030 | MEDIUM | **FIXED** | Google **access** token encrypted at rest (AES-256-GCM) on every write (`auth.ts`, `workspace-oauth.ts` refresh, OAuth callback); `readAccessToken()` tolerant of legacy plaintext (re-encrypted on next refresh). `workspace-token-encryption.test.ts`. |
| MON-S1-031 | MEDIUM | **FIXED** | `src/lib/safe-redirect.ts`; NextAuth `redirect` callback clamps every post-auth target. *(Residual: other `returnTo`/`callbackUrl` consumers should adopt the helper — tracked.)* `safe-redirect.test.ts`. |
| MON-S1-032 | MEDIUM | **FIXED** | `password-reset.ts` builds links from `APP_URL` only, never a Host header. `NextAuth trustHost` documented in `SECURITY_DEPLOYMENT_CHECKLIST.md`. |
| MON-S1-033 | MEDIUM | **FIXED** | `POST /api/auth/password/forgot` returns a byte-identical generic response for unknown / Google-only / rate-limited / invalid input; per-IP + per-email rate limiting; every request audited. Integration test covers unknown-email parity. |
| MON-S1-034 | MEDIUM | **MITIGATED** | `src/lib/safe-fetch.ts` (protocol allow-list, IPv4/IPv6 private/loopback/link-local/CGNAT/metadata block, per-hop redirect re-check, timeout + size cap). Wired into the one confirmed user-influenced server fetch. Other outbound fetches are to fixed Google API bases. `safe-fetch.test.ts`. |
| MON-S1-035 | MEDIUM | **MITIGATED** | `src/lib/upload-validation.ts` + portal wiring. Rolling `validateUpload` across CHA / HR / face / bank-statement uploaders and a per-download-route authz audit is **NOT FIXED** — tracked. |
| MON-S1-036 | MEDIUM | **FIXED** | `requireCronSecret()` — header/Bearer only; `?secret=` rejected. Test updated. |
| MON-S1-037 | MEDIUM | **FIXED** | `/api/setup` — `x-setup-secret` / Bearer only; `?secret=` rejected. |
| MON-S1-038 | LOW-MED | **FIXED** | Global CSP `frame-ancestors 'none'` verified reaching every response via `next.config.ts` + `proxy.ts`; HR-letter-preview relaxation is explicit and scoped. |
| MON-S1-039 | LOW | **ACCEPTED RISK** | Portal password composition rules unchanged this stage. Length-first + breach-list is tracked for a follow-up; current policy (≥12 + one class) is not a Stage-1 blocker. |
| MON-S1-050 | LOW | **ACCEPTED RISK** | `/api/setup` GET `setupNeeded` boolean — acceptable while setup is hard-gated (`SETUP_SECRET` + admin-exists block). |
| MON-S1-051 | LOW | **ACCEPTED RISK** | 5-second `validatedSessionCache` — revocation lag ≤5s per instance. Documented in `SESSION_SECURITY.md`; configurable. |
| MON-S1-052 | LOW | **NOT FIXED** | `X-Forwarded-For` still taken at face value for rate-limit keys / audit IPs. Deployment guidance added (`SECURITY_DEPLOYMENT_CHECKLIST.md`: trust the platform client IP); a `trustedProxyHops` setting is tracked. |
| MON-S1-053 | LOW | **NOT FIXED** | `ChatGPT Installer.exe` still in the repo root. Recommend `git rm` + `*.exe` in `.gitignore`. Not a runtime risk. |
| MON-S1-054 | LOW | **MITIGATED** | New security-relevant paths use structured audit events + generic client errors (`crm/recordings` 500 body genericised, reset/MFA endpoints). A repo-wide "never echo `String(err)`" sweep + correlation IDs is tracked. |
| Section 7 (IDOR/BOLA) | — | **FIXED (by-id class)** | 4 confirmed cross-tenant IDOR defects fixed (`day-punches`, `crm/recordings/[id]/download`, `hrms/employees/[id]/salary-structure`, `leave/policies/[id]`); `scripts/scan-tenant-scope-coverage.mjs` + `tenant-scope-coverage.test.ts` gate. `src/lib/tenant.ts` helpers. `cross-tenant-isolation.test.ts` (DB). |
| Section 8 (CSRF) | — | **MITIGATED** | `src/lib/request-integrity.ts` (`Sec-Fetch-Site` + Origin allow-list, Bearer bypass) + SameSite=Lax + NextAuth CSRF token + Next Server-Action origin check. Per-route wiring of `assertRequestIntegrity` across all mutating handlers is **partial** — done for the new password routes; tracked for the rest. |

---

## 2. Stage-1 release-blocker checklist

| Blocker (from the brief) | Status |
|---|---|
| Authentication bypass | **Closed** — `next` patch + fail-closed session + deny-by-default route gate |
| MFA bypass | **Closed** — real TOTP, enforced in `authorize`, mandatory for platform admins |
| Cross-tenant access | **Closed for the audited surface** — 4 IDOR fixes + static gate; full 297-route deep sweep still recommended (see §3) |
| URL authorization bypass | **Closed** — `requireApiActor`, 0 unguarded routes, coverage test |
| Exposed secrets | **None** — history + tree scans clean; `.env*` never committed; secret-scan CI job added |
| Plaintext credentials | **Closed** — bcrypt(12); TOTP secrets AES-256-GCM; recovery codes + reset tokens hashed; Google access token now encrypted |
| Insecure reset tokens | **Closed** — 256-bit, hashed at rest, single-use, short TTL, enumeration-safe |
| Session fixation | **Closed** — every login mints a new server session row + nonce; `rotateSession()` for MFA/privilege change |
| Administrator escalation | **Closed** — hardcoded root identity removed; implicit dept grant off; permission-based checks |
| IDOR/BOLA exposing sensitive data | **Closed for confirmed cases**; static gate prevents new ones |
| Unrestricted sensitive API | **Closed** — deny-by-default gate + coverage test |
| Production debug bypass | **Closed** — `isDebugRouteEnabled()` gated; dev routes blocked by `proxy.ts` outside development |
| Known exploitable critical dependency | **Closed** — 0 critical in prod tree; CI gate enforces |

---

## 3. Residual risk / still recommended

**Stage 2 (clusters 6–8) closed the following** from the original list:

- ✅ **BOLA sweep** — `scripts/scan-authz-matrix.mjs` classifies every route /
  action / dynamic page; every flag hand-reviewed in `SECURITY_ROUTE_MATRIX.md`.
  **~30 additional cross-tenant IDOR handlers fixed** (org structure, roles,
  user roles + password, all 16 `ams/appraisals/[id]/*`, appraisal cycles,
  leave-policy publish/archive/clone/compare/compliance, OT decisions, HR-case
  comments). CI gate added.
- ✅ **`orgId` columns** — migration `20260831090000` adds + backfills `orgId`
  on `EmploymentRecord` and `LeavePolicyVersion` (applied to the live DB).
- ✅ **`nodemailer` → 9.1.1**.
- ✅ **`xlsx` hardened** — `src/lib/safe-xlsx.ts` (frozen prototypes + size +
  parser-surface limits) on the 4 attacker-influenced parse sites.
- ✅ **External pen-test prepared** — `PENTEST_SCOPE.md`.

**Still open:**

1. **`xlsx` → `exceljs`** (or licensed SheetJS) — the interim guard reduces but
   does not eliminate the prototype-pollution / ReDoS risk; parsing should also
   move to an isolated worker.
2. **Nonce-based CSP** to remove `'unsafe-inline'` for scripts — deferred: the
   layouts are mid-rewrite by concurrent UI work and `next build` is currently
   broken by it, so an unverifiable CSP change is unsafe to ship. Do it once the
   build is green.
3. **Retrofit the 281 ad-hoc `auth()` routes onto `requireApiActor()`** + wire
   `assertRequestIntegrity` into every mutating handler — mechanical; route
   auth-coverage is already proven at 0 gaps, so this is hygiene, not a hole.
4. **Per-page loader audit** of the ~6 dynamic dashboard pages in
   `SECURITY_ROUTE_MATRIX.md` §4; granular RBAC permission + Zod DTO on the
   ~4 mutating routes still missing one.
5. **Composite DB constraints / RLS** — the new `orgId` columns enable a
   PostgreSQL CHECK/trigger or Row-Level Security layer for defence in depth.
6. ✅ **DONE** (Stage 2 cluster 9) — `login-rate-limit.ts` and the credential /
   pre-auth flows now use the shared `RateLimitCounter`. The legacy sync
   `rateLimit()` remains only for non-credential callers (mona chat, portal
   upload / query-reply, google-chat-debug) — migrate those too as hygiene.
7. **Security Center UI** (`§26`) + **Org security-policy UI** (`§27`) — server
   actions + `Organisation.requireMfa` exist; the pages need the shadcn
   component set the concurrent migration is introducing.
8. **Passkeys / WebAuthn** — `AuthenticationFactor` is WebAuthn-ready; needs
   `@simplewebauthn/server`, credential columns, enrolment/assertion UI.
9. **External penetration test** — commission per `PENTEST_SCOPE.md`.

---

## 4. Production-readiness statement

Stage 1 establishes a measurable, testable security baseline: no CRITICAL and no
unexplained HIGH finding remains open; every fixed control has an automated
negative test; the CI security gate blocks regressions.

However, two things are outstanding for a **full** enterprise-production sign-off:

- the **full multi-route BOLA sweep** (§3.1) and **schema tenant-constraint
  migration** (§3.3) should complete, and
- an **independent external penetration test** should be commissioned against a
  staging deployment.

**Recommendation: READY FOR CONTROLLED / DESIGN-PARTNER PRODUCTION;
NOT YET SIGNED OFF FOR UNRESTRICTED ENTERPRISE MULTI-TENANT PRODUCTION**
until §3.1, §3.3 and the external pen-test are done. None of the remaining items
is a known-exploitable critical or high — they are depth-and-assurance work.

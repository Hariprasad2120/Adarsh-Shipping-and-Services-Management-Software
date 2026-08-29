# SECURITY_AUDIT_BEFORE_STAGE1

**Repository:** Adarsh Shipping and Services Management Software ("Monolith Engine")
**Branch audited:** `ams-completion`
**Audit date:** 2026-08-29
**Auditor:** Stage 1 security hardening pass (automated + manual code review)
**Baseline target:** OWASP ASVS L2
**Status of this document:** FIRST-PASS DISCOVERY. Section 12 lists areas that still need a
deeper line-by-line sweep before remediation is declared complete.

---

## 0. How to read this document

Every finding has a stable ID (`MON-S1-NNN`), a severity, a concrete attack scenario, the
business impact, a remediation, an implementation status, and the automated test that will
prove the fix. Status values: `OPEN`, `IN PROGRESS`, `FIXED`, `MITIGATED`, `ACCEPTED RISK`,
`NOT APPLICABLE`. At the start of Stage 1 every finding is `OPEN`.

Severity scale: CRITICAL / HIGH / MEDIUM / LOW / INFORMATIONAL.

---

## 0.1 Remediation progress log

Findings below are the **baseline** (all `OPEN` at Stage 1 start). Progress is
recorded here as clusters land; final `FIXED / MITIGATED / ACCEPTED RISK / NOT
FIXED` verdicts with evidence go in `SECURITY_AUDIT_AFTER_STAGE1.md`.

### Cluster 1 — request-integrity (checkpoint 1)

| ID | Was | Now | What changed |
|---|---|---|---|
| MON-S1-001 | CRITICAL / OPEN | **PARTIALLY FIXED** | `next` 16.2.6 → **16.2.12** (proxy-bypass advisory cleared; 16.3.3 breaks the Turbopack+Tailwind build). `@auth/core` → **0.41.3** via `overrides` + `next-auth` **beta.32** (homoglyph `@` bypass cleared). `npm audit --omit=dev`: 18→5 vulns, **0 critical**. Defence-in-depth (route-level gate) is cluster 2. |
| MON-S1-015 | HIGH / OPEN | **FIXED** | `Strict-Transport-Security` (prod), `Cross-Origin-Opener-Policy: same-origin`, `upgrade-insecure-requests` (prod), global `X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` added. `script-src 'unsafe-eval'` → `'wasm-unsafe-eval'` in production. Central `src/lib/security-headers.ts`; `next.config.ts` + `src/proxy.ts` aligned; unit test enforces sync. `'unsafe-inline'` for scripts still present pending a nonce migration (tracked). |
| MON-S1-016 | HIGH / OPEN | **DOWNGRADED → LOW** | Re-inspection: `sanitizePaletteOverride()` already validates against a fixed key allowlist **and** an anchored colour grammar (`^#[0-9a-fA-F]{3,8}$` / `rgb()/hsl()` with a digit-only char class), applied on **both** write and read (`theme-settings.ts`). `buildPaletteOverrideCss` only interpolates validated tokens; no `postcss` stringify path involved. No breakout is possible. Residual is defence-in-depth only (CSP nonce) — deferred. Hardening test owed. |
| MON-S1-017 | HIGH / OPEN | **PARTIALLY FIXED** | See `DEPENDENCY_REMEDIATION.md`. Patched `next`, `@auth/core`, `postcss`, `undici`, `sharp`, `valibot`. Residual (documented, deferred): `xlsx` (no fix — mitigation + `exceljs` plan), `nodemailer` (major bump planned; unreachable fields today), `prisma`/`deepmerge-ts` (build-time CLI only — ACCEPTED RISK). |
| MON-S1-018 | HIGH / OPEN | **FIXED** | Wildcard `Access-Control-Allow-Origin: *` on `/api/mobile/*` replaced with an env-driven exact-origin allowlist (`MOBILE_ALLOWED_ORIGINS`) that is *reflected only on match*, plus `Vary: Origin`. Native clients (no `Origin`) unaffected. Unit test (cluster 2 will add the e2e). |
| MON-S1-031 | MEDIUM / OPEN | **IN PROGRESS** | `src/lib/safe-redirect.ts` (`safeRedirectPath` / `safeRedirectUrl`) added + tested (blocks `//evil`, `https://evil`, `\`-tricks, CRLF, whitespace). Wiring into the NextAuth `redirect` callback and `callbackUrl`/`returnTo` consumers is cluster 4 (auth). |
| MON-S1-034 | MEDIUM / OPEN | **MITIGATED** | `src/lib/safe-fetch.ts` (protocol allowlist, IPv4/IPv6 private/loopback/link-local/CGNAT/metadata block, per-hop redirect re-validation, timeout + size cap, injectable resolver) added + tested. Wired into the one confirmed user-influenced server fetch (`communication/drive/actions.ts`). |
| MON-S1-035 | MEDIUM / OPEN | **PARTIALLY FIXED** | `src/lib/upload-validation.ts` (`validateUpload` + `assertSafeFileContent` + `sniffType`) added + tested. Portal document upload now runs a magic-byte + HTML/script-sniff check after the existing type/size gate. Rolling the helper across the other uploaders (CHA, HR, face, bank statements) + download-authz review is a later cluster. |
| MON-S1-036 | MEDIUM / OPEN | **FIXED** | `requireCronSecret()` no longer accepts `?secret=` — header/Bearer only. Test updated. |
| MON-S1-037 | MEDIUM / OPEN | **FIXED** | `/api/setup` no longer accepts `?secret=` — `x-setup-secret` / Bearer only. |
| §8 CSRF / request integrity | OPEN | **IN PROGRESS** | `src/lib/request-integrity.ts` (`checkRequestIntegrity` / `assertRequestIntegrity`: `Sec-Fetch-Site` + `Origin` allowlist, Bearer bypass) added + tested. Per-route wiring across mutating handlers is cluster 2/3. |

Verification for checkpoint 1: `npx tsc --noEmit` clean; new security unit
tests 38/38 green (`vitest.unit.config.ts`); `npm run build` green (497/497
static pages); ESLint clean on changed files (1 pre-existing `any` warning
untouched).

---

## 1. Architecture discovered

### 1.1 Stack

| Layer | Technology |
|---|---|
| Framework | Next.js **16.2.6** (App Router, Turbopack dev + build) |
| UI | React 19.2.4 |
| Auth | Auth.js / NextAuth **v5.0.0-beta.31**, JWT session strategy |
| ORM | Prisma **7.8.0** with `@prisma/adapter-pg` |
| DB | PostgreSQL |
| Password hash | `bcryptjs` 3.0.3 |
| Validation | Zod (partial coverage) |
| Tests | Vitest (unit/integration), Playwright (perf/security harness) |
| Mail | Pluggable: Resend or SMTP (nodemailer) |
| Deploy target | Vercel (serverless / Fluid Compute) + Docker option |

### 1.2 Identity & authentication subsystems (there are FOUR)

1. **Primary staff auth** — `src/lib/auth.ts` (NextAuth). Providers: `Credentials`
   (email + bcrypt) and `Google` (OAuth/OIDC). JWT carries only an opaque `sessionNonce`;
   the DB `UserSession` row is the source of truth for expiry/revocation
   (`src/lib/session-service.ts`). Login brute-force lockout in `src/lib/login-rate-limit.ts`.
   Security events written to `SecurityEvent` table.
2. **Customer portal auth** — `src/modules/customer-portal/auth.ts`. Separate
   `CustomerPortalSession` table, separate cookie (`PORTAL_COOKIE_NAME`), bcrypt passwords,
   own idle/absolute timeouts, own password policy.
3. **Mobile staff auth** — `src/lib/mobile-auth.ts` + `/api/mobile/auth/login`. Issues the
   **same `UserSession.token`** as a raw `Authorization: Bearer` credential. Reuses
   `validateSession()`, so it is centrally revocable.
4. **Mobile CRM auth** — `/api/mobile/crm/auth/login` (+ `src/lib/mobile-auth` helpers).

> Rule 4 of the stage brief ("do not create parallel authentication systems") is already
> partially violated by pre-existing code. These subsystems will be *consolidated onto one
> session core* rather than rewritten, and each must be brought under the same controls
> (rate limiting, event logging, step-up, revocation).

### 1.3 Authorization model

- RBAC in `src/lib/rbac.ts`: `User -> UserRole -> Role -> RolePermission -> Permission(key)`.
- Central helpers: `can()`, `canAll()`, `requirePermission()` (throws `ForbiddenError`),
  `loadCaps()` for client nav gating.
- Permission keys are expanded through a static `PERMISSION_COMPATIBILITY` map and an
  **implicit department-name-based grant** (`getDepartmentScopedPermissionKeys`) — see
  MON-S1-014.
- Permissions cached three layers deep (React `cache` -> `unstable_cache` 300 s -> process
  `Map` 5 min). Invalidation via `invalidateRbacCache()`.
- **No central tenant/org authorization helper exists.** Org scoping is done ad hoc with
  `where: { orgId: session.user.orgId }` sprinkled across ~20+ route files, and many
  routes were not confirmed to scope at all (see MON-S1-020, Section 12).

### 1.4 Request gate

- `src/proxy.ts` (Next.js 16 "proxy", formerly middleware). Matches almost every path.
- Public path allowlist; everything else requires **mere presence** of the session cookie
  (no signature/DB validation at the edge — that is deferred to the NextAuth `jwt` callback
  which runs in the route/RSC).
- Sets `Cache-Control: no-store`, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy` on authenticated responses.
- Wildcard CORS (`Access-Control-Allow-Origin: *`) for all `/api/mobile/*`.
- `next.config.ts headers()` adds a global CSP (with `unsafe-inline` + `unsafe-eval`) and
  `no-store` for `/api/*`. **No `Strict-Transport-Security` anywhere.**

### 1.5 Secrets

- `.env`, `.env.local` are git-ignored and were **never committed** (history scan clean).
- `.env.example` / `.env.staging.example` use placeholders only.
- Token-at-rest encryption keys exist: `GOOGLE_TOKEN_ENCRYPTION_KEY`, `FACE_ENCRYPTION_KEY`.
- Bootstrap/seed accounts are env-driven (`SETUP_SECRET`, `TEST_ADMIN_*`,
  `SPECIAL_ACCOUNTS_*`, `CUSTOMER_PORTAL_DEFAULT_PASSWORD`).
- **One hardcoded privileged identity in source:** `ROOT_CONTROL_EMAIL` in
  `src/lib/root-access.ts` (MON-S1-003).

### 1.6 External surfaces

- Google Workspace: Gmail, Calendar, Drive, Contacts, Directory, Tasks, **Google Chat**
  (bot webhook at `/api/google-chat/webhook`, bearer-token verified).
- Cron endpoints under `/api/cron/*` — shared-secret (`CRON_SECRET`) via
  `requireCronSecret()`.
- Reverse-geocode call in `/api/hrms/work-reports/location`.
- Optional browser automation (`BROWSERLESS_URL`, `PLAYWRIGHT_SERVICE_URL`).
- External document automation service (`DOCUMENT_AUTOMATION_URL` + bearer).
- ESSL biometric SQL Server connection (`ESSL_DATABASE_URL`).
- `xlsx` import/export.

### 1.7 Data access

- `$queryRaw` / `$executeRaw` used in 12 app files — **all tagged-template (parameterized)**.
- **No `$queryRawUnsafe` / `$executeRawUnsafe` anywhere in application code.** (Only in
  generated Prisma client + its doc comments.)
- `dangerouslySetInnerHTML`: 4 sites — 2 DOMPurify-sanitised, 1 static bootstrap script,
  1 raw org-theme CSS injection (MON-S1-016).

---

## 2. CRITICAL findings

### MON-S1-001 — Next.js middleware/proxy auth bypass (known CVE, Turbopack + App Router)
- **Files/routes:** `src/proxy.ts`, entire app; `next@16.2.6`.
- **Vulnerability:** `npm audit` reports *"Next.js: Middleware / Proxy bypass in App Router
  applications using Turbopack and single locale"* (HIGH advisory) against the pinned
  `next@16.2.6`. This project builds and runs with Turbopack and relies on `proxy.ts` as
  the first-line auth redirect. Auth.js `@auth/core` also has a **CRITICAL** advisory
  (*homoglyph `@` bypass in the email normalizer*) affecting `next-auth@5.0.0-beta.31`.
- **Attack scenario:** Attacker crafts a request that the vulnerable proxy matcher fails to
  intercept, reaching a protected RSC/route without the redirect. Independently, an attacker
  registers/loads an account using a homoglyph in the email domain that normalises to a
  victim's address after the check, enabling enumeration or unintended account linking.
- **Business impact:** Unauthenticated access to authenticated pages; account-takeover
  primitive via OAuth/local linking. Enterprise-wide data exposure.
- **Severity:** CRITICAL (chained).
- **Remediation:**
  1. Upgrade `next` to the patched 16.2.x release; re-run `npm audit`.
  2. Upgrade `next-auth` / `@auth/core` to the patched release (still v5 line to avoid a
     breaking migration) OR pin `@auth/core` via `overrides` to the fixed patch.
  3. Add defence-in-depth: never rely on `proxy.ts` alone — every protected route/RSC/server
     action must independently resolve the session server-side (see MON-S1-010).
- **Status:** OPEN.
- **Verification test:** `src/__tests__/security/next-proxy-bypass.test.ts` — assert audit
  is clean for `next` + `@auth/core`; e2e test hitting a protected path with the known
  bypass shapes returns 302 to `/login`.

### MON-S1-002 — MFA / 2FA is a non-functional stub
- **File:** `src/lib/auth.ts:89-92` (`verifySecondFactor()` returns `true` unconditionally);
  UI route `src/app/(dashboard)/admin/passkeys` exists but no enforcement path.
- **Vulnerability:** There is no second factor. Password (or a single Google login) is the
  only barrier. No TOTP, no recovery codes, no step-up re-auth, no org "require MFA" policy,
  no mandatory MFA for platform admins.
- **Attack scenario:** Any credential phish / password reuse / stolen Google session grants
  full account access with no additional challenge, including for platform administrators.
- **Business impact:** Fails the stage brief's explicit MFA requirement and ASVS L2
  (`2.8`, `2.9`). Single-factor compromise = full tenant compromise.
- **Severity:** CRITICAL (for an enterprise target).
- **Remediation:** Implement TOTP MFA (RFC 6238) with encrypted-at-rest secrets, one-time
  hashed recovery codes, enforced enrolment challenge, step-up re-auth for sensitive
  operations, org-level "require MFA", mandatory MFA for `isPlatformAdmin`. Architect
  `AuthenticationFactor` so WebAuthn can be added later.
- **Status:** OPEN.
- **Verification test:** `src/__tests__/security/mfa/*.test.ts` — enrolment requires valid
  OTP; login with MFA-enabled account without OTP is denied; recovery code is single-use;
  disabling MFA without step-up is denied.

### MON-S1-003 — Hardcoded privileged "root control" identity in source
- **File:** `src/lib/root-access.ts:1` — `ROOT_CONTROL_EMAIL = "obj268version4@gmail.com"`.
- **Vulnerability:** A specific Gmail address is granted special redirect/root treatment
  (`redirectPath = "/"`, referenced from `src/lib/auth.ts:208`). Anyone who controls or
  registers that mailbox — or an attacker who can create a `User` with that email — gets
  elevated handling. It is also an information leak (names a real backdoor account).
- **Attack scenario:** Insider or attacker with DB write (or the account owner) authenticates
  as this identity for privileged behaviour that is invisible to org administrators.
- **Business impact:** Undocumented backdoor; violates least privilege and the "no hardcoded
  credentials / no dev bypass" rule.
- **Severity:** CRITICAL.
- **Remediation:** Remove the hardcoded email. Replace with an explicit, auditable
  `PlatformRole` / `isPlatformAdmin` + MFA. If a break-glass identity is required, make it
  env-configured, MFA-mandatory, and fully `SecurityEvent`-audited.
- **Status:** OPEN.
- **Verification test:** grep guard test asserting no email literal in `src/lib/**`;
  behaviour test that redirect/authz derives only from DB role + policy.

---

## 3. HIGH findings

### MON-S1-010 — Edge gate checks only cookie *presence*, not validity; routes vary in re-check
- **File:** `src/proxy.ts:116-127`.
- **Vulnerability:** `proxy.ts` redirects to `/login` only when the session cookie is
  absent. A present-but-invalid/forged/expired cookie passes the edge; actual validation is
  deferred to the NextAuth `jwt` callback, which only runs for code paths that call
  `auth()`/`getSession()`. Route handlers that never call the session helper (some
  `/api/*`, some `/api/mobile/*`) do their own checks — coverage is inconsistent
  (239 of 297 route files reference an auth/permission helper; the remaining 58 were only
  partially confirmed — Section 12).
- **Attack scenario:** Attacker with any non-empty value in the session cookie reaches a
  route handler that assumed the proxy already authenticated the request.
- **Business impact:** Authorization bypass on an unknown subset of endpoints.
- **Severity:** HIGH.
- **Remediation:** Introduce a single `requireSession()` / `requireApiActor()` gate used by
  **every** route handler and server action; deny-by-default. Add a build-time lint/test
  that fails if a route file under `src/app/api` or a `"use server"` file does not import
  the gate. Keep `proxy.ts` as UX redirect only.
- **Status:** OPEN.
- **Verification test:** `src/__tests__/security/route-guard-coverage.test.ts` enumerates
  every route/action file and asserts the gate import; negative e2e with a garbage cookie.

### MON-S1-011 — Rate limiting is in-process only; ineffective on Vercel/multi-instance
- **Files:** `src/lib/security.ts` (`rateBuckets` Map), `src/lib/login-rate-limit.ts`
  (`buckets` Map).
- **Vulnerability:** All rate limiting / brute-force lockout state lives in a per-process
  `Map`. On Vercel serverless / Fluid Compute (and any horizontally-scaled deploy) requests
  are spread across many short-lived instances, so an attacker trivially exceeds any limit
  and lockout rarely triggers. Login, forgot-password, MFA-verify (once added), portal
  upload, invitations, etc. are all affected.
- **Attack scenario:** Distributed or simply rapid credential-stuffing / OTP-guessing that
  never hits a shared counter.
- **Business impact:** Brute force, credential stuffing, OTP brute force, mail-bomb via
  forgot-password, resource exhaustion. Fails ASVS `11.x` / stage brief §18.
- **Severity:** HIGH.
- **Remediation:** Move counters to a shared store (Vercel KV / Upstash Redis / Postgres
  table with atomic upserts) behind one `rateLimit()` interface; key by account + IP +
  route + operation; controlled exponential backoff (no permanent lock); CAPTCHA extension
  point past a threshold.
- **Status:** OPEN.
- **Verification test:** `src/__tests__/security/rate-limit.test.ts` with a simulated
  multi-instance store; asserts Nth attempt is throttled regardless of instance.

### MON-S1-012 — `validateSession()` fails **open** on DB error
- **File:** `src/lib/session-service.ts:298-302` — `catch { return { valid: true } }`.
- **Vulnerability:** Any error during session validation (DB blip, pool exhaustion, an
  attacker-induced error) is treated as a valid session.
- **Attack scenario:** Attacker who can degrade the DB (e.g. via the unthrottled expensive
  endpoints, MON-S1-011) converts outages into an auth-check bypass for revoked/expired
  sessions.
- **Business impact:** Revoked/expired sessions become usable during incidents; undermines
  central revocation guarantee.
- **Severity:** HIGH.
- **Remediation:** Fail closed. On transient DB error, return invalid (or a short
  `RETRY` state that forces re-auth) and alert. Add a circuit-breaker metric.
- **Status:** OPEN.
- **Verification test:** unit test mocking `db.userSession.findUnique` to throw -> expect
  `{ valid: false }`.

### MON-S1-013 — OAuth account linking by email match, without proof of ownership
- **File:** `src/lib/auth.ts:225-278` (`signIn` callback) + `jwt` callback `:293-304`.
- **Vulnerability:** Google sign-in resolves the local `User` purely by
  `email == token.email` (case-insensitive). There is no `Account` table linking a verified
  Google `sub` to the user; linking is implicit and email-based. `signIn` does require the
  user to be pre-provisioned and active, and does not currently check
  `profile.email_verified` or enforce `GOOGLE_WORKSPACE_DOMAIN`.
- **Attack scenario:** If an attacker can get a Google account whose email equals a
  provisioned user's email (or exploits the `@auth/core` homoglyph CVE, MON-S1-001), they
  authenticate as that user. Absent `email_verified` enforcement, a Google tenant that does
  not verify emails becomes a linking oracle.
- **Business impact:** Account takeover / unsafe linking — explicitly called out in the
  stage brief (§1, §2).
- **Severity:** HIGH.
- **Remediation:** Add an `Account` / `IdentityProvider` model keyed by
  `(provider, providerAccountId=sub)`. Require `profile.email_verified === true`. Enforce
  `hd` / allowed-domain policy per org. Linking an OAuth identity to an existing local user
  must require an authenticated session or an emailed verification, never a bare email match.
- **Status:** OPEN.
- **Verification test:** `src/__tests__/security/oauth-linking.test.ts` — unverified-email
  profile denied; `sub` mismatch on an already-linked account denied; cross-domain denied.

### MON-S1-014 — Implicit privilege grant from free-text department name
- **File:** `src/lib/rbac.ts:170-214` (`getDepartmentScopedPermissionKeys`).
- **Vulnerability:** Any user whose `department.code`/`name` normalises to
  `accounts`/`accounting`/`acccounts` **and** whose role name is `manager` or `director`
  is auto-granted the **entire** `ACCOUNTING_FULL_PERMISSION_BUNDLE` (58 permissions incl.
  approvals, posting, settings) with no explicit `RolePermission` rows and no audit trail.
- **Attack scenario:** An org admin (or anyone able to edit a department name or a role
  name — common HR operations) renames a department to "Accounts" or a role to "Manager"
  and silently obtains full accounting authority, including approve/post of financial
  transactions. Also a typo (`acccounts`) is deliberately honoured, showing the check is
  fragile by design.
- **Business impact:** Silent privilege escalation over financial data; segregation-of-duties
  failure; invisible to permission audits.
- **Severity:** HIGH.
- **Remediation:** Remove name-based implicit grants. Model accounting access as explicit
  permissions on explicit roles. If department-scoped defaults are wanted, express them as
  named policies with `SecurityEvent` logging on assignment.
- **Status:** OPEN.
- **Verification test:** `src/__tests__/security/rbac-no-implicit-grant.test.ts` — user in
  "Accounts"/"Manager" with zero accounting `RolePermission` rows has zero accounting caps.

### MON-S1-015 — No `Strict-Transport-Security`; CSP allows `unsafe-inline` + `unsafe-eval`
- **Files:** `next.config.ts:46-64`, `src/proxy.ts:144-160`.
- **Vulnerability:** No HSTS header is emitted anywhere. The global CSP permits
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'` and `style-src 'self' 'unsafe-inline'`,
  which neutralises CSP as an XSS defence. `frame-ancestors 'none'` and `object-src 'none'`
  are good; `img-src`/`connect-src` allow `https:` broadly.
- **Attack scenario:** SSL-stripping / first-request MITM (no HSTS). Any reflected/stored
  HTML-injection is directly exploitable because inline script is allowed.
- **Business impact:** Weakens transport security and every XSS finding's blast radius.
- **Severity:** HIGH.
- **Remediation:** Add `Strict-Transport-Security: max-age=63072000; includeSubDomains;
  preload` (prod only). Move to a nonce/hash-based CSP; remove `unsafe-eval`; remove
  `unsafe-inline` for scripts (keep for styles only if unavoidable, tracked). Tighten
  `connect-src`/`img-src` to known origins. Verify against the running app, not just config.
- **Status:** OPEN.
- **Verification test:** `scripts/verify-security-headers.mjs` hits a running instance and
  asserts header values; Playwright security spec asserts no CSP violations on core pages.

### MON-S1-016 — Raw org-theme CSS injected into `<style>` (stored XSS / CSS injection)
- **File:** `src/app/(dashboard)/layout.tsx:54-58` — `paletteOverrideCss` set via
  `dangerouslySetInnerHTML` with no escaping; compounded by the **HIGH `postcss` advisory**
  *"XSS via unescaped `</style>` in CSS stringify output"*.
- **Vulnerability:** If `paletteOverrideCss` is derived from org-admin-configurable palette
  values without strict `#rrggbb` validation, an admin can inject `</style><script>…` or
  CSS exfiltration/UI-redress payloads that execute for every user in the org.
- **Attack scenario:** Malicious or compromised org admin sets a palette token to a
  breakout string; every org member's dashboard executes attacker script.
- **Business impact:** Org-wide stored XSS from a lower-trust actor (org admin should not be
  able to run script in other users' browsers).
- **Severity:** HIGH (pending confirmation of the value source — see Section 12).
- **Remediation:** Validate every palette value against a strict colour grammar
  (`#[0-9a-fA-F]{3,8}` / `rgb()` / named) server-side before persistence and before render;
  build the CSS from a fixed template with only validated tokens interpolated; add CSP
  nonce so injected `<script>` cannot run.
- **Status:** OPEN.
- **Verification test:** `src/__tests__/security/theme-css-injection.test.ts` — palette
  value `red;}</style><script>alert(1)</script>` is rejected / rendered inert.

### MON-S1-017 — Vulnerable production dependencies (2 critical, 12 high)
- **File:** `package.json` / `package-lock.json`.
- **Vulnerability:** `npm audit --omit=dev` -> 18 vulns (4 moderate, 12 high, 2 critical).
  Notable: `@auth/core`/`next-auth` (CRITICAL homoglyph), `next` (HIGH proxy bypass),
  `nodemailer` (HIGH SMTP command injection via `envelope.size`), `postcss` (HIGH
  `</style>` XSS), `xlsx` (HIGH prototype pollution + ReDoS, **no fix available**),
  `sharp`/libvips (HIGH image CVEs), `undici` (HIGH response desync), `hono`/`fast-uri`
  (HIGH).
- **Attack scenario:** Each is independently exploitable given the features that use them
  (OAuth, proxy, outbound mail, CSS, spreadsheet import, image processing).
- **Business impact:** Multiple pre-authenticated / post-authenticated compromise vectors.
- **Severity:** HIGH (aggregate; individual criticals tracked in MON-S1-001).
- **Remediation:** Intentional dependency remediation plan (do not blind-bump majors):
  patch-bump `next`, `@auth/core`, `nodemailer`, `postcss`, `undici` (via `overrides` if
  needed); replace or sandbox `xlsx` (evaluate `exceljs`, or move parsing to an isolated
  worker with `Object.freeze(Object.prototype)` hardening and size/time limits); bump
  `sharp`. Add `npm audit --omit=dev` as a CI gate that fails on critical/high.
- **Status:** OPEN.
- **Verification test:** CI job `security:audit` fails build on unresolved critical/high;
  `SECURITY_AUDIT_AFTER_STAGE1.md` records the diff.

### MON-S1-018 — Wildcard CORS on `/api/mobile/*`
- **File:** `src/proxy.ts:38-43, 86-88, 106-110`.
- **Vulnerability:** `Access-Control-Allow-Origin: *` with
  `Access-Control-Allow-Headers: Authorization` for every mobile API. Credentials are
  bearer tokens (not cookies), so this is not a classic credentialed-CORS hole, but it
  still lets any website script the mobile API on behalf of a user who pastes/leaks a token,
  and broadens the attack surface for token-handling bugs.
- **Attack scenario:** A malicious page calls mobile endpoints directly; combined with any
  token leak (logs, deep links) it acts as the user.
- **Business impact:** Expanded CSRF-like surface for token-bearing clients; data
  read/write from arbitrary origins.
- **Severity:** HIGH.
- **Remediation:** Replace `*` with an explicit allowlist (the mobile app's WebView origin
  / `null` for native, plus known dev origins). Never combine `*` with `Allow-Credentials`.
  Add `Vary: Origin`. Reflect only allowlisted origins.
- **Status:** OPEN.
- **Verification test:** `src/__tests__/security/cors.test.ts` — request with
  `Origin: https://evil.example` gets no ACAO header.

### MON-S1-019 — Mobile & portal endpoints parse request bodies without a schema (mass assignment)
- **Files (examples):** `src/app/api/mobile/hrms/attendance/check-in/route.ts:20-35`
  (`const { faceDescriptor, deviceId } = body` on raw `await request.json()`), plus most
  `/api/mobile/*` handlers; several `/api/customer-portal/*` handlers read
  `formData.get(...)` directly.
- **Vulnerability:** No Zod (or equivalent) DTO. Untrusted fields flow into service calls;
  wherever a service does `data: { ...input }` into Prisma, attacker-controlled properties
  (`orgId`, `role`, `approved`, `status`, ownership ids, monetary fields) can be injected.
- **Attack scenario:** Client posts `{ orgId: "<victim-org>", status: "APPROVED", ... }` to
  an endpoint whose service spreads the body.
- **Business impact:** Cross-tenant writes, privilege/state escalation, financial tampering.
- **Severity:** HIGH (confirmed pattern; exact spread sites pending Section 12 sweep).
- **Remediation:** Every handler parses input through an explicit Zod schema listing only
  permitted fields; server derives `orgId`/ownership from the session, never the body;
  ban `data: body` / `data: { ...input }` via lint rule.
- **Status:** OPEN.
- **Verification test:** per-endpoint negative tests posting forbidden fields; a static
  check flagging object-spread into Prisma `data`.

---

## 4. MEDIUM findings

### MON-S1-030 — Google **access token** stored in plaintext at rest
- **File:** `src/lib/auth.ts:253-275` — `GoogleWorkspaceConnection.accessToken` written
  raw; only `refreshToken` is `encryptToken(...)`-wrapped.
- **Impact:** DB read (backup leak, SQLi elsewhere, insider) yields live Google access
  tokens (Gmail/Drive/Calendar/Chat scopes) until expiry (~1 h).
- **Severity:** MEDIUM.
- **Remediation:** Encrypt `accessToken` with the same authenticated-encryption path as the
  refresh token (`GOOGLE_TOKEN_ENCRYPTION_KEY`), or don't persist it (re-mint from the
  refresh token on demand). Never log either.
- **Status:** OPEN.
- **Verification test:** unit test asserts the persisted column is ciphertext (no `ya29.`
  prefix).

### MON-S1-031 — `redirectPath` / `callbackUrl` open-redirect surface
- **Files:** `src/lib/auth.ts:208` (`redirectPath`), `src/proxy.ts:121-125`
  (`callbackUrl` from raw `pathname`), NextAuth default redirect handling.
- **Impact:** No central allowlist for post-login / post-action redirect targets was found.
  `callbackUrl` is currently set from `pathname` (path-only) which is safe, but there is no
  `redirect` callback clamping absolute URLs, and other flows (invite, verify, portal) build
  links from config — needs a single safe-redirect helper.
- **Severity:** MEDIUM.
- **Remediation:** Add `safeRedirect(target)` that permits only same-origin absolute-path
  targets (or an explicit origin allowlist); use it in the NextAuth `redirect` callback and
  every `?returnTo/next/callbackUrl` consumer.
- **Status:** OPEN.
- **Verification test:** `redirect` callback test rejecting `https://evil.example` and
  `//evil.example`.

### MON-S1-032 — Password-reset / link building trusts app-URL config; confirm no Host-header use
- **Files:** `src/modules/customer-portal/auth.ts` (`buildPortalLink` -> `getAppUrl()`),
  `src/lib/app-url.ts` (not yet read), staff password-reset flow (not yet located —
  Section 12).
- **Impact:** If any reset/verify link is built from the request `Host`/`X-Forwarded-Host`
  rather than a trusted configured origin, an attacker poisons reset links. `getAppUrl()`
  appears config-based (good) but must be verified; `proxy.ts` sets `trustHost: true` in
  NextAuth which is risky behind an untrusted proxy.
- **Severity:** MEDIUM (pending confirmation).
- **Remediation:** All security emails use `APP_URL` only. Set `trustHost` explicitly and
  document the required trusted-proxy config; strip/verify `X-Forwarded-Host`.
- **Status:** OPEN.
- **Verification test:** send-reset test with spoofed `Host` header asserts link origin ==
  `APP_URL`.

### MON-S1-033 — Forgot-password response / timing enumeration not verified
- **Files:** `src/app/api/customer-portal/auth/forgot-password/route.ts`; staff flow TBD.
- **Impact:** Stage brief §4 requires a generic response that does not reveal account
  existence / Google-only status / employee existence, plus constant-ish timing. Not yet
  verified for either flow.
- **Severity:** MEDIUM.
- **Remediation:** Always return the same body + status; do the same amount of work
  (dummy bcrypt) on the "no such user" path; rate-limit per email + IP (shared store).
- **Status:** OPEN.
- **Verification test:** known vs unknown email produce byte-identical responses; timing
  delta within tolerance.

### MON-S1-034 — SSRF surface: `fetch(currentFileKey)` and reverse-geocode passthrough
- **Files:** `src/app/(dashboard)/communication/drive/actions.ts:84`
  (`fetch(currentFileKey)`), `src/app/api/hrms/work-reports/location/route.ts:58`.
- **Impact:** If `currentFileKey` can be an arbitrary URL (vs. a Google Drive file id),
  server will fetch attacker-chosen destinations (metadata endpoint, internal services).
  Reverse-geocode passes user lat/lng into a fixed external URL (lower risk) but has no
  timeout/allowlist shown.
- **Severity:** MEDIUM (pending confirmation of `currentFileKey` provenance).
- **Remediation:** Central `safeFetch()` with protocol allowlist (`https:` only), DNS
  resolution + private/loopback/link-local/metadata IP block, redirect capping, timeout,
  size cap; Drive access via the Drive client + file-id validation, never raw URL.
- **Status:** OPEN.
- **Verification test:** `safeFetch("http://169.254.169.254/…")` and
  `http://localhost/…` rejected; DNS-rebinding case covered.

### MON-S1-035 — File upload validation depth unverified (portal + CHA + HR + face + bank statements)
- **Files:** `src/app/api/customer-portal/documents/upload/route.ts`,
  `src/modules/customer-portal/service.ts` (`uploadPortalDocument`), CHA doc uploads,
  `/api/mobile/hrms/face/enroll`, `ACCOUNTING_BANK_STATEMENT_UPLOAD_ROOT`,
  `CUSTOMER_PORTAL_UPLOAD_ROOT`.
- **Impact:** Confirmed present: auth + IP rate-limit + filename sanitisation
  (`sanitizeFilename`) + `resolveInside()` path-traversal guard. NOT confirmed: max size,
  extension allowlist, MIME check, **magic-byte content validation**, non-executable
  storage, authz on download for every download route, malware-scan hook.
- **Severity:** MEDIUM.
- **Remediation:** Shared `validateUpload()` — size cap, type allowlist, magic-byte sniff
  (`file-type`), reject on mismatch, random storage names (already partly done), store
  outside web root, per-object authz on download, AV-scan extension point.
- **Status:** OPEN.
- **Verification test:** upload `evil.pdf` that is really a PHP/HTML/SVG-script payload ->
  rejected; download of another org's object -> 403.

### MON-S1-036 — Cron endpoints accept the secret in the query string
- **File:** `src/lib/security.ts:36-51` (`requireCronSecret` reads
  `url.searchParams.get("secret")`).
- **Impact:** Secrets in URLs leak via access logs, proxies, `Referer`, browser history.
- **Severity:** MEDIUM.
- **Remediation:** Accept the secret only via header (`Authorization: Bearer` /
  `x-cron-secret`); drop the query-param path. Vercel Cron sends the header.
- **Status:** OPEN.
- **Verification test:** query-param-only request -> 401; header request -> 200.

### MON-S1-037 — Same finding class for `/api/setup` secret via query param
- **File:** `src/app/api/setup/route.ts:27` — `req.nextUrl.searchParams.get("secret")`.
- **Remediation:** Header-only; keep the "admin already exists -> 403" guard (present).
- **Severity:** MEDIUM. **Status:** OPEN.
- **Verification test:** query-param secret rejected in production mode.

### MON-S1-038 — `X-Frame-Options` set, but no per-response CSP `frame-ancestors` except one route
- **Files:** `src/proxy.ts:146-160`, `next.config.ts:51` (global CSP has
  `frame-ancestors 'none'` — good), HR letter preview relaxes to `SAMEORIGIN`.
- **Impact:** Global CSP `frame-ancestors 'none'` largely covers this; verify the
  `next.config.ts` CSP actually reaches every response (it should) and that the HR letter
  preview relaxation is intentional and scoped.
- **Severity:** LOW→MEDIUM (verification item).
- **Status:** OPEN.

### MON-S1-039 — Portal password policy uses composition rules (NIST 800-63B discourages)
- **File:** `src/modules/customer-portal/auth.ts:56-70` (`validatePortalPassword`).
- **Impact:** Minor UX/security-hygiene: forces character classes, tiny hardcoded
  common-password set. Brief §3 asks for length-based policy + breach-list blocking, no
  arbitrary composition rules.
- **Severity:** LOW.
- **Remediation:** Length-first (>=12, high max, allow paste/Unicode), check against a real
  breached-password list (k-anonymity HIBP range API or bundled top-N), drop class rules.
  Unify with staff password policy.
- **Status:** OPEN.

---

## 5. LOW findings

### MON-S1-050 — `/api/setup` GET leaks `setupNeeded` boolean unauthenticated
- Minor info disclosure (whether the instance is un-provisioned). Acceptable if setup is
  hard-gated; consider removing after first run. **Status:** OPEN.

### MON-S1-051 — `validatedSessionCache` (5 s) delays revocation propagation
- Revocation / disable can lag up to 5 s per instance. Acceptable trade-off; document it and
  make it configurable. **Status:** ACCEPTED RISK (pending sign-off).

### MON-S1-052 — `deviceLabel` / `maskIp` are best-effort; `x-forwarded-for` fully trusted
- `extractRequestMeta` / `getClientIp` take the first `X-Forwarded-For` hop verbatim. Behind
  an unknown number of proxies this is spoofable, affecting rate-limit keys and audit IPs.
- **Remediation:** Configure trusted proxy hop count; on Vercel use `x-vercel-forwarded-for`
  / the platform-provided client IP. **Status:** OPEN.

### MON-S1-053 — `ChatGPT Installer.exe` (815 KB) committed to repo root
- Unrelated binary in source control (supply-chain / repo-hygiene smell). Confirm provenance
  and remove; add `*.exe` to `.gitignore`. **Status:** OPEN.

### MON-S1-054 — `console.error` used for security-relevant failures
- Session/mail/webhook errors go to `console.error` with raw error objects
  (`detail: String(err)` returned to client in the Google Chat webhook 500 path,
  `src/app/api/google-chat/webhook/route.ts:22`). Risk of internal detail leak in responses
  and unstructured logs.
- **Remediation:** Structured logger, correlation IDs, never echo `String(err)` to clients
  in production (brief §28). **Status:** OPEN.

---

## 6. INFORMATIONAL

- **INFO-1:** No `Account` / `AuthenticationFactor` / `RecoveryCode` / `PasswordResetToken`
  (staff) / `EmailVerification` models confirmed in the identity layer yet — needed for
  Stage 1 sections 1, 4, 5, 6. (11.4k-line `schema.prisma` still to be fully mapped —
  Section 12.)
- **INFO-2:** `trustHost: true` in NextAuth — acceptable on Vercel (platform sets Host) but
  must be paired with documented trusted-proxy assumptions for Docker/self-host.
- **INFO-3:** Security event enum (`SecurityEventType`) covers auth/session events but not
  role/permission changes, admin creation, policy changes, API-credential changes — brief
  §21 wants those.
- **INFO-4:** Playwright "performance-security" harness exists
  (`scripts/playwright-performance-security.mjs`) — extend it for DAST-style header/redirect
  checks.
- **INFO-5:** `isDebugRouteEnabled()` gates debug routes on `ENABLE_DEBUG_ROUTES` — audit
  every consumer to ensure it is never true in prod and that no debug route exposes data.
- **INFO-6:** `next.config.ts serverActions.bodySizeLimit: "10mb"` — global; large-upload
  endpoints should validate size themselves too.

---

## 7. Cross-tenant / IDOR status (preliminary)

A full BOLA sweep of all 297 API routes + 77 server-action files + all dynamic
`[id]` pages is **pending** (Section 12). What is known:

- There is **no central tenant guard**; org scoping is manual and inconsistent.
- Several `/api/*` routes filter by `orgId: session.user.orgId` (good pattern, e.g.
  `hrms/employees`, `hrms/letters/[id]`, `cha/documents/[id]`).
- Routes that load an object by `params.id` and then check org **after** fetch, or not at
  all, are the risk set. Confirmed candidates to review first:
  `cha/checklist-files/[id]`, `cha/customer-documents/[id]`, `cha/documents/[id]`,
  `cha/expense-artifacts/[...path]`, `hrms/files/[id]/download`,
  `customer-portal/document-versions/[id]`, `customer-portal/checklist-files/[id]`,
  `customer-portal/documents/[versionId]`, all `accounting/**/[id]` pages.
- Accounting module already added tenant-guard migrations
  (`*_tenant_guard_fix`, `*_contract_guards`) — evidence the risk is real and partially
  addressed there; other modules likely lag.

Remediation (Stage 1 §9/§10): a `withTenant(session)` Prisma helper that injects `orgId`
into every query, a typed `assertSameOrg(obj)` used after every by-id fetch, and an
automated cross-tenant test matrix (Company A token vs every Company B object type).

---

## 8. CSRF status (preliminary)

- NextAuth v5 has its own CSRF token for its endpoints (`CSRF_COOKIE_NAME` configured,
  `__Host-` prefixed in prod).
- **Server Actions**: Next.js adds Origin checking for actions, but this must be verified
  for the deployed config, and any state-changing plain `POST` route handler needs explicit
  Origin / Fetch-Metadata (`Sec-Fetch-Site`) checks.
- Cookies are `SameSite=Lax` — protects top-level cross-site POST but not all cases.
- **Action:** add a shared `assertRequestIntegrity(req)` (Origin allowlist + `Sec-Fetch-Site
  in {same-origin, same-site, none-for-navigation}`) to every mutating route handler; keep
  SameSite=Lax; document why per-form CSRF tokens are/aren't additionally needed.
- **Status:** OPEN (verification + helper).

---

## 9. Secrets status

| Check | Result |
|---|---|
| `.env*` committed to git (any point in history) | **No** (clean) |
| Secret-shaped strings in tracked files (`AIza…`, `sk-…`, PEM, `xoxb-`, `re_…`) | **None found** |
| `.env.example` / `.env.staging.example` placeholders only | Yes |
| Hardcoded credential/identity in source | **Yes** — `ROOT_CONTROL_EMAIL` (MON-S1-003) |
| Encryption keys separated from data | Yes (`GOOGLE_TOKEN_ENCRYPTION_KEY`, `FACE_ENCRYPTION_KEY`) |
| Dev/test/staging/prod credential separation | Partial — staging env plumbing exists; document prod isolation |

**Rotation note:** if any real value currently in a developer's local `.env` was ever shared
via chat/screenshare/CI logs, treat as exposed and rotate (`AUTH_SECRET`, `AUTH_GOOGLE_SECRET`,
`RESEND_API_KEY`, `SMTP_PASS`, `GOOGLE_TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`, DB URL). This
cannot be verified from the repo.

---

## 10. Dependency status

`npm audit --omit=dev`: **4 moderate, 12 high, 2 critical** (see MON-S1-017). `next-auth` is
on a **beta** (`5.0.0-beta.31`) — brief calls for explicit review; stay on the v5 line,
take the latest beta/RC with the `@auth/core` fix, add a CI SCA gate.

---

## 11. Positive controls already in place (do not regress)

- Opaque server-side sessions with per-request DB validation + lazy expiry + audit events.
- `__Host-`-prefixed, `HttpOnly`, `SameSite=Lax`, `Secure` (prod) session/CSRF/callback
  cookies, Monolith-namespaced.
- Idle + absolute session timeouts, admin-specific shorter idle, remember-me bounded.
- Active-session inventory, revoke-one, revoke-all-others, revoke-on-logout.
- Login brute-force lockout (email+IP keyed) — logic correct, store weak (MON-S1-011).
- `SecurityEvent` table + `logSecurityEvent()` with IP masking + token hashing (never raw).
- bcrypt cost 12 for new hashes (setup, portal).
- Parameterised DB access only; no `*Unsafe` raw queries.
- DOMPurify on the two genuine HTML-render sites.
- `sanitizeFilename` + `resolveInside` (path-traversal guard) + `contentDisposition`.
- Global CSP with `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`.
- Cron + setup shared-secret gates; Google Chat webhook bearer verification.
- Encrypted-at-rest Google **refresh** tokens.

---

## 12. Areas still requiring a deeper sweep before remediation sign-off

1. **Full `schema.prisma` map** (11,422 lines) — enumerate every tenant-owned model and
   whether `orgId` is present + indexed + in uniqueness constraints.
2. **All 297 API route handlers** — per-route: auth gate? permission check? org scope on
   every query? by-id object ownership check? input schema? — produce a coverage matrix.
3. **All 77 `"use server"` files** — same matrix; confirm Next.js action Origin protection
   for the deployed config.
4. **All dynamic `[id]` / `[...path]` pages** under `src/app/(dashboard)` — IDOR on the
   RSC data-loading path.
5. **`getAppUrl()` / `src/lib/app-url.ts` / `trustHost`** — confirm no Host-header trust in
   any link-building or redirect path.
6. **Staff password-reset flow** — locate it (not found in first pass), audit token
   entropy/hashing/expiry/single-use/enumeration/session-invalidation.
7. **`paletteOverrideCss` source** — confirm whether org-admin input reaches it unvalidated
   (sets MON-S1-016 final severity).
8. **`communication/drive/actions.ts` `currentFileKey`** provenance (SSRF, MON-S1-034).
9. **Every file-download route** — authz-on-download for each upload feature.
10. **`xlsx` import call sites** — payload size/time limits, prototype-pollution exposure.
11. **`$queryRaw` tagged-template call sites (12 files)** — confirm no string concatenation
    smuggled into the template and no dynamic identifier interpolation.
12. **ESSL SQL Server integration** — connection string handling, query construction.
13. **`isDebugRouteEnabled()` / `ENABLE_DEBUG_ROUTES` consumers** — enumerate, confirm
    prod-safe.
14. **Email flows** (`nodemailer` command-injection advisory) — confirm no user input flows
    into `envelope`.
15. **Platform-admin vs org-admin separation** — is there any impersonation/support-access
    path? (`admin/simulation` route seen — audit it.)

---

## 13. Remediation order for Stage 1 (agreed)

1. **Request-integrity layer** — headers/HSTS/CSP hardening, XSS (theme CSS), CSRF/Origin
   helper, SSRF `safeFetch`, upload `validateUpload`, mass-assignment schemas + lint.
   (MON-S1-015, 016, 018, 019, 034, 035, 036, 037, 038, 054; dep patches from 017.)
2. **Authorization bypass** — single `requireSession()` / `requireApiActor()` gate + route
   coverage test, remove `ROOT_CONTROL_EMAIL`, remove implicit dept grant, fail-closed
   session validation. (MON-S1-003, 010, 012, 014.)
3. **Tenant isolation / IDOR** — `withTenant()` + `assertSameOrg()`, cross-tenant test
   matrix, schema `orgId` constraints. (Section 7; MON-S1-019 overlap.)
4. **Auth / session / MFA** — TOTP MFA + recovery codes + step-up, `Account`/identity model
   + safe OAuth linking + `email_verified`, staff password-reset hardening, shared-store
   rate limiting, session rotation on privilege change. (MON-S1-002, 011, 013, 030, 031,
   032, 033, 039.)

Each cluster ends with: passing negative tests, `npm run lint` + typecheck + build green,
a checkpoint commit, and a status update in this file.

---

*End of SECURITY_AUDIT_BEFORE_STAGE1 (first pass).*

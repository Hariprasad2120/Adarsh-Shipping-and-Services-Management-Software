# SECURITY_DEPLOYMENT_CHECKLIST

Run through this before promoting Monolith to a production (or shared staging)
environment. `[ ]` = must be done; `[i]` = verify / informational.

---

## 1. Secrets & keys

- [ ] `AUTH_SECRET` — unique 32+ byte random value **per environment**
      (dev / test / staging / prod are all different). Never the `.env.example`
      placeholder.
- [ ] `MFA_ENCRYPTION_KEY` — 32-byte random (base64 or hex), **separate** from
      `AUTH_SECRET`. Losing it makes every enrolled TOTP secret undecryptable.
- [ ] `MFA_RECOVERY_PEPPER` — set explicitly (do not rely on the `AUTH_SECRET`
      fallback in prod).
- [ ] `GOOGLE_TOKEN_ENCRYPTION_KEY` — 32-byte hex. Required now that the Google
      **access** token is also encrypted at rest.
- [ ] `CRON_SECRET`, `SETUP_SECRET` — set; delivered to callers via header /
      Bearer only.
- [ ] `DATABASE_URL` — dedicated database, least-privilege role, TLS
      (`sslmode=require` minimum).
- [ ] Store all of the above in a secret manager (not a plain `.env` on disk).
      Document a rotation runbook.
- [i] **If any secret was ever shared over chat / screen-share / CI logs, rotate
      it before go-live.**
- [i] Repo + git history scanned clean (`gitleaks` CI job); `.env*` is
      git-ignored; `.env.example` holds placeholders only.

## 2. Environment configuration

- [ ] `NODE_ENV=production` — enables `__Host-` cookies, HSTS,
      `upgrade-insecure-requests`, prod CSP (no `unsafe-eval`), and the
      `requireProductionSecret` guards.
- [ ] `APP_URL` (and/or `NEXTAUTH_URL`) set to the exact public origin. All
      password-reset / verification links are built from this — **never** from a
      request `Host` header.
- [ ] `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` set; the Google OAuth client's
      **Authorized redirect URI** is exactly `${APP_URL}/api/auth/callback/google`
      (and `${APP_URL}/api/communication/oauth/callback` for the Workspace link).
- [ ] `GOOGLE_WORKSPACE_DOMAIN` — set if Google sign-in should be restricted to
      one or more domains (comma-separated).
- [ ] `MOBILE_ALLOWED_ORIGINS` — set only if a browser origin must call
      `/api/mobile/*`; never `*`.
- [ ] `EMAIL_PROVIDER` + provider credentials (`RESEND_API_KEY` or `SMTP_*`) —
      required for password reset. `disabled` is for staging only.
- [ ] `ENABLE_DEBUG_ROUTES` unset / `false`.
- [ ] `RBAC_LEGACY_DEPARTMENT_GRANTS` unset / `false`. If migrating an existing
      DB, run `scripts/backfill-department-permission-grants.ts --apply`
      **first** so no one loses access.
- [ ] `SESSION_*` timeouts reviewed against org policy (defaults: 30 min idle /
      12 h absolute / 7 d remember-me / 15 min admin idle).

## 3. Database

- [ ] Migrations applied: `prisma migrate deploy` (includes
      `20260830090000_stage1_security_identity_mfa`). Confirm
      `prisma migrate status` is clean.
- [ ] Backups enabled + encrypted; point-in-time recovery configured; restore
      tested.
- [ ] Encryption at rest for the database volume.
- [ ] Schedule a job to run `pruneRateLimitCounters()` and to delete expired
      `PasswordResetToken` rows.
- [i] Tracked follow-up: `orgId` columns + composite `@@unique` on
      `EmploymentRecord` / `LeavePolicyVersion` (needs its own migration).

## 4. Reverse proxy / platform

- [ ] TLS 1.2+ only; HSTS honoured end-to-end; consider HSTS preload submission
      once confident.
- [ ] Exactly one trusted proxy in front of the app; configure / document the
      `X-Forwarded-For` hop count. On Vercel, rely on the platform client IP
      (`MON-S1-052` — the app currently trusts the first XFF hop).
- [ ] Verify the security headers are actually delivered on the running site
      (not just present in config) — CSP, HSTS, `nosniff`, `frame-ancestors`.
- [ ] WAF / DDoS: enable managed rules + rate limiting at the edge (e.g. Vercel
      Firewall / Attack Mode) — application rate limiting is a second layer, not
      the first.
- [ ] Bot protection on `/login`, `/api/auth/*` and expensive endpoints (a
      CAPTCHA extension point is expected past suspicious thresholds).

## 5. Application controls verified

- [ ] `node scripts/security-audit-gate.mjs` passes (0 unresolved critical/high
      in the production dependency tree).
- [ ] `node scripts/scan-route-auth-coverage.mjs` → `missing: []`.
- [ ] `node scripts/scan-tenant-scope-coverage.mjs` → `flagged: []`.
- [ ] Security unit tests green; DB-backed security tests green against staging.
- [ ] `npx tsc --noEmit` and `npx eslint` clean.
- [ ] `npm run build` succeeds.

## 6. Identity / access

- [ ] At least one platform admin exists, with **MFA enrolled** (mandatory).
- [ ] `/api/setup` disabled post-bootstrap (admin exists → 403) or the route
      removed.
- [ ] Special bootstrap accounts (`SPECIAL_*`) created with strong unique
      passwords, or not created at all.
- [ ] Review `admin/simulation` / any impersonation path — ensure it is
      audited and step-up protected before enabling.

## 7. Monitoring

- [ ] Ship `SecurityEvent` + structured error logs to a central system with
      alerting on: repeated `LOGIN_FAILURE` / `LOGIN_LOCKED`, `MFA_FAILED`
      spikes, `OAUTH_IDENTITY_CONFLICT`, `SESSION_REVOKED_BY_ADMIN`,
      `DISABLED_USER_ACCESS`, any 5xx correlation-id burst.
- [ ] Ensure `SecurityEvent` is not writable by ordinary org users (it isn't
      via the app; verify no ad-hoc admin tool exposes it).

## 8. Before "enterprise multi-tenant" sign-off (not blockers for controlled prod)

- [ ] Full BOLA sweep of all 297 routes + `[id]` pages + 77 server actions.
- [ ] `orgId` schema constraint migration.
- [x] `xlsx` -> `exceljs`.
- [ ] `nodemailer` -> 9.
- [ ] Nonce-based CSP (drop `'unsafe-inline'` for scripts).
- [ ] Security Center UI (`§26`) + Org Security Policy UI (`§27`).
- [ ] **Independent external penetration test** against staging.

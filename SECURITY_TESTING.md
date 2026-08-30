# SECURITY_TESTING

Attacker-style tests for the Stage 1 controls, and how to run them.

---

## 1. How to run

| Command | Scope |
|---|---|
| `npx vitest run --config vitest.unit.config.ts src/lib/__tests__ src/lib/mfa/__tests__` | All security **unit** tests (no DB) |
| `npm test` | Full suite against the marker-verified **staging DB** (`.env.staging.local`) |
| `node scripts/scan-route-auth-coverage.mjs` | Route auth-coverage report |
| `node scripts/scan-tenant-scope-coverage.mjs` | Tenant-scope coverage report |
| `node scripts/security-audit-gate.mjs` | Dependency (SCA) gate — fails on unresolved critical/high |
| `.github/workflows/security.yml` | SAST + coverage + SCA + secret-scan in CI |

DB-backed security tests (`*.integration.test.ts`, `session-security.test.ts`,
`cross-tenant-isolation.test.ts`) `skipIf(!process.env.DATABASE_URL)` so they
no-op without a database and run in CI / staging.

## 2. Coverage map — control → test

### Authentication
| Attack | Test |
|---|---|
| Invalid password / nonexistent account / enumeration | `session-security.test.ts`; `password-reset` unknown-vs-known parity in `mfa-flow.integration.test.ts` |
| Brute force / lockout | `security.test.ts` (rate limit), `session-security.test.ts` (lockout), `mfa-flow.integration.test.ts` (shared counter enforces across calls) |
| MFA bypass (no OTP when required) | `auth.ts` throws `MfaRequiredError`; `mfa-flow.integration.test.ts` (enrol rejects bad first OTP; `isMfaRequiredForUser`) |
| Stale / replayed TOTP | `totp.test.ts` (±1 step only), `mfa-flow.integration.test.ts` (2-step-old rejected) |
| Recovery-code reuse | `recovery-codes.test.ts`, `mfa-flow.integration.test.ts` (consumed after one use; regen invalidates old set) |
| Factor disable without re-auth | `step-up.test.ts`; `mfa-actions.ts` `requireStepUp` |
| OAuth unverified email / wrong domain / `sub` conflict | `oauth-linking.test.ts`; `auth.ts signIn` `OAUTH_IDENTITY_CONFLICT` |
| Expired / reused / modified reset token | `password-reset-token.test.ts`, `mfa-flow.integration.test.ts` (WEAK / USED) |
| Unsafe post-auth redirect | `safe-redirect.test.ts` (`//evil`, `https://evil`, `\`-tricks, CRLF) |

### Sessions
| Attack | Test |
|---|---|
| Old session after password reset | `mfa-flow.integration.test.ts` (all sessions revoked) |
| Old session after explicit revoke / logout-all | `session-security.test.ts` |
| Session fixation / rotation | `mfa-flow.integration.test.ts` (`rotateSession` revokes old, issues new) |
| Expired / idle session | `session-security.test.ts` (idle + absolute) |
| Malformed cookie / deleted account | `session-security.test.ts` (`DISABLED_USER_ACCESS`, unknown token) |
| DB-error fail-open | `session-fail-closed.test.ts` |

### Authorization
| Attack | Test |
|---|---|
| Unauthenticated hitting a protected API | `api-auth.test.ts` (401), `route-auth-coverage.test.ts` (0 unguarded) |
| Lower role calling an admin API / changing a role field | `api-auth.test.ts` (403), `rbac.test.ts` (no implicit grant) |
| Hardcoded privileged identity | after-audit MON-S1-003 (grep guard) |
| Accessing another org's record / file / report | `cross-tenant-isolation.test.ts`, `tenant.test.ts` (`assertSameOrg` → 404), `tenant-scope-coverage.test.ts` |

### Request security
| Attack | Test |
|---|---|
| CSRF / cross-site POST | `request-integrity.test.ts` |
| XSS payload in theme CSS | (grammar-anchored `sanitizePaletteOverride`; hardening test tracked) |
| SQL injection | no `*Unsafe` in app code (grep), parameterised Prisma |
| Path traversal | `security.test.ts` (`resolveInside`) |
| SSRF (metadata / loopback / private / rebinding) | `safe-fetch.test.ts` |
| Upload disguise (HTML-as-PDF), oversize, empty | `upload-validation.test.ts` |
| Header injection via download filename | `security.test.ts` (`contentDisposition`) |
| API abuse / rate limiting across instances | `mfa-flow.integration.test.ts` (shared counter) |
| Security headers present & correct | `security-headers.test.ts` |
| Cron/setup secret in query string | `security.test.ts` (header-only) |

## 3. Regression policy

Every fixed finding has at least one negative test. New API routes that skip the
auth gate, or by-id `findUnique` without an org scope, **fail CI** via the two
coverage tests. New unresolved critical/high dependencies **fail CI** via
`security-audit-gate.mjs`.

## 4. External testing (still required)

The following need a black-box / grey-box engagement against a staging
deployment — they are out of scope for the unit/integration suite:

- Full IDOR/BOLA fuzzing across all 297 routes and dynamic pages.
- Auth flow abuse (OAuth callback tampering, race conditions, JWT confusion).
- Business-logic authorization gaps (approval flows, financial postings).
- File-upload content attacks (polyglots, archive bombs, image parser CVEs).
- Rate-limit / DoS characterisation under load.
- Infrastructure: TLS config, header delivery through the real proxy, WAF.

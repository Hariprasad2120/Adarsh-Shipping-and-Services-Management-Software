# SECURITY CONTROL MATRIX — Monolith

> Maps important controls to relevant guidance. **Status is evidence-based** —
> nothing is PASS without a file + test reference. `PARTIAL` = implemented but not
> fully wired / tested. `GAP` = not implemented.

Legend: ✅ PASS · 🟡 PARTIAL · ⛔ GAP

| # | Requirement (ASVS / API-Sec / NIST theme) | Implementation | File / component | Automated test | Manual | Status |
|---|---|---|---|---|---|---|
| 1 | Authentication — password storage | bcrypt hash | `src/lib/auth*`, `/api/setup` | Stage 1 suite | ✔ | ✅ |
| 2 | Authentication — MFA / TOTP | enrol + verify | Stage 1 MFA cluster | Stage 1 suite | ✔ | ✅ |
| 3 | Authentication — WebAuthn / passkeys | registration + assertion | Stage 1 cluster 13 | Stage 1 suite | ✔ | ✅ |
| 4 | Session management — server-side, rotation, revoke | `UserSession`, `session-service.ts` | `session-service.ts` | Stage 1 suite | ✔ | ✅ |
| 5 | Brute-force protection | login rate limiting | `login-rate-limit.ts`, `rate-limit-store.ts` | Stage 1 | ✔ | ✅ |
| 6 | Access control — centralised authz | `Permission`/`Role`/`can` | `src/lib/rbac.ts` | Stage 1 authz tests | ✔ | ✅ |
| 7 | Access control — tenant isolation | `orgId` scoping, `tenantWhere`, `assertSameOrg` | `src/lib/tenant.ts` | Stage 1 tenant-isolation tests | ✔ | ✅ |
| 8 | Access control — separation of duties | approval engine, no self-approval | `core/approvals` | `decision.test.ts` + E2E | ✔ | 🟡 (engine done; not wired into modules) |
| 9 | Config change accountability | append-only audit + redaction | `core/config-audit` | `redact.test.ts` + E2E | ✔ | 🟡 (one service wired) |
| 10 | Injection — parameterised queries | Prisma + Zod on inputs | route handlers | Stage 1 | ✔ | ✅ |
| 11 | SSRF protection | `safe-fetch` / `safe-redirect` allowlist | `src/lib/safe-fetch.ts` | Stage 1 | ✔ | 🟡 (webhook platform not built) |
| 12 | XSS — output encoding + CSP nonce | React + per-request nonce CSP | `src/proxy.ts`, `security-headers.ts` | Stage 1 cluster 11 | ✔ | ✅ |
| 13 | CSRF | same-site session cookies + server actions | `session-config.ts` | Stage 1 | ✔ | ✅ |
| 14 | Security headers (HSTS, CSP, no-store) | middleware | `security-headers.ts` | Stage 1 | ✔ | ✅ |
| 15 | Secrets — never rendered after creation | write-only integration secrets, redaction | `logger`, `config-audit` | unit (redaction) | ✔ | 🟡 (no service-account/API-key model) |
| 16 | Idempotency for critical operations | `withIdempotency` | `core/idempotency` | E2E | ✔ | 🟡 (not wired to payment/import routes) |
| 17 | Concurrency-safe sequence generation | atomic `UPDATE … RETURNING` | `core/numbering` | 100-parallel E2E | ✔ | ✅ |
| 18 | Logging & monitoring — structured, correlation ids | JSON logger + ALS | `core/observability` | `observability.test.ts` | ✔ | 🟡 (~249 console.* to migrate) |
| 19 | Health / readiness endpoints | `/api/health`, `/api/ready` | those routes | smoke | ✔ | ✅ |
| 20 | Background work isolation + retry + DLQ | `BackgroundJob` | `core/jobs` | backoff unit + E2E | ✔ | 🟡 (bespoke queues not migrated) |
| 21 | Cache isolation per tenant | org-scoped cache keys / tags | `regional`, `module-settings` | — | ✔ | ✅ |
| 22 | Data classification & handling | doc + redaction + custom-field perms | `DATA_CLASSIFICATION.md` | — | ✔ | 🟡 (no field-level encryption beyond hashing) |
| 23 | Backup & verified restore | mechanism + drill defined | `BACKUP_AND_DISASTER_RECOVERY.md` | — | ⛔ no drill run | ⛔ |
| 24 | Safe migrations (expand/contract) | additive + rollback SQL headers | `prisma/migrations/*` | `prisma migrate status` | ✔ | ✅ |
| 25 | Enterprise SSO (OIDC/SAML) | extension path documented | `IDENTITY_ARCHITECTURE.md` §4 | — | — | ⛔ (by design — backlog) |
| 26 | SCIM provisioning | extension path documented | `IDENTITY_ARCHITECTURE.md` §5 | — | — | ⛔ (by design — backlog) |
| 27 | Scoped API keys / service accounts | requirements documented | `API_SECURITY.md` | — | — | ⛔ |
| 28 | Rate limiting on bulk / export / API | store exists, not applied everywhere | `rate-limit-store.ts` | — | — | 🟡 |
| 29 | Accessibility (WCAG 2.2 AA) | not audited | — | — | — | ⛔ |
| 30 | Independent penetration test | scope prepared | `PENTEST_SCOPE.md` | — | — | ⛔ (not performed) |

## How to read this

- ✅ items are Stage-1-hardened and Stage-2-preserved.
- 🟡 items have the platform primitive built and tested but the last mile
  (module wiring / call-site migration) is tracked in `TASK.md`.
- ⛔ items are explicitly out of Stage 2 scope (SSO/SCIM/API-keys — documented
  backlog) or are blockers (backup drill, pentest, accessibility).

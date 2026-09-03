# MONOLITH ENTERPRISE READINESS REPORT

> Stage 2 — Enterprise Platform, Organisation Setup & MNC Production Readiness.
> Prepared from the work in commits `4ec2ef03` … `bfccfc18` on branch
> `ams-completion`. Companion: `PRODUCTION_READINESS.md` (scorecard),
> `ENTERPRISE_ARCHITECTURE_AUDIT.md` (Phase 0), `TASK.md` (tracker).

---

## 1. Architecture before Stage 2

Single Next.js App Router application, one PostgreSQL database, 25 feature
modules under `src/modules/`, cross-cutting concerns in `src/lib/`. Multi-tenant
by an `orgId` column with row-level scoping (Stage 1). **But:** `Organisation`
was a god-object; one org per user; no legal-entity layer; currency / timezone /
locale / fiscal year hardcoded in hundreds of places; module gating via a global
`APP_EDITION` env var; maker-checker only in Accounting; three custom-field
implementations; no numbering service; no provisioning; static health endpoint;
no correlation ids / structured logging; no background-job or idempotency
primitive; no i18n; no configuration audit trail. Full inventory:
`ENTERPRISE_ARCHITECTURE_AUDIT.md` §2.

## 2. Architecture after Stage 2

Two explicit layers (`ENTERPRISE_ARCHITECTURE.md`). Twelve reusable core-platform
primitives added under `src/modules/core/`, each additive, tested, and verified
end-to-end:

regional settings · module registry · legal entities & structure · membership &
user lifecycle · numbering sequences · approval engine · custom fields ·
configuration audit · provisioning & templates · observability · background jobs
& idempotency · i18n scaffold.

The core never imports from a business module. Industry behaviour is confined to
modules, templates, and configuration.

## 3. Organisation / tenant model

`TENANCY_ARCHITECTURE.md`. `Platform → Organisation (tenant account) →
LegalEntity (≥1, one default) → BusinessUnit? → CostCentre? / Branch`.
`OrganisationSettings` 1:1 for regional/fiscal config. `OrganisationMembership`
for user↔org with a per-org lifecycle (`INVITED…ARCHIVED`). Tenant account is
explicitly distinct from legal entity, so an MNC models subsidiaries under one
account. Isolation is the Stage 1 model (session-derived `orgId`,
`tenantWhere`/`assertSameOrg`), unchanged and extended to every new service.

## 4. Organisation setup process

`ORGANISATION_SETUP.md`. Platform bootstrap: `/api/setup`, bootstrap-once,
`SETUP_SECRET`-gated. Per-org: `provisionOrganisation(template, …)` composes
org + default entity + regional settings + modules (dependency closure) + roles +
approval policies + numbering sequences + audit entry; idempotent; E2E-verified.
Templates (`Generic SME`, `Enterprise`) are versioned data. The guided 15-step
Setup Wizard UI is designed but **not built** — the provisioning service is its
engine.

## 5. Modules made industry-neutral

- Module registry (`MODULE_ARCHITECTURE.md`) replaces the `APP_EDITION` split
  with per-module manifests + dependency resolution + per-org entitlement.
- Regional layer removes the INR/Kolkata/en-IN/April assumption from the core;
  neutral platform defaults (USD/UTC/January) with per-org and per-entity
  overrides.
- Numbering, approvals, custom fields, provisioning are all module-agnostic.
- `CustomField` (form builder) kept separate by design.

## 6. Remaining industry-specific assumptions

- `src/lib/` still contains CHA-aware helpers (`cha-badges.ts`,
  `job-workspace-profile.ts`, `catalogue-data.ts`) and India GST lookup
  (`gst-public-search.ts`).
- `app-edition.ts` still carries hardcoded CHA route/nav blocklists.
- Accounting keeps its own `AccountingLegalEntity` / `AccountingNumberSeries` /
  `AccountingApprovalPolicy` (module-local).
- ~550 currency literals and ~578 `toLocale*` call sites in modules.
- `prisma/seed.ts` builds one specific company (`"Adarsh Shipping"`,
  `password@123`).

All are tracked in `TASK.md` as wiring / migration follow-ups; the mechanisms to
remove them exist.

## 7. Security status

Stage 1 hardening intact and not weakened. Stage 2 "security clusters" 6–13
already closed pre-report. Stage 2 platform work adds: append-only config audit
with redaction, concurrency-safe numbering, separation-of-duties approval engine,
permission-gated custom fields, idempotency primitive, correlation ids + redacting
logger, `/ready` probe. Matrix: `SECURITY_CONTROL_MATRIX.md`. No independent
penetration test performed.

## 8. IAM status

Centralised authorization unchanged (one `Caps`/`rbac` system). Membership model
+ lifecycle state machine added (`IDENTITY_ARCHITECTURE.md`). **Session and RBAC
still resolve org from `User.orgId`** — routing them through membership is the
key follow-up before multi-org isolation is enforced end-to-end.

## 9. SSO readiness

Not implemented (by design). Extension path documented: `OrgIdentityProvider` +
`OrgDomain` (DNS verification) + the existing OAuth-linking flow. Google is one
provider, not a schema assumption. `IDENTITY_ARCHITECTURE.md` §4.

## 10. Audit / logging status

`ConfigAuditEntry` (append-only, redacted, diffed, cursor-paginated) +
`SecurityEvent` + 9 module audit logs. Structured JSON logger with correlation
ids; `x-request-id` / `x-correlation-id` propagated by the proxy. Gaps: ~249
`console.*` unmigrated; audit table needs a DB-level `REVOKE UPDATE/DELETE`;
config-audit wired into one Stage-2 service so far.

## 11. Backup / DR evidence

`BACKUP_AND_DISASTER_RECOVERY.md` defines scope, mechanism, restore procedure,
and drill cadence. **No restore drill has been performed** — recovery is
unverified. RPO/RTO are deployment decisions with templates provided. This is a
production blocker.

## 12. Performance results

`allocateNumber` verified under 100-way concurrency (100 distinct, contiguous).
`request-performance` per-request instrumentation exists. **No representative
small/medium/large-organisation load test was run in Stage 2.** Blocker for the
performance score.

## 13. Accessibility results

**No WCAG 2.2 AA audit performed.** The design system is mid-migration under a
concurrent workstream. Blocker.

## 14. Localization readiness

Architecture ready: `OrganisationSettings` (currency, timezone, locale, formats,
first day of week, fiscal year), platform-neutral defaults, `formatMoney` /
`formatDate` / `zonedNow`, i18n `translate` / `plural` scaffold, shared-code
locale lint. Call-site migration (~550 currency, ~578 `toLocale*`) and non-English
catalogues are pending.

## 15. CI/CD release controls

Locally green every commit: `tsc --noEmit`, `eslint` (0 errors),
vitest unit suites, `prisma validate`. Repo has `architecture:check` /
`design-system:verify` tooling. **The full release gate (spec §34) is not
enforced by CI** — no pipeline runs lint/type/test/build/SAST/SCA/secret-scan on
every change. Blocker.

## 16. Test results by module

Stage 2 primitives: ~112 unit tests + 11 scripted E2E flows, all passing
(`ENTERPRISE_QA.md`). **Per-module CRUD / permissions / workflow / isolation QC
matrix (spec §35) was not executed.** Business modules retain their existing
tests only.

## 17. Defects by severity

- **Critical:** none introduced by Stage 2.
- **High:** membership/RBAC not enforced through the new model (multi-org
  isolation gap); backup restore unverified.
- **Medium:** config-audit table not write-protected; `/api/setup` hardcoded
  roles + TOCTOU race; ~249 `console.*`; bespoke queues not on `BackgroundJob`;
  `app-edition.ts` blocklist missing `/payroll`.
- **Low:** ESLint `no-explicit-any` backlog (~1145); currency/locale literals;
  no job reaper for crashed workers.

## 18. Remaining technical debt

Wiring the twelve primitives into the business modules; the seed split; the
contract migrations (`Branch.legalEntityId` NOT NULL, drop `User.orgId`); moving
CHA helpers out of `src/lib/`; folding `module-config.ts` tuples into the
registry. All enumerated in `TASK.md`.

## 19. Infrastructure requirements

`DEPLOYMENT.md`: PostgreSQL with PITR + backups, object storage with versioning,
secret manager, cron scheduler (for `/api/cron/jobs`), TLS/DNS/CDN/WAF, log
drain / collector, metrics aggregation, alerting. Application vs infrastructure
responsibility split is tabulated there.

## 20. External penetration-testing requirements

`PENTEST_SCOPE.md` (prepared, not executed): authentication, MFA, OAuth,
password reset, sessions, APIs, authorization, tenant isolation, uploads,
integrations, webhooks, SSRF, XSS, injection, CSRF, business-logic abuse, rate
limiting. Automated tests do **not** substitute for this.

## 21. Compliance-readiness limitations

Technical controls are documented (`SECURITY_CONTROL_MATRIX.md`,
`DATA_CLASSIFICATION.md`, `DATA_RETENTION.md`, `INCIDENT_RESPONSE.md`). ISO 27001
/ SOC 2 / GDPR / HIPAA / PCI DSS are **not** claimed — they depend on
organisational policy, personnel, infrastructure, vendor management, evidence,
and audits outside this codebase.

## 22. MNC readiness scorecard

`PRODUCTION_READINESS.md`. Unweighted average ≈ **2.9 / 5**. Strong: code
quality, documentation, authentication, authorization, tenant isolation (all 4).
Weak: backup/DR (1), accessibility (1), data governance (2), performance (2),
API/integration architecture (2).

## 23. Production blockers

1. Backup restore never verified.
2. No independent penetration test.
3. No per-module QC audit.
4. No accessibility audit.
5. No representative-volume performance test.
6. Membership/RBAC still on `User.orgId` (multi-org isolation gap).
7. Config-audit table not DB-write-protected.
8. Full CI release gate not enforced.

## 24. Final recommendation

The Stage 2 platform foundation is real, additive, and verified: twelve
industry-neutral core primitives, a working provisioning path, safe migration
discipline, and an honest doc set. It is **not** enterprise-production-ready —
several mandatory gates (verified backup restore, independent pentest,
per-module QC, accessibility, performance-at-volume) have not been run, and the
membership model is not yet the isolation source of truth.

**READY FOR CONTROLLED ENTERPRISE PILOT**

— with a single pilot organisation, on the current India-configured data, with
the eight blockers in `PRODUCTION_READINESS.md` scheduled and the wiring
follow-ups in `TASK.md` completed before any second organisation is onboarded or
a general enterprise-production label is applied.

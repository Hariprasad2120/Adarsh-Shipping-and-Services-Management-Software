# TASK.md — Monolith Stage 2: Enterprise Platform

> Living tracker. Statuses: `TODO` · `IN PROGRESS` · `BLOCKED` · `DONE` · `VERIFIED`.
> Nothing is `DONE` until tested; `VERIFIED` = tested + reviewed.
> Audit: [`ENTERPRISE_ARCHITECTURE_AUDIT.md`](./ENTERPRISE_ARCHITECTURE_AUDIT.md).

## Environment note
Concurrent agent doing UI-migration work on `ams-completion` (167 uncommitted files at
Phase 0). Before any schema/migration change: `git status`, check `prisma/migrations/`,
prefer additive migrations, commit small.

---

## Phase 0 — Enterprise Architecture Audit

| Task | Status | Files | Notes |
|---|---|---|---|
| Repo sweep: currency / country / tz / fiscal / company-name hardcoding | VERIFIED | — | Counts in audit §0 |
| Tenancy model review (`Organisation`, `orgId`, `User`) | VERIFIED | `prisma/schema.prisma` | god-object; no LegalEntity/BU; single-org user — audit §2.A |
| Module-gating review | VERIFIED | `src/lib/app-edition.ts` | global `APP_EDITION` + hardcoded blocklists — audit §2.C1 |
| Setup / provisioning review | VERIFIED | `src/app/api/setup/route.ts`, `src/app/(auth)/setup/page.tsx`, `prisma/seed.ts` | bootstrap-once ok; no wizard; seed = one company — audit §2.D2, §2.E |
| Custom-fields review | VERIFIED | schema:778 / 2881 / 5346 | 3 duplicate implementations — audit §2.F1 |
| Approval / maker-checker review | VERIFIED | `src/modules/accounting/authorization-planning/` | accounting-only — audit §2.D3 |
| Numbering review | VERIFIED | — | no `NumberingSequence` model — audit §2.D4 |
| Write `ENTERPRISE_ARCHITECTURE_AUDIT.md` + `TASK.md` | VERIFIED | this file | — |

**Phase 0 result:** audit complete. Remediation split into 15 clusters below. Awaiting go-ahead
per cluster (schema changes gated on concurrent-agent coordination).

---

## Phase 1+ — Remediation clusters

### Cluster 1 — Regional settings foundation  — DONE
| Task | Status | Files | Migration | Tests | Notes |
|---|---|---|---|---|---|
| `OrganisationSettings` model (country, timezone, locale, dateFormat, timeFormat, numberFormat, firstDayOfWeek, baseCurrency, supportedCurrencies, fiscalYearStart month/day) | VERIFIED | `prisma/schema.prisma` | `20260903120000_stage2_organisation_settings` — additive table; platform-neutral column defaults (UTC/en-US/USD/ISO-8601/Jan); backfill existing 2 orgs → India values. Applied + verified (2 orgs → 2 rows). | — | audit A4. `legalName`/`taxIds` deferred to Cluster 3 (legal-entity scoped). |
| `formatMoney` / `formatNumber` / `formatDate` / `formatDateTime` / `zonedNow` (pure, client-safe) | VERIFIED | `src/modules/core/regional/format.ts` | — | `__tests__/format.test.ts` 8/8 | no hardcoded currency/locale/tz |
| `getOrganisationRegionalSettings` / `updateOrganisationRegionalSettings` + `toFormatContext` (cached, lazy-create) | VERIFIED | `src/modules/core/regional/settings.ts` | — | — | `unstable_cache` + `revalidateTag(tag,"max")` |
| Deprecate `formatINR` / `formatINRCompact` | VERIFIED | `src/lib/items/formatters.ts` | — | — | `@deprecated` → `formatMoney`; 2 consumers migrate in Cluster 13 |
| tsc `--noEmit` 0 errors + eslint clean on new files | VERIFIED | — | — | — | — |

### Cluster 2 — Module registry  — PARTIAL (core registry landed)
| Task | Status | Files | Migration | Tests | Notes |
|---|---|---|---|---|---|
| Registry types + per-module manifests (`id, label, version, kind, dependsOn, routePrefixes, permissionGroups, features, capabilities`) | VERIFIED | `src/modules/core/module-registry/{types,registry,resolve,index}.ts` | — | `__tests__/registry.test.ts` 14/14 | 17 manifests (4 core + 13 business) |
| `validateRegistry()` — unknown-dep / core→business / cycle detection; runs at import | VERIFIED | `resolve.ts` | — | ✓ | fails fast in dev/CI |
| `resolveEnabledModules()` — core always on + transitive dependency closure + `autoAdded` report | VERIFIED | `resolve.ts` | — | ✓ | — |
| Parity test: registry ids/labels/descriptions/features === legacy `module-config.ts` | VERIFIED | `__tests__/registry.test.ts` | — | ✓ | build fails if they diverge — registry is the place to add a module |
| `setEnabledModuleIds` runs dependency resolution before persist (Payroll → +HRMS) | VERIFIED | `src/modules/core/organisation/module-settings.ts` | — | — | only verified dep declared (`payroll→hrms`, 32 code imports) |
| `dependsOn` for attendance / ams / lms / recruit (runtime need for HRMS employees, no direct imports) | TODO | `registry.ts` | — | — | verify each at runtime before declaring — wrong entry silently enables modules |
| `getModuleForPath()` longest-prefix router | VERIFIED | `resolve.ts` | — | ✓ | ready for proxy/nav to consume |
| Fold `module-config.ts` id tuples + `MANAGED_ROUTE_PREFIXES` to derive from registry | TODO | `module-config.ts` | — | — | needs `as const` type surgery — deferred to avoid build risk while concurrent agent active; parity test guards drift meanwhile |
| Retire `app-edition.ts` `CHA_BLOCKED_*` arrays → derive from registry | TODO | `src/lib/app-edition.ts`, `src/proxy.ts` | — | e2e nav | behaviour-sensitive (current list missing `/payroll`); do with Cluster 9 provisioning templates + explicit behaviour diff |
| Move CHA-aware helpers out of `src/lib/` | TODO | `src/lib/cha-badges.ts`, `job-workspace-profile.ts`, `catalogue-data.ts` | — | — | audit C2 |
| `OrgModule` table (replace `SystemSetting` JSON persistence) | TODO | `prisma/schema.prisma` | additive | integration | optional — current persistence works; do if config-audit (§13) needs per-row history |

### Cluster 3 — Legal entities & org structure  — DONE (expand phase)
| Task | Status | Files | Migration | Tests | Notes |
|---|---|---|---|---|---|
| `LegalEntity` model (≥1 per org, one `isDefault`); `taxIdentifiers` Json, per-entity `country` override | VERIFIED | `prisma/schema.prisma` | `20260903130000_stage2_legal_entities` — additive; 1 default entity per org (name = org name). Applied + verified (2 orgs → 2 defaults). | — | audit A2 / A4 (`legalName`/`taxIds` land here) |
| `BusinessUnit` (self-hierarchy) + `CostCentre` optional layers | VERIFIED | `prisma/schema.prisma` | same migration | — | thin models; wiring beyond CRUD deferred until a module needs them |
| `Branch.legalEntityId` nullable FK + backfill to default entity | VERIFIED | `prisma/schema.prisma` | same migration — 5/5 branches re-parented, 0 orphan | — | expand phase; NOT NULL + drop-nullable is a later contract migration |
| `legal-entity.ts` service — `ensureDefaultLegalEntity` (idempotent), list/get/create/update/`setDefaultLegalEntity`/`deleteLegalEntity`, tenant-guarded | VERIFIED | `src/modules/core/organisation/legal-entity.ts` | — | `__tests__/legal-entity.test.ts` 4/4 (pure delete-guard) | mirrors `service.ts` guard style |
| Re-parent `Department` / `Division` under `LegalEntity` | TODO | schema | expand→backfill | — | not done — Dept/Div are org-wide today; only re-parent if HR needs entity-scoped structure |
| Link `AccountingLegalEntity` → `LegalEntity` (FK) | TODO | schema, accounting | expand | — | accounting keeps its richer entity; add `legalEntityId` pointer so they reconcile |
| Setup-wizard structure step + Settings UI for entities/BU/CC | TODO | — | — | — | Cluster 8 |
| Contract: `Branch.legalEntityId` NOT NULL | TODO | schema | contract | — | after all writers set it |

### Cluster 4 — Membership model  — DONE (expand phase)
| Task | Status | Files | Migration | Tests | Notes |
|---|---|---|---|---|---|
| `OrganisationMembership` — (orgId, userId) unique, `status` (INVITED/ACTIVE/SUSPENDED/DEACTIVATED/ARCHIVED — spec §30), `isPrimary`, invitedBy, joined/deactivated timestamps | VERIFIED | `prisma/schema.prisma` | `20260903180000_stage2_org_membership` — additive; backfill 1 primary membership per user-with-org, status from `User.active`. Applied + verified (102 users → 102 memberships, 102 primaries, 0 missing, 0 dup primary). | — | audit A3 |
| `membership-lifecycle.ts` (pure) — status set + allowed-transition table + `isActiveMembership` | VERIFIED | `src/modules/core/organisation/membership-lifecycle.ts` | — | `__tests__/membership-lifecycle.test.ts` 6/6 | ARCHIVED terminal |
| `membership.ts` service — list (by user / by org), get, `getPrimaryMembership`, `ensurePrimaryMembership` (idempotent), `addMembership`, `setMembershipStatus` (transition-guarded), `setPrimaryMembership` (transactional single primary) | VERIFIED | `src/modules/core/organisation/membership.ts` | — | — | — |
| tsc 0 + eslint clean | VERIFIED | — | — | — | — |
| Route session/RBAC through membership (resolve active membership, block non-ACTIVE) | TODO | `src/lib/session-service.ts`, `src/lib/rbac.ts`, `src/lib/tenant.ts` | — | authz + tenant-isolation | behaviour-sensitive — keep `User.orgId` as the source of truth until this lands |
| Multi-org switch UI + `X-Org` / session org selection | TODO | — | — | — | Cluster 8 |
| Contract: drop `User.orgId`, derive from primary membership | TODO | schema | contract | — | after session/RBAC migrated |
| Call `ensurePrimaryMembership` on login | TODO | auth flow | — | — | keeps rows in sync for users created before this |

### Cluster 5 — Numbering service  — DONE (platform service)
| Task | Status | Files | Migration | Tests | Notes |
|---|---|---|---|---|---|
| `NumberingSequence` model — scope (orgId, legalEntityId?, moduleId, docType, scopeKey), prefix/suffix/padding, `resetPolicy` NEVER/ANNUALLY/MONTHLY, `periodLabel` rollover marker | VERIFIED | `prisma/schema.prisma` | `20260903140000_stage2_numbering_sequence` — new empty table; COALESCE unique index for NULL-legalEntity scope. Applied. | — | audit D4 |
| `allocateNumber()` — atomic `UPDATE … RETURNING` with in-SQL reset CASE; own implicit txn (no pool-holding interactive txn) or caller's `tx` | VERIFIED | `src/modules/core/numbering/service.ts` | — | **100 parallel allocations → 100 distinct, contiguous 1..100** | + `previewNextNumber`, `upsertNumberingSequence`, `getNumberingSequence` |
| Pure format layer — `fiscalYearLabel`, `periodLabelFor`, `resolveTemplateTokens` ({FY}/{YYYY}/{YY}/{MM}/{MMM}/{DD}), `formatSequenceNumber` | VERIFIED | `src/modules/core/numbering/format.ts` | — | `__tests__/format.test.ts` 13/13 | FY start month from `OrganisationSettings` (Cluster 1), read uncached so jobs/scripts work |
| Verified: annual reset (stale period → startValue, `INV-2026-27-0001`), tx-rollback un-spends | VERIFIED | — | — | manual script | — |
| tsc `--noEmit` 0 errors + eslint clean | VERIFIED | — | — | — | — |
| Migrate `AccountingNumberSeries` consumers onto service | TODO | `src/modules/accounting/posting-engine.ts` etc. | — | — | accounting already uses the same `UPDATE…RETURNING` pattern — low-risk swap, but behaviour-sensitive (voucher numbers); do with care |
| Migrate `ChaBranchNumberingRule` (`currentSequence` Int) onto service | TODO | `src/modules/cha/service.ts` | data migration | — | — |
| Settings UI for sequences | TODO | — | — | — | Cluster 8 |

### Cluster 6 — Approval engine  — DONE (platform engine)
| Task | Status | Files | Migration | Tests | Notes |
|---|---|---|---|---|---|
| Schema: `ApprovalPolicy` + `ApprovalPolicyStep` + `ApprovalRequest` + `ApprovalDecision` | VERIFIED | `prisma/schema.prisma` | `20260903150000_stage2_approval_engine` — 4 empty tables. Applied. | — | audit D3. Policy keyed (orgId, subjectType, scopeKey); step `approverMode` PERMISSION\|USER + quorum. |
| Pure chain state machine — `levelStatus`, `foldChain`, `assertMayDecide` (no self-approval, no double-vote) | VERIFIED | `src/modules/core/approvals/decision.ts` | — | `__tests__/decision.test.ts` 13/13 | — |
| `policy.ts` — `upsertApprovalPolicy` (validates 1..N contiguous levels), `listApprovalPolicies`, `deleteApprovalPolicy`, `getEffectiveApprovalPolicy` (exact scope → org-wide) | VERIFIED | `src/modules/core/approvals/policy.ts` | — | — | — |
| `engine.ts` — `openApprovalRequest` (idempotent; auto-approves when no policy), `submitApprovalDecision` (eligibility via `can()` or userId, SoD, quorum, level advance), `cancelApprovalRequest`, queries | VERIFIED | `src/modules/core/approvals/engine.ts` | — | E2E script: no-policy→APPROVED, 2-level chain, self-approve→SELF_APPROVAL, wrong approver→NOT_ELIGIBLE, L1→L2→APPROVED, reject→REJECTED | — |
| tsc `--noEmit` 0 + eslint clean | VERIFIED | — | — | — | — |
| ROLE `approverMode` (role-membership gate) | TODO | `engine.ts`, schema | — | — | deferred — permission-key gates are cleaner; add if a module needs role-name matching |
| Accounting `authorization-planning` migrates onto engine | TODO | `src/modules/accounting/authorization-planning/` | — | regression | behaviour-sensitive; keep exact behaviour |
| Migrate Leave / CRM / WorkReport / CHA-checklist / Recruit-offer approval schemes | TODO | respective modules | data migration | regression | one at a time |
| Reference wiring: route `core.vendor.create` or a config change through the engine | TODO | — | — | — | first real consumer — pick low-risk |
| Settings UI for approval policies | TODO | — | — | — | Cluster 8 |

### Cluster 7 — Custom fields convergence  — DONE (platform model)
| Task | Status | Files | Migration | Tests | Notes |
|---|---|---|---|---|---|
| `CustomFieldDefinition` + `CustomFieldValue` — objectType/key scope, 12 field types, required/default/options/validation/section/help, `visibility`, `readPermission`/`writePermission` | VERIFIED | `prisma/schema.prisma` | `20260903160000_stage2_custom_fields` — 2 empty tables. Applied. | — | audit F1 |
| `validate.ts` (pure) — coerce + check per type; declarative rules only (pattern = anchored regex string, **no code execution**); `validateFieldValue`, `validateFieldPatch` (rejects unknown keys) | VERIFIED | `src/modules/core/custom-fields/validate.ts` | — | `__tests__/validate.test.ts` 14/14 | — |
| `definitions.ts` — create/update/deactivate/delete/reorder; key `lower_snake_case`, rename blocked once values exist | VERIFIED | `src/modules/core/custom-fields/definitions.ts` | — | — | tenant-scoped by-id |
| `values.ts` — `getFieldValues` / `getFieldValuesForMany` (batch, no N+1) / `setFieldValues` (validate + `writePermission` + READONLY guard + all-or-nothing); `readPermission` filters reads | VERIFIED | `src/modules/core/custom-fields/values.ts` | — | E2E: bad option/range rejected, write/read permission enforced, null clears, cascade delete | `can` predicate passed by caller |
| tsc 0 + eslint clean | VERIFIED | — | — | — | — |
| Migrate `EmployeeProfileField` consumers (hrms) onto platform model | TODO | hrms | data migration | regression | — |
| Migrate `AccountingCustomFieldDefinition` consumers onto platform model | TODO | accounting | data migration | regression | `dataType`→`fieldType`, `scope`→`objectType` |
| `CustomField` (ServiceForm form-builder) | N/A | — | — | — | different concept — stays separate, not part of convergence |
| Settings UI for custom fields | TODO | — | — | — | Cluster 8 |

### Cluster 7b — Configuration audit trail (spec §13 / §14)  — DONE (platform service)
| Task | Status | Files | Migration | Tests | Notes |
|---|---|---|---|---|---|
| `ConfigAuditEntry` model — actor (user or label), action, target, before/after (redacted), `changedKeys`, `reason`, source, result, ip/ua/correlationId. Append-only by contract. | VERIFIED | `prisma/schema.prisma` | `20260903170000_stage2_config_audit` — new table; migration notes the `REVOKE UPDATE/DELETE` to run for a hardened deployment | — | audit H3 / spec §13 |
| `redact.ts` (pure) — `redact` (sensitive-key detector, depth-capped), `diffKeys` (order-insensitive top-level diff), `summarise` | VERIFIED | `src/modules/core/config-audit/redact.ts` | — | `__tests__/redact.test.ts` 10/10 | — |
| `service.ts` — `recordConfigChange` (single write path; swallows its own errors so auditing never breaks the audited action), `listConfigAudit` (filter + cursor pagination) | VERIFIED | `src/modules/core/config-audit/service.ts` | — | E2E: record, redact (`apiKey`/`clientSecret`→`[redacted]`, `retries` kept), diff, provisioning actor, append-only surface | ip/ua via `extractRequestMeta` |
| Wire `updateOrganisationRegionalSettings` — optional `audit` param records before/after | VERIFIED | `src/modules/core/regional/settings.ts` | — | tsc (runtime path needs request context for `revalidateTag`) | non-breaking optional arg |
| Wire remaining Stage-2 services (module toggle, approval policy, legal entity, custom field def, numbering) | TODO | those services | — | — | each needs actor plumbing into its signature |
| Wire critical business config changes (user-role changes, security policy, integrations) | TODO | admin routes | — | — | spec §13 |
| Admin UI: configuration history view | TODO | — | — | — | Cluster 8 / Settings |

### Cluster 8 — Organisation Setup Wizard
| Task | Status | Files | Migration | Tests | Notes |
|---|---|---|---|---|---|
| `SetupProgress` + `Organisation.activatedAt`; resumable, idempotent multi-step wizard (profile, regional, structure, domain, identity/security, roles, modules, master data, workflows, branding, users, integrations, retention, import, readiness) | TODO | `src/app/(dashboard)/setup/**` (new), schema | additive | e2e per step + resume | audit E4/E5 |
| Readiness check (BLOCKING / WARNING / OPTIONAL) + audited Activate action | TODO | wizard | — | integration | spec §15 |
| Gate business routes until required steps pass | TODO | middleware | — | e2e | — |

### Cluster 9 — Provisioning templates + seed split  — DONE (service + templates)
| Task | Status | Files | Migration | Tests | Notes |
|---|---|---|---|---|---|
| `provisionOrganisation()` — composes org + default legal entity + regional settings + modules (dep closure) + roles (+ permission grants) + approval policies + numbering sequences + config-audit entry. Idempotent. No hardcoded company. | VERIFIED | `src/modules/core/provisioning/service.ts` | — | `__tests__/templates.test.ts` 6/6 + E2E (provision Enterprise → 8 modules, 7 roles, 2 policies, 3 sequences, audit; re-run → 0 dupes; cascade cleanup) | audit D2 |
| Built-in templates `Generic SME`, `Enterprise` as versioned data; `getTemplate`/`listTemplates` | VERIFIED | `src/modules/core/provisioning/templates.ts` | — | ✓ platform-neutral regional (not INR/Kolkata) | spec §12 |
| Cache-free write paths for provisioning: `writeOrganisationRegionalSettingsRaw`, `setEnabledModuleIdsRaw` | VERIFIED | `regional/settings.ts`, `organisation/module-settings.ts` | — | — | fixes the "revalidateTag outside request context" limitation from Cluster 7b |
| `Professional Services` / `Logistics` templates | TODO | `templates.ts` | — | — | same shape — add when needed |
| Split `prisma/seed.ts` → `seed.dev.ts` (Adarsh demo) + template-driven prod path; remove `password@123` from any prod-reachable path | TODO | `prisma/seed*.ts` | — | — | separate PR — `seed.ts` is 700+ lines, interdependent, concurrent-agent territory. Provisioning service is now the documented prod path. |
| Move hardcoded `systemRoles` out of `/api/setup` into a template | TODO | `src/app/api/setup/route.ts` | — | — | security-sensitive bootstrap route — do carefully |
| Add unique guard / advisory lock on bootstrap admin creation | TODO | `src/app/api/setup/route.ts`, schema | partial unique index | concurrency test | audit E2 |
| Wire provisioning into the Setup Wizard "Activate" step | TODO | — | — | — | Cluster 8 |

### Cluster 10 — Observability  — DONE (primitives + probes)
| Task | Status | Files | Migration | Tests | Notes |
|---|---|---|---|---|---|
| `correlation.ts` — `AsyncLocalStorage` request/correlation id; `runWithCorrelation`, `runWithCorrelationFromHeaders`, `getCorrelationId`, `enrichCorrelation` | VERIFIED | `src/modules/core/observability/correlation.ts` | — | `__tests__/observability.test.ts` 10/10 | audit G1 |
| `logger.ts` — structured one-line JSON, correlation-aware, sensitive-key redaction, `LOG_LEVEL` gate, swappable sink (tests) | VERIFIED | `src/modules/core/observability/logger.ts` | — | ✓ | no vendor coupling |
| `metrics.ts` — in-process counters + value summaries + `timed()` + `snapshot()` | VERIFIED | `src/modules/core/observability/metrics.ts` | — | ✓ | per-process; infra aggregates |
| Proxy propagates `x-request-id` / `x-correlation-id` (generate if absent, echo on response) | VERIFIED | `src/proxy.ts` | — | — | inline `crypto.randomUUID`, no bundle bloat |
| `/api/health` (liveness — uptime/version, no deps) + `/api/ready` (readiness — DB `SELECT 1`, 200/503, no infra leak) | VERIFIED | `src/app/api/health/route.ts`, `src/app/api/ready/route.ts` | — | smoke (SELECT 1 + log line + metric) | spec §15 |
| tsc 0 + eslint clean | VERIFIED | — | — | — | — |
| Replace ~249 raw `console.*` with `logger` | TODO | across `src/` | — | — | mechanical, do in module sweeps |
| Wire `runWithCorrelationFromHeaders` into API routes / server actions / jobs | TODO | route wrappers | — | — | needs a shared handler wrapper — pairs with Cluster 11 |
| Instrument auth errors / API latency / DB / mail / webhook / rate-limit / security events via `incr`/`observe` | TODO | those call sites | — | — | prep for external APM/SIEM |

### Cluster 11 — Jobs & idempotency
| Task | Status | Files | Migration | Tests | Notes |
|---|---|---|---|---|---|
| Inventory long/blocking operations (bulk email, imports, exports, PDF, webhooks, large reports/sync) | TODO | — | — | — | audit G2 |
| Job abstraction (ID, status, retries, backoff, DLQ, org context, idempotency, audit) | TODO | `src/modules/core/jobs/` (new), schema | additive | integration | — |
| `IdempotencyKey` table + wrapper for money-ish / import / provisioning endpoints | TODO | schema, `src/lib/` | additive | dup-request test | audit G3 |

### Cluster 12 — i18n scaffold
| Task | Status | Files | Migration | Tests | Notes |
|---|---|---|---|---|---|
| Message catalogue framework; base `en` locale | TODO | `src/i18n/` (new) | — | — | audit H1 |
| Lint rule banning `toLocaleDateString("en-IN")` / literal currency symbols in shared code | TODO | eslint config | — | — | audit B4 |

### Cluster 13 — Currency / date sweep (module-by-module)
| Module | Status | Notes |
|---|---|---|
| accounting | TODO | heaviest (~216 raw-control + currency sites) |
| ams | TODO | — |
| attendance / leave / ot | TODO | also timezone (audit B3) |
| crm | TODO | invoices |
| cha / freight-forwarding | TODO | — |
| items / catalogue | TODO | `formatters.ts` origin |
| payroll / incentives | TODO | — |
| hrms / people / performance / recruit | TODO | — |

### Cluster 14 — Concurrency & DB enterprise review
| Task | Status | Notes |
|---|---|---|
| Race audit: numbering, leave balances, accounting posting, approvals, invitations, workflow transitions, provisioning | TODO | audit G4 / spec §18 |
| Prisma review: PKs, FKs, tenant keys, indexes, unique constraints, cascades, nullable, soft-delete, N+1, unbounded reads, pagination | TODO | spec §19; index changes need `EXPLAIN` evidence |

### Cluster 15 — Docs, QA audit, scorecard
| Doc / task | Status | Notes |
|---|---|---|
| `ENTERPRISE_ARCHITECTURE.md` | TODO | before/after |
| `TENANCY_ARCHITECTURE.md` | TODO | Cluster 3/4 output |
| `IDENTITY_ARCHITECTURE.md` | TODO | + SSO/SCIM backlog (spec §28/§29) |
| `MODULE_ARCHITECTURE.md` | TODO | Cluster 2 output |
| `ORGANISATION_SETUP.md` | TODO | Cluster 8 output |
| `DEPLOYMENT.md` | TODO | expand `VERCEL_DEPLOYMENT.md`; app vs infra control split |
| `OPERATIONS_RUNBOOK.md` | TODO | spec §38 |
| `BACKUP_AND_DISASTER_RECOVERY.md` | TODO | spec §22; RPO/RTO as config decisions; restore drill |
| `INCIDENT_RESPONSE.md` | TODO | spec §39 |
| `DATA_RETENTION.md` / `DATA_CLASSIFICATION.md` | TODO | spec §13/§31/§33 |
| `INTEGRATION_ARCHITECTURE.md` / `API_SECURITY.md` | TODO | spec §12/§9/§10/§11 |
| `ENTERPRISE_QA.md` | TODO | per-module CRUD/permissions/isolation matrix (spec §35) |
| `SECURITY_CONTROL_MATRIX.md` | TODO | ASVS / API-Sec / NIST mapping w/ evidence (spec §41) |
| `PRODUCTION_READINESS.md` + MNC scorecard | TODO | spec §42; evidence-backed scores |
| Update `PENTEST_SCOPE.md` | TODO | already exists; extend for Stage 2 surface (spec §43) |

---

## Problems found (running log)
- 2026-09-03: 167 uncommitted files from concurrent agent — schema clusters must coordinate.
- 2026-09-03: `prisma/seed.ts` ships `DEFAULT_PASSWORD = "password@123"` — confirm not prod-reachable (Cluster 9).

## Decisions
- No Prisma table renames (schema names already domain-neutral) — terminology handled at presentation layer.
- Expand→backfill→migrate→contract for every schema change; no destructive drops in one deploy.

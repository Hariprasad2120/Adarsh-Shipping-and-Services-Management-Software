# ENTERPRISE ARCHITECTURE AUDIT — Monolith Stage 2 Phase 0

> Status: **Phase 0 (read-only audit) complete.** No code changed.
> Date: 2026-09-03. Branch: `ams-completion`.
> Scope: identify industry-specific hardcoding, single-org / single-entity assumptions,
> and business logic leaking into what should be reusable platform core.
>
> Companion tracker: [`TASK.md`](./TASK.md). Prior security work: `SECURITY_AUDIT_AFTER_STAGE1.md`
> (Stage 1 + Stage 2 "security clusters" 6–13 already done — **not weakened by this plan**).

---

## 0. Method

Static sweep of `src/`, `prisma/schema.prisma`, `prisma/seed*.ts`:

| Probe | Raw hits |
|---|---|
| `INR` / `rupee` / `₹` | 550 |
| `India` / `GST` / `GSTIN` / `PAN` / `PIN` / `Asia/Kolkata` / `IST` | 1918 |
| literal `"Adarsh"` | 192 |
| `DD/MM/YYYY` / `en-IN` | 611 |
| `april` / `fiscal year` / `financial year` | 2190 |
| CHA / customs / BL / container / freight terms inside `src/lib/` | 136 |

Hit counts are indicative, not a defect count — many are inside the CHA business module
(legitimate) or tests. The findings below are the ones that touch **core / shared / schema**.

---

## 1. Current architecture (before Stage 2)

```
Next.js App Router (src/app) ── UI + server actions + api routes
        │
src/modules/*  ── 25 feature modules: accounting, ams, attendance, auth, cha,
        │          communication, core, crm, customer-portal, expense,
        │          freight-forwarding, hrms, incentives, items, leave, mona,
        │          notifications, payroll, people, performance, recruit, todo, …
        │
src/lib/*      ── cross-cutting: auth, rbac, tenant, session, security, db, email, …
        │
prisma/schema.prisma ── 454 models, 11,536 lines, single Postgres DB
```

- **Tenancy**: `Organisation` model exists; `orgId` FK + `@@index([orgId])` denormalised
  onto most tenant-scoped tables (Stage 1/2 security work). Row-level scoping enforced in
  `src/lib/tenant.ts` + `src/lib/rbac.ts`.
- **Authz**: single centralised capability system (`Caps` map, `useCan`, `rbac.ts`,
  seed `PERMISSIONS` catalogue). Good — one system, not duplicated.
- **Module gating**: `src/lib/app-edition.ts` — a **global `APP_EDITION` env var** with two
  values (`full` | `cha`) and **hardcoded route/nav/api prefix blocklists**.
- **Core layer**: `src/modules/core/` exists (`organisation`, `user`, `components`, `hooks`)
  but is thin; most "platform" concerns live in `src/lib/` or leak into `accounting`.

---

## 2. Findings — classified

Severity: **P0** blocks multi-org/multi-industry deployment · **P1** major platform gap ·
**P2** cleanup / debt. Layer: where the fix belongs.

### A. Tenancy & organisation model

| # | Finding | Sev | Layer | Remediation |
|---|---|---|---|---|
| A1 | `Organisation` is a god-object: ~100 direct relations spanning every module (accounting, CHA, leave, appraisals…). Core tenant model is coupled to all business modules. | P1 | schema / core | Keep `Organisation` as tenant root; stop adding module back-relations (Prisma relations can be one-directional). Document the intended shape in `TENANCY_ARCHITECTURE.md`. |
| A2 | **No `LegalEntity` / `Company` / `BusinessUnit` / `CostCentre` / `Team` models.** `Organisation` conflates tenant account + single legal entity. MNC / corporate-group deployments impossible. | P0 | schema | Add `LegalEntity` (belongs to `Organisation`, ≥1, one default), optional `BusinessUnit`, `CostCentre`. `Branch`/`Department`/`Division` already exist — re-parent under `LegalEntity` via nullable FK (expand/contract migration). |
| A3 | `User.orgId` is a single FK — a user belongs to exactly one org. No membership join table. Multi-org users / platform staff impossible without hacks. | P1 | schema / auth | Introduce `OrganisationMembership(userId, orgId, status)`; move role assignment to membership scope. `isPlatformAdmin` stays as the genuine global flag. Phased — keep `orgId` during expand. |
| A4 | No regional-settings fields on `Organisation`: no `baseCurrency`, `timezone`, `locale`, `dateFormat`, `numberFormat`, `firstDayOfWeek`, `fiscalYearStartMonth`, `country`, `legalName`, `taxIds`. | P0 | schema | Add `OrganisationSettings` (1:1) holding regional + fiscal config. Backfill existing row with today's implicit defaults (INR / Asia/Kolkata / en-IN / April fiscal start). |

### B. Hardcoded locale / currency / country / timezone

| # | Finding | Sev | Layer | Remediation |
|---|---|---|---|---|
| B1 | `src/lib/items/formatters.ts` hardcodes `` `Rs ${Intl.NumberFormat("en-IN", …)}` `` — a shared formatter used across modules. | P0 | lib | Replace with `formatMoney(amount, { currency, locale })` sourced from org settings (B/A4). No literal `Rs`/`₹` in shared code. |
| B2 | ~550 `INR`/`₹`/`Rs` occurrences, many in `accounting/*` client components and `ams/*`. Currency symbol assumed, not derived. | P0 | modules | Route all money rendering through the new `formatMoney`. Sweep module-by-module (tracked in `TASK.md`). |
| B3 | Literal timezone `Asia/Kolkata` / `IST` / `UTC+5:30` in core-ish libs: `src/lib/attendance-date.ts`, `src/lib/working-hours.ts`, `src/lib/ot.ts`, `src/lib/google-calendar-client.ts`, `src/modules/leave/calculation.ts`, `prisma/schema.prisma` (default). | P0 | lib / modules | Central `getOrgTimezone()` / `zonedNow(org)`. Store timestamps UTC (mostly already), render in org/user tz. Remove schema-level tz default or make it explicitly "seed default". |
| B4 | `en-IN` / `DD/MM/YYYY` literals (611 hits) in date rendering across modules. | P1 | modules | `formatDate(value, org)` helper; ban raw `toLocaleDateString("en-IN")` via lint rule. |
| B5 | `src/lib/gst-public-search.ts` — India GSTIN lookup sitting in shared `lib/`. India-specific integration in core namespace. | P2 | lib → module | Move to a `modules/tax-in/` or integration module; core exposes a generic `taxIdValidator` registry. |
| B6 | Fiscal year assumed April–March (2190 `april`/`fiscal` hits; `FiscalYear` model + accounting logic). | P1 | modules/accounting | Drive fiscal start from `OrganisationSettings.fiscalYearStartMonth`; keep April as the seeded default, not a constant. |
| B7 | `defaultJurisdictionCountry` / `defaultJurisdictionState` on `Organisation` are nullable strings with India-shaped semantics ("State"). | P2 | schema | Fine as free-form; document that "state/province/region" is locale-dependent. |

### C. Module system / industry terminology leakage

| # | Finding | Sev | Layer | Remediation |
|---|---|---|---|---|
| C1 | **No module registry.** `src/lib/app-edition.ts` gates features with a global `APP_EDITION` env var (`full`\|`cha`) and **hardcoded** `CHA_BLOCKED_ROUTE_PREFIXES` / `CHA_VISIBLE_NAV_SECTIONS` / `CHA_BLOCKED_API_PREFIXES` arrays. Not per-org, no dependency resolution, exactly the `if (edition === …)` anti-pattern. | P0 | core | Build `src/modules/core/module-registry/`: each module declares `{ id, name, version, dependsOn[], permissions[], nav[], settingsSchema, setupSteps[] }`. Persist per-org enablement in `OrgModule`. Middleware/nav read the registry, not literal arrays. `APP_EDITION` becomes a provisioning template, not runtime logic. |
| C2 | CHA / customs / freight terms in `src/lib/` (136 hits) incl. `cha-badges.ts`, `job-workspace-profile.ts`, `catalogue-data.ts`. Core lib knows about CHA. | P1 | lib → modules/cha | Move CHA-aware helpers into `modules/cha`. `src/lib/` must not import from a business module. |
| C3 | `src/lib/navigation.ts` + `route-labels.ts` likely enumerate every module's routes centrally (needs deeper check). Adding a customer's module ⇒ edit core nav file. | P1 | core | Nav entries contributed by each module via the registry (C1). |
| C4 | Seed `PERMISSIONS` catalogue in `prisma/seed.ts` is one flat list mixing `admin.*`, `hrms.*`, `cha.*`, `crm.customs_pricing.*`. Enabling only "Core + Accounting" still seeds CHA permissions. | P2 | seed / registry | Permissions declared per-module in the registry; seed composes from enabled modules. |
| C5 | Prisma model names are mostly domain-neutral; only 4 CHA-named columns found in schema and they're inside CHA tables — **schema is not the problem**, presentation and `lib/` are. | — | — | No DB rename needed (matches spec guidance). |

### D. Roles / departments / approvals hardcoded

| # | Finding | Sev | Layer | Remediation |
|---|---|---|---|---|
| D1 | `src/app/api/setup/route.ts` hardcodes `systemRoles = ["Admin","HR","Manager","TL","Director","Employee"]`. "TL" / "Director" are org-specific. | P1 | setup | Move to role **templates** in the provisioning template (§12); wizard lets installer edit before activation. Keep "Owner/Admin/Manager/Employee/Read-Only" as the generic default set. |
| D2 | Seed creates production-shaped data: `ORG = { name: "Adarsh Shipping & Services" }`, `DEFAULT_PASSWORD = "password@123"`, fixed departments/divisions, CHA document requirements, chart of accounts. This is one company's install, not a template. | P0 | seed | Split: (a) `seed.dev.ts` demo data (Adarsh), (b) a **provisioning service** that builds a new org from a template with no hardcoded company. Never ship `password@123` to a path reachable in production. |
| D3 | Maker-checker / segregation-of-duties exists **only** in `src/modules/accounting/authorization-planning/`. Not reusable for vendor creation, user-role changes, payroll, config changes. | P1 | core | Extract a platform `ApprovalRequest` engine (`modules/core/approvals/`): configurable N-level chains, "can't approve own action" policy, pluggable subject types. Accounting migrates onto it. |
| D4 | No `NumberingSequence` model / service anywhere. Document numbers generated ad-hoc per module (needs per-module confirmation). Concurrency-unsafe risk. | P1 | core | `NumberingSequence(orgId, legalEntityId?, moduleId, docType, fiscalYear?, prefix, padding, nextValue)` + `allocateNumber()` using a transactional `UPDATE … RETURNING` / row lock. |

### E. Setup / provisioning

| # | Finding | Sev | Layer | Remediation |
|---|---|---|---|---|
| E1 | `/api/setup` POST is bootstrap-once (checks `isPlatformAdmin` exists) and prod-gated by `SETUP_SECRET` header. **Good baseline.** | ok | — | Keep. Add a DB unique constraint / advisory lock so two concurrent bootstrap POSTs can't both pass the "no admin yet" check (E2). |
| E2 | Bootstrap check `findFirst({ isPlatformAdmin: true })` then `create` — TOCTOU race, no unique guard. | P2 | setup | Postgres partial unique index `WHERE isPlatformAdmin` OR wrap in `pg_advisory_xact_lock`. |
| E3 | `/setup` page + `demo-fill` / `DemoFillButton` / `getSetupDemoValues` ship in the auth bundle. Demo-fill helpers in a production auth route. | P2 | auth | Gate demo-fill behind `NODE_ENV !== "production"` at build (tree-shake), not just runtime. |
| E4 | **No guided Organisation Setup Wizard** (spec §3, steps 1–15). Only the 4-field bootstrap form exists. No regional step, structure step, module selection, roles, security policy, review/activate. | P0 | new | Build the multi-step, resumable, idempotent wizard writing to `OrganisationSettings` / `OrgModule` / role templates / `SetupProgress`. Activation is audited; setup data retained + editable in Settings. |
| E5 | No first-run / post-bootstrap redirect into onboarding; org is "active" immediately with zero config. | P1 | setup | `Organisation.activatedAt`; block business routes until required setup steps pass the readiness check (§15). |

### F. Custom fields — duplicated

| # | Finding | Sev | Layer | Remediation |
|---|---|---|---|---|
| F1 | **Three** custom-field implementations: `EmployeeProfileField` (schema:778), `CustomField` (schema:2881), `AccountingCustomFieldDefinition` (schema:5346). Different shapes, validation, permissions. | P1 | schema / core | Converge on one `CustomFieldDefinition(orgId, objectType, key, type, required, default, options, validation, help, visibility, permission)` + `CustomFieldValue`. Migrate the three consumers; keep old tables as views during contract phase. Ensure values can't bypass authz / execute code. |

### G. Observability / jobs / concurrency (spec §15–19)

| # | Finding | Sev | Layer | Remediation |
|---|---|---|---|---|
| G1 | Need to confirm structured logging vs `console.log`, `/health` + `/ready`, correlation IDs. `src/lib/request-performance.ts` / `performance.ts` exist — partial. | P1 | core | Audit in Phase 2. Add request/correlation ID middleware, structured logger, health/ready routes with no infra leakage. |
| G2 | Background-job abstraction: unknown. Bulk email / imports / PDF / webhooks may run inline in requests. | P1 | core | Inventory long operations; define a job abstraction (ID, status, retries, backoff, DLQ, org context, idempotency). |
| G3 | Idempotency keys: not observed on payment-like / import / provisioning actions. | P1 | core | Add `IdempotencyKey` table + wrapper for money-ish and provisioning endpoints. |
| G4 | Concurrency hotspots to verify: numbering (D4), leave balances, accounting posting, invitations, workflow transitions, org provisioning. | P1 | modules | Transactions + DB constraints + optimistic/row locks. Case-by-case in QA phase. |

### H. i18n / a11y / docs (spec §26, §27, §40)

| # | Finding | Sev | Layer | Remediation |
|---|---|---|---|---|
| H1 | No i18n framework; UI strings are inline English. Sentence concatenation present in places. | P1 | app | Introduce message catalogue (`next-intl` or similar); no new concatenated sentences. Existing strings migrated opportunistically. |
| H2 | Accessibility not yet audited against WCAG 2.2 AA. | P1 | app | Automated axe pass + manual on key flows; track in `ENTERPRISE_QA.md`. |
| H3 | Required doc set (§40) mostly absent: only security docs + `VERCEL_DEPLOYMENT.md` exist. Missing `ENTERPRISE_ARCHITECTURE.md`, `TENANCY_ARCHITECTURE.md`, `IDENTITY_ARCHITECTURE.md`, `MODULE_ARCHITECTURE.md`, `ORGANISATION_SETUP.md`, `OPERATIONS_RUNBOOK.md`, `BACKUP_AND_DISASTER_RECOVERY.md`, `INCIDENT_RESPONSE.md`, `DATA_RETENTION.md`, `DATA_CLASSIFICATION.md`, `INTEGRATION_ARCHITECTURE.md`, `API_SECURITY.md`, `ENTERPRISE_QA.md`, `SECURITY_CONTROL_MATRIX.md`, `PRODUCTION_READINESS.md`. | P1 | docs | Author alongside each implementation cluster; keep synced with code. |

---

## 3. What is already good (do not touch)

- Single centralised authorization (`Caps` / `rbac.ts`) — no duplicate permission systems.
- `orgId` denormalisation + tenant scoping from Stage 1/2 security.
- Bootstrap-once `/api/setup` with production secret gate.
- `src/modules/core/` exists as the intended home for platform code.
- Prisma model names are domain-neutral — **no table renames required**.
- Dedicated repo tooling: `architecture:check`, `design-system:verify`.

---

## 4. Remediation roadmap (clusters)

Ordered by dependency. Each cluster = migration + tests + docs + commit. Detail in `TASK.md`.

| C | Cluster | Delivers | Blocks |
|---|---|---|---|
| **1** | Regional settings foundation | `OrganisationSettings` model + `formatMoney` / `formatDate` / `getOrgTimezone` services; backfill defaults | B1–B6, E4 |
| **2** | Module registry | `modules/core/module-registry/` + `OrgModule`; retire `app-edition.ts` literals | C1–C4 |
| **3** | Legal entities & structure | `LegalEntity` (+ optional BU/CostCentre); re-parent Branch/Dept | A2, D4 |
| **4** | Membership model | `OrganisationMembership`; role scope on membership | A3, D1 |
| **5** | Numbering service | `NumberingSequence` + `allocateNumber()` | invoices/docs |
| **6** | Approval engine | `modules/core/approvals/`; accounting migrates onto it | D3 |
| **7** | Custom fields convergence | one `CustomFieldDefinition` + `CustomFieldValue` | F1 |
| **8** | Setup wizard | resumable multi-step onboarding + readiness check + `activatedAt` | E4, E5 |
| **9** | Provisioning templates | `Generic SME` / `Enterprise` / etc. as data; seed split | D2, D1 |
| **10** | Observability | correlation IDs, structured logs, `/health` + `/ready` | G1 |
| **11** | Jobs & idempotency | job abstraction + `IdempotencyKey` | G2, G3 |
| **12** | i18n scaffold | message catalogue, lint bans on locale literals | H1, B4 |
| **13** | Currency/date sweep | module-by-module migration onto Cluster 1 helpers | B2, B4 |
| **14** | Concurrency & DB review | locks/constraints on hotspots; index evidence | G4, §19 |
| **15** | Docs, QA audit, scorecard | §40 doc set, `ENTERPRISE_QA.md`, MNC scorecard, pentest scope | §35–43 |

### Migration safety

- All schema changes use **expand → backfill → migrate → contract**; old columns/tables kept
  until every reader is migrated. No destructive drops in the same deploy.
- **Concurrent-agent note:** another agent is doing UI-migration work (167 uncommitted files
  on `ams-completion` at audit time). Coordinate: check `git status` + pending migrations
  before every schema change; prefer additive migrations; commit in small reviewable slices.

---

## 5. Not in scope for Stage 2 (documented backlog)

- SCIM 2.0 endpoint — architecture path only (§29).
- SAML / Entra ID IdP — keep IAM extensible, don't implement (§28).
- Per-tenant CSS/branding beyond logo + name + templates (§10 guardrail).
- Compliance certifications (ISO/SOC/GDPR/HIPAA/PCI) — technical controls + honest gap doc only (§44).

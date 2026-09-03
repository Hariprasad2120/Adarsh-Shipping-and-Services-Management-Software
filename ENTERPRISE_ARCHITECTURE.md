# ENTERPRISE ARCHITECTURE — Monolith

> Stage 2 target: a reusable, configurable, industry-neutral enterprise platform.
> Companion docs: [`ENTERPRISE_ARCHITECTURE_AUDIT.md`](./ENTERPRISE_ARCHITECTURE_AUDIT.md)
> (Phase 0 findings), [`TASK.md`](./TASK.md) (execution tracker),
> [`TENANCY_ARCHITECTURE.md`](./TENANCY_ARCHITECTURE.md),
> [`MODULE_ARCHITECTURE.md`](./MODULE_ARCHITECTURE.md),
> [`IDENTITY_ARCHITECTURE.md`](./IDENTITY_ARCHITECTURE.md),
> [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md).

---

## 1. Two-layer model

```
┌──────────────────────────────────────────────────────────────────┐
│ MONOLITH CORE PLATFORM         src/modules/core/*  +  src/lib/*   │
│                                                                  │
│  Identity / RBAC        (Stage 1)    Regional & fiscal settings   │
│  Organisations / Tenancy            Module registry + entitlements│
│  Legal entities / structure         Numbering sequences          │
│  Membership + user lifecycle        Approval engine (maker-checker)│
│  Custom fields                      Configuration audit trail     │
│  Provisioning + templates           Observability (logs/metrics)  │
│  Background jobs + idempotency       i18n scaffold                │
│  Security / audit / sessions        Health / readiness           │
└───────────────▲──────────────────────────────────────────────────┘
                │ consume (one-directional)
┌───────────────┴──────────────────────────────────────────────────┐
│ BUSINESS MODULES              src/modules/<module>/*              │
│  cha  crm  accounting  hrms  payroll  attendance  leave  ams      │
│  communication  expense  freight-forwarding  items  recruit  …    │
└──────────────────────────────────────────────────────────────────┘
```

**Rule:** the core platform never imports from a business module. Business modules
consume the core. Industry behaviour (CHA, customs, freight, GST) lives in
modules / templates / configuration — never in the core.

---

## 2. Before Stage 2

- `Organisation` was a god-object with ~100 direct relations to every module.
- Single `User.orgId` FK — a user belonged to exactly one organisation.
- No legal-entity / business-unit / cost-centre layer.
- Currency (`INR`/`₹`), timezone (`Asia/Kolkata`), locale (`en-IN`), fiscal year
  (April) hardcoded across ~550–2200 sites.
- Module gating: a global `APP_EDITION` env var (`full` | `cha`) plus hardcoded
  route/nav blocklists.
- Maker-checker existed only inside Accounting; no reusable engine.
- No numbering service; three separate custom-field implementations.
- No provisioning flow; `prisma/seed.ts` builds one specific company.
- `/api/health` returned a static string; no `/ready`, no correlation ids, no
  structured logging.
- No background-job abstraction; no request idempotency primitive.
- No i18n; no configuration audit trail.

Full inventory: `ENTERPRISE_ARCHITECTURE_AUDIT.md` §2.

---

## 3. After Stage 2 — core platform primitives

| Capability | Module | Key artefacts | Commit |
|---|---|---|---|
| Regional / fiscal settings | `core/regional` | `OrganisationSettings`, `formatMoney`/`formatDate`/`zonedNow`, `getOrganisationRegionalSettings` | `1d28565c` |
| Module registry | `core/module-registry` | 17 `ModuleManifest`, `resolveEnabledModules` (dependency closure), `validateRegistry` (cycle detection), `getModuleForPath` | `c2ebfbb0` |
| Legal entities & structure | `core/organisation/legal-entity` | `LegalEntity` / `BusinessUnit` / `CostCentre`, `ensureDefaultLegalEntity`, `Branch.legalEntityId` | `b8d5af6d` |
| Membership & user lifecycle | `core/organisation/membership` | `OrganisationMembership`, status machine INVITED→ARCHIVED, `isPrimary` | `b15974c7` |
| Numbering sequences | `core/numbering` | `NumberingSequence`, `allocateNumber` (atomic, concurrency-safe), `{FY}` tokens, period reset | `f0960f8d` |
| Approval engine | `core/approvals` | `ApprovalPolicy`/`Step`/`Request`/`Decision`, N-level chains, no-self-approval, `openApprovalRequest`/`submitApprovalDecision` | `3fb88603` |
| Custom fields | `core/custom-fields` | `CustomFieldDefinition`/`Value`, 12 field types, declarative validation (no code execution), read/write permission gates | `ec452c12` |
| Configuration audit | `core/config-audit` | `ConfigAuditEntry` (append-only), `recordConfigChange`, redaction + diff | `893f2531` |
| Provisioning & templates | `core/provisioning` | `provisionOrganisation`, `Generic SME` / `Enterprise` templates (versioned data) | `078dbc59` |
| Observability | `core/observability` | correlation `AsyncLocalStorage`, structured JSON `logger`, `metrics`, `/api/health` + `/api/ready` | `a677d422` |
| Background jobs + idempotency | `core/jobs`, `core/idempotency` | `BackgroundJob` (retry/backoff/DLQ, `FOR UPDATE SKIP LOCKED`), `withIdempotency` | `3f11a952` |
| i18n scaffold | `core/i18n` | `translate` / `plural`, base `en` catalogue, shared-code locale lint | `bfccfc18` |

All twelve are **additive** — eight expand-phase migrations, no destructive
changes, existing behaviour preserved. Wiring the business modules onto these
primitives is tracked per-cluster in `TASK.md` as follow-up.

---

## 4. What is still coupled / pending

- Session, RBAC and `tenant.ts` still resolve org from `User.orgId`, not
  `OrganisationMembership` (Cluster 4 follow-up).
- `app-edition.ts` CHA blocklists not yet derived from the registry
  (Cluster 2 follow-up).
- Accounting keeps its own `AccountingLegalEntity` / `AccountingNumberSeries` /
  `AccountingApprovalPolicy` — link/migrate later.
- ~550 currency and ~578 `toLocale*` call sites not yet migrated (Cluster 13).
- Organisation Setup Wizard UI not built (Cluster 8).
- `prisma/seed.ts` still company-specific (Cluster 9 follow-up).

Honest status and scoring: `PRODUCTION_READINESS.md`.

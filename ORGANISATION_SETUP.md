# ORGANISATION SETUP — Monolith

> How a new organisation is stood up. Two paths: platform bootstrap (once per
> deployment) and organisation provisioning (per customer org).

---

## 1. Platform bootstrap

- `GET /api/setup` → `{ setupNeeded: boolean }` (true until a platform admin
  exists).
- `POST /api/setup` — creates the first `Organisation` + platform-admin `User`
  in one transaction, seeds system roles, assigns the admin role.
  - **Bootstrap-once:** refuses if any `isPlatformAdmin` user exists.
  - **Production-gated:** requires the `SETUP_SECRET` via `x-setup-secret` /
    `Authorization: Bearer` header (never query string).
  - `/setup` page is a 4-field form (org name, admin name, email, password).

**Known gaps (TASK.md Cluster 9):**
- Hardcoded `systemRoles = ["Admin","HR","Manager","TL","Director","Employee"]`
  in the route — should come from a template.
- TOCTOU race: `findFirst({ isPlatformAdmin })` then `create` with no unique
  guard. Fix: partial unique index or `pg_advisory_xact_lock`.
- `DEFAULT_PASSWORD = "password@123"` in `prisma/seed.ts` — must never be
  reachable in a production path (seed split pending).

---

## 2. Organisation provisioning (Stage 2)

`provisionOrganisation()` in `src/modules/core/provisioning/` composes the
platform primitives from a template:

1. Create (or target) the `Organisation` (name + de-duplicated slug).
2. `ensureDefaultLegalEntity` — one `isDefault` entity, `entityType` from template.
3. Regional settings — template defaults, then installer overrides
   (`writeOrganisationRegionalSettingsRaw`, cache-free).
4. Modules — `resolveEnabledModules(template.modules)` dependency closure,
   persisted via `setEnabledModuleIdsRaw`.
5. Roles — created if absent, permission keys granted (`skipDuplicates`).
6. Approval policies — `upsertApprovalPolicy` per template entry.
7. Numbering sequences — `upsertNumberingSequence` per template entry.
8. Config-audit entry (`source: "provisioning"`).

**Idempotent** — re-running with the same template tops up missing pieces
without duplicating. Verified E2E (commit `078dbc59`).

### Templates

`Generic SME`, `Enterprise` (versioned data in `templates.ts`). Regional
defaults are platform-neutral (USD / UTC / January fiscal start) — the installer
sets the real country / currency / fiscal year. `Professional Services` /
`Logistics` are the same shape, added on demand.

---

## 3. Guided Setup Wizard — planned (spec §3, steps 1–15) — NOT BUILT

The multi-step, resumable, idempotent wizard (`src/app/(dashboard)/setup/**`) is
not implemented. Design:

| Step | Writes to |
|---|---|
| 1 Organisation profile | `Organisation`, `LegalEntity` (legalName, registration, tax ids, address, logo, language) |
| 2 Regional settings | `OrganisationSettings` (country, tz, locale, formats, currency, fiscal year) |
| 3 Organisation structure | `LegalEntity` / `BusinessUnit` / `CostCentre` / `Branch` / `Department` |
| 4 Corporate domain | `OrgDomain` (DNS verification) — see `IDENTITY_ARCHITECTURE.md` §4 |
| 5 Identity & security | org auth policy, allowed methods, MFA requirement |
| 6 Roles & permissions | `Role` templates, custom roles |
| 7 Module selection | module entitlements (registry dependency resolution) |
| 8 Master data | statuses / categories / tax defs / payment terms / leave types |
| 9 Workflows & approvals | `ApprovalPolicy` from templates |
| 10 Branding & communication | logo, email sender, templates |
| 11 Users | invite / bulk / CSV import with validate → dry-run → commit |
| 12 Integrations | see `INTEGRATION_ARCHITECTURE.md` |
| 13 Data, privacy & retention | see `DATA_RETENTION.md` |
| 14 Data import / migration | upload → parse → validate → map → dry-run → execute → reconcile |
| 15 Final readiness check | health summary classified BLOCKING / WARNING / OPTIONAL, then **Activate Organisation** (audited; setup data retained + editable in Settings) |

State: `SetupProgress` table + `Organisation.activatedAt`; business routes gated
until required steps pass. `provisionOrganisation` becomes the wizard's "Activate"
implementation.

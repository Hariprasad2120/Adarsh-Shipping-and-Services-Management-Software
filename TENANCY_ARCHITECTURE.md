# TENANCY ARCHITECTURE — Monolith

> How Monolith isolates one customer organisation from another, and how a single
> organisation models legal entities, business units, branches and cost centres.
> Builds on the Stage 1 tenant-boundary work (`SECURITY_ARCHITECTURE.md`,
> `SECURITY_ROUTE_MATRIX.md`).

---

## 1. Hierarchy

```
Platform (single deployment / database)
└── Organisation            ← the tenant account (row-level isolation boundary)
    ├── OrganisationSettings ← 1:1 regional / locale / fiscal config
    ├── LegalEntity          ← ≥1 per org, exactly one isDefault
    │   ├── BusinessUnit     ← optional, self-referencing hierarchy
    │   │   └── CostCentre   ← optional
    │   ├── CostCentre       ← optional (entity-level)
    │   └── Branch           ← Branch.legalEntityId (nullable during expand)
    ├── Department / Division ← org-wide today (re-parent under entity later)
    ├── Role                 ← org-scoped RBAC roles
    ├── OrganisationMembership ← user ↔ org, per-org lifecycle status
    ├── Module entitlements  ← SystemSetting `org:<id>:enabled_modules`
    ├── ApprovalPolicy       ← per (org, subjectType, scopeKey)
    ├── NumberingSequence    ← per (org, [legalEntity], module, docType, scope)
    ├── CustomFieldDefinition← per (org, objectType, key)
    └── ConfigAuditEntry     ← append-only change history
```

A small organisation uses only the auto-created default `LegalEntity` and
ignores `BusinessUnit` / `CostCentre` entirely. An MNC / corporate group adds
subsidiaries as additional `LegalEntity` rows under the same tenant.

**Tenant account ≠ legal entity.** One `Organisation` (billing / login boundary)
can contain many legal entities operating in different countries, each with its
own `country`, `taxIdentifiers`, and numbering series.

---

## 2. Isolation model (Stage 1, unchanged)

- Every tenant-owned table carries a denormalised `orgId` with `@@index([orgId])`.
- The active org **always** comes from the session, never from the URL, body,
  query string, or a client-supplied id.
- Two safe query patterns (`src/lib/tenant.ts`):
  1. `db.x.findFirst({ where: { id, ...tenantWhere(actor.orgId) } })` — a wrong
     id returns nothing.
  2. `assertSameOrg(record, actor.orgId)` — throws `TenantAccessError(404)` on
     missing **or** cross-org, deliberately indistinguishable to a probe.
- `assertOrgMatchesSession` guards any client-supplied organisation identifier.
- Cross-tenant access is a Stage 1 test target; not weakened by Stage 2.

Stage 2 core services (`legal-entity.ts`, `membership.ts`, approval / numbering /
custom-field / config-audit services) all scope every by-id read and mutation to
the caller's `orgId`, mirroring `core/organisation/service.ts`.

---

## 3. Membership & multi-org (expand phase)

- `OrganisationMembership(orgId, userId)` unique; `status` ∈
  `INVITED | ACTIVE | SUSPENDED | DEACTIVATED | ARCHIVED` (spec §30);
  `isPrimary` marks the home org.
- Backfilled 1:1 from `User.orgId` (102 users → 102 primary memberships).
- **Not yet authoritative:** session / RBAC / `tenant.ts` still read `User.orgId`.
  Routing them through membership (resolve active membership, reject non-ACTIVE,
  org switcher) is the Cluster 4 follow-up; `User.orgId` is dropped in a later
  contract migration.

---

## 4. Migration discipline

All Stage 2 schema changes use **expand → backfill → migrate → contract**:

| Change | Phase | Contract step (pending) |
|---|---|---|
| `Branch.legalEntityId` | expand (nullable + backfill) | make NOT NULL after all writers set it |
| `OrganisationMembership` | expand (alongside `User.orgId`) | drop `User.orgId`, derive from primary membership |
| `OrganisationSettings` | additive 1:1, backfilled | — |

No destructive drops in the same deploy. Rollback SQL is in each
`prisma/migrations/*/migration.sql` header.

---

## 5. Cross-tenant cache safety (spec §21)

Cache keys for org-scoped reads include the org id:
`org:<orgId>:regional-settings`, `org:<orgId>:enabled_modules`, etc.
`unstable_cache` tags are org-scoped so one organisation's cached data is never
served to another. Provisioning / seed use the cache-free `*Raw` write paths.

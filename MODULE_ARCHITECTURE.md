# MODULE ARCHITECTURE — Monolith

> How Monolith describes, enables, and gates its business modules so a customer
> that does not use CHA never sees CHA. Source: `src/modules/core/module-registry/`.

---

## 1. Module registry

Every deployable capability is one `ModuleManifest` in
`src/modules/core/module-registry/registry.ts` — the single place to add a module.

```ts
type ModuleManifest = {
  id: ModuleId;              // matches the nav section id 1:1
  label: string;
  description: string;
  version: string;           // semver of the module's contract
  kind: "core" | "business"; // core = always enabled
  dependsOn: ModuleId[];     // transitive closure resolved on enable
  routePrefixes: string[];   // for proxy / nav gating
  permissionGroups: string[];// Permission.group values this module owns
  features?: { id; label; description; routePrefixes }[];
  capabilities?: string[];   // tags offered to other modules
};
```

17 manifests today: 4 core (`dashboard`, `todo`, `notifications`, `admin`),
13 business (`hrms`, `payroll`, `attendance`, `ams`, `lms`, `crm`,
`freight-forwarding`, `communication`, `expense`, `cha`, `accounting`,
`recruit`, `product-catalogue`).

### Verified dependencies

- `payroll → hrms` (32 code imports; enabling Payroll auto-enables HRMS).
- Runtime-only relations (`attendance`/`ams`/`lms`/`recruit` need HRMS employee
  data) are **not** declared yet — a wrong entry silently enables modules, so
  each is verified before being added.

---

## 2. Resolution & validation

- `validateRegistry()` runs at import: rejects unknown `dependsOn` targets,
  `core → business` dependencies, and cycles (DFS colouring). A malformed
  manifest fails the build.
- `resolveEnabledModules(requested)` → `{ enabled, autoAdded }`: core modules
  always included, plus the transitive `dependsOn` closure of the requested set.
  `autoAdded` is surfaced to the admin and recorded in the config-audit trail.
- `getModuleForPath(pathname)` → longest-prefix match
  (`/hrms/recruit/*` → `recruit`, `/hrms/*` → `hrms`).

---

## 3. Per-organisation entitlement

- Enabled business modules are stored in `SystemSetting`
  (`org:<orgId>:enabled_modules`, JSON array), read cached
  (`org:enabled-modules` tag), migration-safe defaulting.
- `setEnabledModuleIds()` runs `resolveEnabledModules` before persisting, so a
  dependency is never left unmet. `setEnabledModuleIdsRaw()` is the cache-free
  path for provisioning / seed.
- Navigation (`src/lib/navigation.ts`) filters sections by `isSectionEnabled`;
  feature sub-toggles by `isFeatureEnabled`.
- A parity test asserts the registry's ids / labels / descriptions / features
  stay in sync with the legacy `core/organisation/module-config.ts` tables —
  the build fails on drift.

---

## 4. Provisioning templates

`src/modules/core/provisioning/templates.ts` — reusable starting configurations
as **versioned data**, not hardcoded modes:

| Template | Modules | Approval policies | Numbering |
|---|---|---|---|
| `Generic SME` | hrms, attendance, crm | — | `crm/invoice INV-{FY}-` |
| `Enterprise` | + payroll, ams, accounting, communication, expense | `accounting.payment` (2-level), `core.user_role.change` | `accounting/journal`, `accounting/payment`, `crm/invoice` |

`provisionOrganisation({ template, organisation, overrides })` composes: org →
default legal entity → regional settings → modules (dep closure) → roles +
permission grants → approval policies → numbering sequences → config-audit entry.
Idempotent. `Professional Services` / `Logistics` are the same shape, added on
demand.

---

## 5. Pending

- Derive `app-edition.ts` CHA route/nav blocklists from the registry
  (behaviour-sensitive — current list is missing `/payroll`).
- Fold the `module-config.ts` `as const` id tuples to derive from the registry
  (needs type surgery on a widely-imported file).
- Move CHA-aware helpers out of `src/lib/` into `src/modules/cha`.
- Per-module `settingsSchema` and `setupSteps` fields (for the Setup Wizard).
- Optional `OrgModule` table to replace `SystemSetting` JSON (only if per-row
  history is needed).

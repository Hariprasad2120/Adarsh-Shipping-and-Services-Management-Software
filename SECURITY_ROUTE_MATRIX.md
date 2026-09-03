# SECURITY_ROUTE_MATRIX

Full-surface authorization / tenant-isolation review (the "BOLA sweep").

Scanner: `node scripts/scan-authz-matrix.mjs` (JSON) or `--md` (full table).
It classifies every `src/app/api/**/route.ts`, every `"use server"` file, and
every dynamic (`[id]` / `[...x]`) dashboard page against:

- **auth** — an authentication gate is referenced
- **permission** — an RBAC permission is checked
- **tenant** — an org / tenant scope is applied
- **inputSchema** — a Zod (or equivalent) DTO is parsed
- **writesDb** — the file performs a Prisma write

and raises flags: `NO_AUTH_GATE`, `BYID_NO_TENANT_SCOPE`,
`MUTATION_NO_PERMISSION_CHECK`, `WRITE_NO_INPUT_SCHEMA`.

The flags are **heuristics** — every one below was reviewed by hand. This
document records the conclusions; re-run the scanner for the live numbers.

---

## 1. Surface

| Kind | Count |
|---|---|
| API route files | 299 |
| `"use server"` action files | ~63 |
| Dynamic dashboard pages | ~59 |

## 2. Confirmed cross-tenant IDOR — FIXED this pass

| Route(s) | Defect | Fix |
|---|---|---|
| `api/org/branches/[id]`, `api/org/departments/[id]`, `api/org/divisions/[id]` (PATCH/DELETE) | `db.<x>.update/delete({ where:{ id } })` — an admin in org A could rename/delete org B's org-structure by id | `orgId` param + `assert<X>InOrg` guard in `organisation/service.ts`; routes pass `session.user.orgId` |
| `api/roles/[id]/permissions` (PUT), `deleteRole` | cross-org role permission edit / delete; also unvalidated permission ids | `assertRoleInOrg` + permission-id validation against the catalogue |
| `api/users/[id]/roles` (PUT) | cross-org role assignment **and** assigning a foreign org's role id | target user scoped to org; every `roleId` re-checked against the org (foreign ids dropped) |
| `api/users/[id]/password` (POST) | **any org admin could reset any user's password across orgs** | target user scoped to caller's org; min length raised to 12 |
| `api/ams/appraisals/[id]/*` (16 routes) | `getAppraisal(id)` / `finaliseHike(id,…)` etc. — `db.appraisal.findUnique({ where:{ id } })`, no org; cross-org read **and** write (hike %, ratings, reviews, meetings) | `assertAppraisalInOrg(id, orgId)` (`Appraisal` has no `orgId` — scoped via `cycle.orgId` OR `employee.orgId`) called at the top of every `[id]` route |
| `api/ams/cycles/[id]` (PATCH) | `activateCycle(id)` / `closeCycle(id)` — cross-org appraisal-cycle activate/close | `orgId` param + `assertCycleInOrg` |
| `api/leave/policies/[id]/{publish,archive,clone}` | `db.leavePolicyVersion.findUniqueOrThrow({ where:{ id } })` — cross-org publish/archive/clone (writes) | `orgId` param + `version.leaveType.orgId !== orgId` guard |
| `api/leave/policies/compare`, `api/leave/policies/[id]/compliance-check` | two/one version ids, no org — cross-org **policy-config disclosure** | `orgId` param + `findFirstOrThrow({ where:{ id, leaveType:{ orgId } } })` |
| `api/attendance/ot/[id]` (POST), `attendance/ot/actions.ts` | `decideOT(entryId,…)` — `db.oTEntry.update({ where:{ id } })` — cross-org OT approval (money) | `orgId` param + `oTEntry.findFirst({ where:{ id, user:{ orgId } } })` |
| `api/hrms/hr-cases/[id]/comments` (POST) | `addCaseComment(caseId,…)` — comment on any org's HR case; also unbounded message + raw error echoed | `orgId` param + `hRCase.findFirst({ where:{ id, orgId } })`; message trimmed to 5000 |

(Earlier clusters fixed `attendance/day-punches`, `crm/recordings/[id]/download`,
`hrms/employees/[id]/salary-structure`, `leave/policies/[id]` GET+DELETE.)

Regression tests: `src/lib/__tests__/cross-tenant-org-structure.integration.test.ts`
(9 cases, DB-backed) + `cross-tenant-isolation.test.ts`.

## 3. Reviewed — NOT a gap

| Flag / area | Why it is safe |
|---|---|
| `notifications/[id]/*`, `todos/[id]`, `todos/subtasks/[id]` | service scopes `where: { id, userId }` / `task: { userId }` — self-data |
| `mona/conversations/[id]`, `recruit/.../conversations/[id]` | `getXForUser(userId, id)` — self-scoped |
| `customer-portal/**` (`document-versions/[id]`, `checklists/[id]`, `notifications/[id]`, …) | scoped by the portal session's `portalUserId` / `customerId` / `orgId`; a separate identity stack |
| `attendance/leaves/[id]` | `decideLeaveRequestV2` validates approver-vs-request org and throws `CrossOrgAccessError` (the route catches it) |
| `NO_AUTH_GATE` on 4 `"use server"` files (`banking-statements-service`, `cha/customs/masters/actions`, `mona/settings`, `todo/service`) | service-layer modules that take an already-authenticated `userId`/`actorId`/`orgId` from their caller; `cha/customs/masters/actions` calls `requireCustomsMasterPermission` (the scanner's regex missed it) |
| `chat/*`, `mail/*`, `mona/*` `MUTATION_NO_PERMISSION_CHECK` | authenticated + self-scoped (own Google connection, own conversation); no separate RBAC permission exists for "use chat / use Mona" by design |
| `verify/[id]`, `quote-share/[token]` pages | intentionally public (letter verification, shared-quote link — token is the credential) |

## 4. Reviewed — lower-priority follow-ups (tracked, not Stage-1 blockers)

| Flag | Files (count) | Assessment | Plan |
|---|---|---|---|
| `WRITE_NO_INPUT_SCHEMA` | ~35 payroll / HR `*-actions.ts` | Server actions that take **typed function params**, not a raw `await request.json()` spread — mass-assignment risk is low, but a Zod DTO at each boundary is still owed | add `z.object` DTOs module-by-module |
| `MUTATION_NO_PERMISSION_CHECK` | ~58 | Most are authenticated + self-scoped or portal-scoped. **Reviewed:** `leave/delegations` (delegator is `session.user.id`) and `leave/restricted-holidays` (`userId` is `session.user.id`) are correct self-service — not gaps. **Fixed:** `hrms/announcements` POST and `hrms/reimbursement` POST now require `hrms.settings.manage` (were authenticated + org-scoped but had no permission gate on an org-wide / money-config action). | done |
| `BYID_NO_TENANT_SCOPE` on dashboard pages | `crm/customers/[id]/edit`, `crm/items/[id]`, `accounting/items/[id]`, `hrms/letters/view/[id]`, `[legacyRecordType]`, `[...slug]` | **Reviewed — false positives.** These are client components (`useParams` / `use(params)`) or pure `redirect()` shims; none load tenant data server-side. The actual data fetch happens in child components via already-guarded API routes (which carry the org scope). | no change needed |

## 5. CI

`scripts/scan-authz-matrix.mjs` runs in `.github/workflows/security.yml` and
`npm run security:check`. It reports the flag counts; the numbers above are the
reviewed baseline. A rising `NO_AUTH_GATE` or `BYID_NO_TENANT_SCOPE` count on a
new route is a signal to review before merge.

---

_Run `node scripts/scan-authz-matrix.mjs --md > /tmp/matrix.md` for the full
per-file table._

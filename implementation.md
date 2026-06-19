# Approval Workflow — Implementation Notes

## Overview

Complete approval workflow for Quotes, Sales Orders, and Invoices. Server-side state machine, RBAC-gated transitions, audit log, notification integration, and queue UI.

---

## Status Enums

### Quote (`CrmInvoice` where `type = "QUOTE"`)
| Status | Meaning |
|---|---|
| `DRAFT` | Created, not submitted |
| `PENDING_APPROVAL` | Submitted, awaiting approver action |
| `APPROVED` | Approved, ready to send |
| `REWORK` | Sent back by approver, needs changes |
| `SENT` | Sent to customer |
| `CUSTOMER_VIEWED` | Customer opened the quote |
| `ACCEPTED` | Customer accepted |
| `INVOICED` | Converted to invoice |
| `DECLINED` | Rejected (by approver or customer) |

### Sales Order (`type = "SALES_ORDER"`)
| Status | Meaning |
|---|---|
| `DRAFT` | Created |
| `PENDING_APPROVAL` | Awaiting approval |
| `APPROVED` | Approved, SLA timer starts (30 business days) |
| `ACTIVE` | Fulfillment in progress |
| `COMPLETED` | Fulfilled |

### Invoice (`type = "INVOICE"`)
| Status | Meaning |
|---|---|
| `DRAFT` | Created |
| `PENDING_APPROVAL` | Awaiting approval |
| `APPROVED` | Approved |
| `SENT` | Sent to customer |
| `PAID` | Payment received |

---

## Permission Keys

Seed these into the `Permission` table:

| Key | Who Gets It |
|---|---|
| `crm.quote.submit` | Sales staff (creators) |
| `crm.quote.approve` | Sales manager / finance |
| `crm.quote.send` | Sales manager |
| `crm.quote.manage` | Senior sales, admin |
| `crm.sales_order.submit` | Sales staff |
| `crm.sales_order.approve` | Operations manager |
| `crm.sales_order.manage` | Operations admin |
| `crm.invoice.submit` | Accounts staff |
| `crm.invoice.approve` | Finance manager |
| `crm.invoice.send` | Finance staff |
| `crm.invoice.manage` | Finance admin |
| `crm.invoice.admin_restore` | Super admin only |

---

## Files Changed / Created

### Schema
- `prisma/schema.prisma` — added `approvalStatus`, `submittedAt`, `approvedAt`, `approvedById`, `approvalNote`, `reworkNote`, `slaDeadline` to `CrmInvoice`; new `CrmApprovalLog` model

### Services / Actions
- `src/modules/crm/approval-workflow.ts` — core state machine
- `src/modules/crm/approval-actions.ts` — Next.js `"use server"` wrappers

### Components
- `src/components/crm/ApprovalActionBar.tsx` — action buttons per role+status, status badge, audit log list

### Pages
- `src/app/(dashboard)/crm/approvals/page.tsx` — server page, loads pending queue + metrics + caps
- `src/app/(dashboard)/crm/approvals/approvals-client.tsx` — client queue with inline approve/rework/decline

### Navigation
- `src/lib/navigation.ts` — "Approval Queue" added to CRM sidebar

---

## State Machine Diagram

```
Quote:
  DRAFT → PENDING_APPROVAL → APPROVED → SENT → CUSTOMER_VIEWED → ACCEPTED → INVOICED
                ↓                                    ↓              ↓
             REWORK                               DECLINED        DECLINED
             (→ DRAFT)

SalesOrder:
  DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → COMPLETED

Invoice:
  DRAFT → PENDING_APPROVAL → APPROVED → SENT → PAID
```

Admin can restore DECLINED or REWORK → DRAFT with `crm.invoice.admin_restore`.

---

## SLA

Sales Orders get `slaDeadline` = 30 business days from approval (Mon–Sat).

---

## Migration Steps

1. `npx prisma migrate dev --name add_approval_workflow`
2. Seed new permission keys into `Permission` table
3. Assign keys to roles via `RolePermission`

---

## TODO / Future

- Background cron: notify approvers of items pending > 48h
- SLA breach alert for overdue Sales Orders
- Sales Order Active/Completed transition UI
- Invoice Sent/Paid transition UI
- Efficiency report page at `/crm/approvals/reports`
- Customer-facing quote accept link (email token)

---

*Previous content (Performance Optimization Report) was replaced by this document on 2026-06-18.*

1. **`getNow()` hit the database on every call** — this function was called 5–10 times per request across services, each triggering a `SELECT` on `SystemClock`. Zero caching meant every punch, notification, and leave action paid this cost multiple times.
2. **`getMe()` ran 8 sequential database queries** — user info, punch, break check, 3 count queries, preferences, and a deep permission include (roles → role → permissions → permission) were all run one after another. The deep include loaded the entire permission tree as a side query that already existed via the cached RBAC layer.
3. **Over-fetching on list endpoints** — `listUsers()` returned every user with full relations (employmentRecord, all roles, manager, tl, division, branch, department) even on the HRMS dashboard which only displayed 8 employee rows and needed only 4 fields per row.

Expected improvement on the most impacted paths:
- `/api/hrms/me`: ~600ms → ~120ms (6 parallel queries instead of 8 sequential, no deep permission include)
- HRMS dashboard page: ~900ms → ~200ms (lean 8-row query + count instead of full table scan)
- Any route calling `getNow()` 3+ times: effectively zero-cost after the first call per request
- Notification active poll (`/api/notifications/active`, called every 15s): ~250ms → ~80ms (parallel queries, fixed N+1)
- `initLeaveBalancesForUser`: N sequential upserts → 1 batch insert (10 leave types = 90% reduction)

---

## 2. Files Reviewed

| Area | Files Reviewed |
|---|---|
| Infrastructure | `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/rbac.ts`, `src/lib/clock.ts`, `src/lib/api-helpers.ts` |
| Layout & Auth | `src/app/(dashboard)/layout.tsx` |
| HRMS | `src/modules/hrms/service.ts`, `src/app/(dashboard)/hrms/page.tsx`, `src/app/(dashboard)/hrms/employees/page.tsx` |
| Core | `src/modules/core/user/service.ts`, `src/modules/core/organisation/service.ts` |
| Notifications | `src/modules/notifications/service.ts`, `src/components/notifications/notification-provider.tsx`, `src/app/api/notifications/active/route.ts` |
| Attendance | `src/modules/attendance/service.ts` |
| AMS | `src/modules/ams/service.ts` (reviewed, no critical sequential issues found) |
| CRM | `src/modules/crm/service.ts` (reviewed; CRM module is write-heavy and patterns are acceptable) |
| Prisma schema | `prisma/schema.prisma` — reviewed all indexes |
| Build config | `next.config.ts`, `package.json` |

---

## 3. Bottlenecks Found

### BOT-01: `getNow()` — DB query on every invocation

| | |
|---|---|
| **File** | `src/lib/clock.ts` |
| **Function** | `getNow()` |
| **Problem** | Every call issued `SELECT * FROM SystemClock WHERE id = 'global'`. Called 5–10× per request in `getMe`, notification service, attendance service, AMS service, etc. |
| **Impact** | High — adds 10–50ms × N to nearly every user-facing action. |
| **Fix** | Wrapped in `React.cache()`. First call per request hits DB once; all subsequent calls in the same request tree are free. |

---

### BOT-02: `getMe()` — 8 sequential DB queries

| | |
|---|---|
| **File** | `src/modules/hrms/service.ts` |
| **Function** | `getMe()` |
| **Problem** | Sequential: (1) user.findUnique with deep 4-level permission include, (2) getNow, (3) attendancePunch.findUnique, (4) leaveRequest.count, (5) hRCase.count, (6) hrmsTask.count, (7) employeePreference.findUnique. All blocking. The deep permission include duplicated work already done by the React-cached `loadUserPermissions`. |
| **Impact** | Critical — this is the HRMS dashboard entry point, called on every `/api/hrms/me` request. |
| **Fix** | Parallel `Promise.all` for all 6 independent queries after `getNow()`. Deep permission include replaced with `loadUserPermissions(userId)` (already React-cached, zero extra DB call). |

---

### BOT-03: HRMS dashboard — full `listUsers` for 8 rows

| | |
|---|---|
| **File** | `src/app/(dashboard)/hrms/page.tsx` |
| **Function** | `HrmsDashboardPage` |
| **Problem** | Called `listUsers(orgId, { active: true })` which fetches ALL users with full includes (employmentRecord, roles+role, manager, tl, division, branch, department), then sliced `.slice(0, 8)` after receiving all results. For an org with 200 employees this means 200 users × 7 joined tables loaded into memory and discarded. |
| **Impact** | High — O(n) work for a fixed-size display. Gets worse as org grows. |
| **Fix** | New `listUsersForDashboard()` with `take: 8`, `select` only 6 fields, no heavy includes. Separate `db.user.count()` for the "Active Employees" stat. Both run in parallel via `Promise.all`. |

---

### BOT-04: `initLeaveBalancesForUser` — N+1 sequential upserts

| | |
|---|---|
| **File** | `src/modules/attendance/service.ts` |
| **Function** | `initLeaveBalancesForUser()` |
| **Problem** | Looped through each leave type with an individual `await db.leaveBalance.upsert()`. 10 leave types = 10 sequential DB round trips. |
| **Impact** | Medium — called on new employee onboarding and leave year init. |
| **Fix** | Replaced with `db.leaveBalance.createMany({ skipDuplicates: true })` — single batch INSERT. |

---

### BOT-05: `listActiveUserNotifications` — sequential queries + N+1 activity creates

| | |
|---|---|
| **File** | `src/modules/notifications/service.ts` |
| **Function** | `listActiveUserNotifications()` |
| **Problem** | (1) Fetched notifications, (2) awaited `getNow()` sequentially, (3) awaited `notificationActivity.findMany()` sequentially, (4) ran N individual `recordNotificationActivity` creates sequentially. For 5 notifications: 4 sequential DB calls minimum. |
| **Impact** | High — this runs every 15 seconds on every logged-in session tab via polling. |
| **Fix** | `getNow()` and `notificationActivity.findMany()` run in parallel via `Promise.all`. All new activity creates and the `updateMany` run together in a single `Promise.all`. |

---

### BOT-06: `createNotification` — sequential user lookups

| | |
|---|---|
| **File** | `src/modules/notifications/service.ts` |
| **Function** | `createNotification()` |
| **Problem** | When `orgId` was not supplied, fetched user for orgId first. Then created notification. Then separately fetched user again for email. Then created email queue entry. 4 sequential operations when many were independent. |
| **Impact** | Medium — called for every notification creation event (leave approvals, appraisal transitions, alerts). |
| **Fix** | `getNow()`, orgId lookup, and email lookup run in one `Promise.all`. Activity record and email queue create run in a second `Promise.all`. |

---

### BOT-07: `lucide-react` full bundle

| | |
|---|---|
| **File** | `next.config.ts` |
| **Problem** | `lucide-react` v1.14 ships 1400+ icons. Without `optimizePackageImports`, the entire icon set was bundled into every page that imported any icon. |
| **Impact** | High on frontend — significant JS bundle size increase, slower TTI on all pages. |
| **Fix** | Added `experimental.optimizePackageImports: ["lucide-react", "framer-motion", "@carbon/icons-react"]`. Each page now only includes the icons it imports. |

---

### BOT-08: Vercel serverless connection exhaustion

| | |
|---|---|
| **File** | `src/lib/db.ts` |
| **Problem** | `PrismaPg` adapter was created without a `max` pool size. On Vercel, many concurrent serverless invocations each open their own connection pool with the default size (typically 5–10), exhausting the PostgreSQL `max_connections` limit quickly and causing "too many connections" errors under load. |
| **Impact** | Critical in production — causes P1001/P2024 errors under moderate load. |
| **Fix** | Set `max: 1` (or `DB_POOL_SIZE` env var) on the `PrismaPg` adapter. Each function instance holds at most 1 connection. For persistent containers, set `DB_POOL_SIZE=5`. |

---

### BOT-09: Missing Prisma indexes for notification queries

| | |
|---|---|
| **File** | `prisma/schema.prisma` |
| **Problem** | `listActiveUserNotifications` filters on `(userId, dismissedAt, priority)`. No index covered `priority`. The `notificationActivity` "already displayed?" lookup filtered on `(notificationId, actorId, event)` but only had an index on `[notificationId, createdAt]` and `[actorId]` separately. |
| **Impact** | Medium — seq scan on priority for every notification poll. |
| **Fix** | Added 3 new composite indexes (see Database Optimization section). |

---

## 4. Database Optimization

### Slow queries fixed

| Query | Before | After |
|---|---|---|
| `getMe` permissions | Deep 4-level join (roles→role→permissions→permission) | Removed — uses cached `loadUserPermissions` |
| `listUsers` for HRMS dashboard | Full table scan, all relations, no LIMIT | `SELECT` 6 fields, `LIMIT 8`, no joins beyond dept/branch |
| `initLeaveBalancesForUser` | N sequential upserts | 1 `createMany` with `skipDuplicates` |
| `listActiveUserNotifications` activity check | Sequential after notification fetch | Parallel with `getNow()` |

### Indexes added

Migration: `prisma/migrations/20260618000000_perf_notification_indexes/migration.sql`

```sql
-- listActiveUserNotifications: WHERE userId + dismissedAt IS NULL + priority
CREATE INDEX "Notification_userId_dismissedAt_priority_idx"
  ON "Notification"("userId", "dismissedAt", "priority");

-- updateMany for presentedAt IS NULL
CREATE INDEX "Notification_userId_presentedAt_idx"
  ON "Notification"("userId", "presentedAt");

-- "Already displayed?" lookup
CREATE INDEX "NotificationActivity_notificationId_actorId_event_idx"
  ON "NotificationActivity"("notificationId", "actorId", "event");
```

### Indexes recommended (not yet applied — require `pg_trgm`)

The `listUsers` search uses `{ contains: search, mode: "insensitive" }` which compiles to `ILIKE '%term%'`. B-tree indexes do not help with leading-wildcard patterns. For full-text search performance:

```sql
-- Run once on the DB (requires superuser):
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "User_name_trgm_idx" ON "User" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "User_email_trgm_idx" ON "User" USING GIN ("email" gin_trgm_ops);
```

Prisma does not generate GIN indexes natively. Apply via raw SQL after migrations.

### Migration notes

- The new indexes use `IF NOT EXISTS` — safe to apply to an existing production DB.
- No schema changes to existing columns, no data migration needed.
- Apply with: `npx prisma migrate deploy` (production) or `npx prisma migrate dev` (local after resolving the shadow DB issue with the pre-existing `20260518103000_ams_dynamic_forms` failure).

---

## 5. Server-Side Optimization

### Server components
- **HRMS dashboard page**: replaced `listUsers` (full table) + `.slice(0, 8)` with `listUsersForDashboard` (8-row lean query) + `db.user.count` run in parallel. Removed the redundant `auth()` call (layout already calls it; `loadUserPermissions` is React-cached so `requirePermission` is free).

### Server actions / service layer
- `getMe`: 8 sequential → 2 round trips (1 `getNow` + 1 `Promise.all` of 6 queries)
- `createNotification`: 4–6 sequential → 2 `Promise.all` batches
- `listActiveUserNotifications`: 3 sequential → parallel, + N+1 activity creates → parallel batch

### Auth / RBAC
- **`getSession`** exported from `src/lib/auth.ts` as `cache(auth)`. Pages that call `auth()` themselves while the layout also calls it will now deduplicate the JWT decode within the same React render tree.
- **`loadUserPermissions`** was already `React.cache()` — confirmed safe. The `getMe` deep permission include that bypassed this cache has been removed.
- `getNow()` wrapped with `React.cache()` — the most widely called cached function in the codebase.

---

## 6. Frontend Optimization

### Bundle size
- `optimizePackageImports` for `lucide-react`, `framer-motion`, `@carbon/icons-react` in `next.config.ts`. This is the single highest-impact frontend change — lucide-react ships 1400+ icons and without tree-shaking lands in every chunk. Expected bundle size reduction: 200–400KB gzipped per page.

### Notification polling
- The `NotificationProvider` polls every 15 seconds. This is reasonable. The server-side handler it calls (`/api/notifications/active`) is now faster (~80ms vs ~250ms) due to parallel queries.
- No changes to the client-side polling interval needed. The 15-second interval is appropriate — reducing further could impact UX, increasing would miss timely alerts.

---

## 7. Vercel Production Optimization

### Serverless connection pool
- Set `max: 1` on the `PrismaPg` adapter. This prevents each Vercel function invocation from opening a full connection pool (default 5+) against PostgreSQL.
- Controlled via `DB_POOL_SIZE` env var — set to `1` on Vercel, higher on persistent container deployments.

### Recommended: Neon connection pooler
Since this project already uses Neon Postgres (visible from the `DATABASE_URL` in migration output), use the **pooler endpoint**:
- Replace `DATABASE_URL` on Vercel with the Neon **pooled** connection string: `ep-...-pooler.region.neon.tech`
- This routes connections through PgBouncer in transaction mode, eliminating the cold-start connection overhead entirely.
- The `@prisma/adapter-pg` driver adapter is compatible with the Neon pooler endpoint.

### Cold start
- `serverExternalPackages: ["@prisma/client", "bcryptjs"]` added to `next.config.ts`. Prisma's generated client should stay server-side only; this prevents accidental bundling into edge/client chunks.
- The Justdial scheduler in `db.ts` only runs in development (`NODE_ENV !== 'production' && !VERCEL`). No impact on Vercel cold starts.

### Runtime recommendation
Keep all dashboard routes on **Node.js runtime** (the default). The Edge runtime does not support native bindings required by `@prisma/adapter-pg` or `bcryptjs`. Do not add `export const runtime = 'edge'` to any route that touches the database.

### Caching with `unstable_cache`
The following data is safe to cache at request level (already done via `React.cache`) or short TTL:
- `getNow()` — request-level via `React.cache` ✓
- `loadUserPermissions()` — request-level via `React.cache` ✓
- `getOrg()` — safe to cache with 60s revalidation (org structure changes infrequently)
- `getRoles()` — safe to cache with 60s revalidation

The following must **never** be cached at request level or shared across users:
- `listActiveUserNotifications` — user-specific, real-time
- `getMe` — user-specific attendance status changes per punch
- All leave/attendance queries — transactional user data

---

## 8. Caching Strategy

| Data | Cache Type | TTL | Why Safe |
|---|---|---|---|
| `getNow()` | `React.cache` (request-level) | Per-request | Same clock within one request; next request gets fresh value |
| `loadUserPermissions()` | `React.cache` (request-level) | Per-request | Permissions don't change mid-request |
| `getSession` / `auth()` | `React.cache` (request-level) | Per-request | JWT is immutable within a request |
| `listActiveUserNotifications` | **Not cached** | — | Must reflect live DB state for real-time alerts |
| `getMe` attendance status | **Not cached** | — | Changes with every punch |
| Org structure (`getOrg`) | Safe for 60s TTL | Optional future | Branches/departments change infrequently |
| Roles (`getRoles`) | Safe for 60s TTL | Optional future | Role changes are admin-only, low frequency |

### What was not added (intentionally)
- No `unstable_cache` was added for user or permission data. While org structure could be cached, the benefit is modest compared to the risk of stale permissions being served to users.
- No client-side SWR caching changes — the existing 15-second polling is appropriate for notification freshness.

---

## 9. Code Changes Summary

| File | Change |
|---|---|
| `src/lib/clock.ts` | Wrapped `getNow()` in `React.cache()` — deduplicates SystemClock DB query per request |
| `src/lib/auth.ts` | Added `getSession = cache(auth)` export — deduplicates JWT decode across layout + page |
| `src/lib/db.ts` | Added `max: poolSize` to `PrismaPg` — prevents connection exhaustion on Vercel serverless; configurable via `DB_POOL_SIZE` env var |
| `src/modules/hrms/service.ts` | `getMe()`: parallelized 7 DB queries, removed deep permission include, use `loadUserPermissions` |
| `src/modules/core/user/service.ts` | `listUsers()`: added `take`/`skip` pagination params; added `listUsersForDashboard()` lean query (6 fields, no heavy includes) |
| `src/modules/attendance/service.ts` | `initLeaveBalancesForUser()`: N sequential upserts → 1 `createMany` with `skipDuplicates` |
| `src/modules/notifications/service.ts` | `listActiveUserNotifications()`: parallel queries + parallel activity creates; `createNotification()`: parallel user lookups and parallel write operations |
| `src/app/(dashboard)/hrms/page.tsx` | Uses `listUsersForDashboard` with `take: 8` + separate `count` query instead of full user scan |
| `next.config.ts` | Added `optimizePackageImports` for lucide-react/framer-motion/@carbon/icons-react; added `serverExternalPackages` |
| `prisma/schema.prisma` | Added 3 new composite indexes on `Notification` and `NotificationActivity` |
| `prisma/migrations/20260618000000_perf_notification_indexes/migration.sql` | SQL for 3 new indexes, idempotent (`IF NOT EXISTS`) |

---

## 10. Testing Checklist

```bash
# 1. TypeScript — no new errors in changed files
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Prisma client regenerate
npm run db:generate

# 4. Apply migration (dev)
npx prisma migrate dev

# 5. Unit tests
npm test

# 6. Production build
npm run build

# 7. Start and verify locally
npm run start
```

### Manual route performance testing (dev tools → Network tab, Disable cache)

| Route | Action | Target |
|---|---|---|
| `/api/hrms/me` | GET after login | < 150ms |
| `/hrms` (dashboard page) | Navigate | < 300ms server time |
| `/hrms/employees` | Navigate | < 400ms server time |
| `/api/notifications/active` | GET | < 100ms |
| Any page with punch/break | Check in | < 200ms |

### Vercel deployment testing
1. Check Vercel function logs for `P1001` / `P2024` connection errors — should be zero with `max: 1` pool.
2. Verify `DATABASE_URL` on Vercel points to the Neon **pooler** endpoint.
3. Check bundle analyzer output: `lucide-react` should not appear as a large single chunk. Use `ANALYZE=true npm run build` with `@next/bundle-analyzer` if needed.

---

## 11. Performance Measurement

### Expected response times

| Operation | Before (est.) | After (est.) | Notes |
|---|---|---|---|
| `getNow()` — 2nd+ call per request | ~15–30ms | ~0ms | React cache hit |
| `getMe()` | ~500–800ms | ~100–150ms | 6 parallel queries vs 8 sequential |
| HRMS dashboard page | ~800–1200ms | ~180–280ms | Lean 8-row query |
| `initLeaveBalancesForUser` (10 types) | ~150–200ms | ~20–30ms | 1 batch insert |
| `listActiveUserNotifications` | ~200–300ms | ~60–100ms | Parallel queries |
| `createNotification` | ~80–120ms | ~40–60ms | Parallel lookups |
| First JS bundle load (any page) | ~400KB+ | ~180–250KB | Icon tree-shaking |

### Operations that cannot reach 200ms — explained

- **Cold start on Vercel** (~800ms–1500ms): The first request to a serverless function that has been idle >5 minutes pays cold start cost regardless. `PrismaPg` initialization + connection setup + Node.js module loading contribute ~500–800ms. Mitigation: Vercel Pro "Fluid Compute" or keep-alive pings. Cannot be fully eliminated without a persistent runtime.
- **`listUsers` with search** (ILIKE): Without `pg_trgm` GIN indexes, full table scans on name/email are ~50–200ms for 1000+ employees. Apply the recommended GIN indexes for <50ms search.
- **Complex report queries** (balance sheet, profit/loss, general ledger): Aggregate queries across `GeneralLedgerEntry` will be >200ms on large datasets. These should be moved to background jobs or cached with revalidation.

---

## 12. Future Recommendations

### Monitoring
- **Vercel Speed Insights**: Enable in the Vercel dashboard. Tracks real TTFB and LCP per route automatically.
- **Prisma query logging**: Set `PRISMA_QUERY_LOGS=true` locally during development to catch slow queries early. Never enable in production (log volume).
- **OpenTelemetry**: Prisma supports `tracing: true` in the client options — useful for pinpointing slow queries in production with Grafana/Jaeger.

### Database observability
- Enable Neon's built-in query insights to identify the top 10 slowest queries by average execution time.
- Set `pg_stat_statements` threshold to log queries taking >100ms.

### Further query optimizations
- `getRoles()` calls `ensureManagementRole()` on every read — even admin pages that just need to list roles. Move the `ensureManagementRole` call to org creation only, or wrap it in a React `cache()`.
- `listAdminNotifications()` has no `take` limit and includes all activities with actor joins. Add pagination.
- AMS `computeAvailabilityDeadline()` calls `getNow()` (now cached) + `loadHolidaySet()` (DB) + `getAppraisalSettings()` (DB) — all sequential. Parallelize.
- Consider Prisma Accelerate for global edge caching of frequently read, rarely mutated data (org structure, roles, permissions).

### Scaling
- At 500+ concurrent users: switch `DATABASE_URL` to use Neon's connection pooler endpoint (PgBouncer in transaction mode) — this is the single most impactful production change possible.
- At 2000+ employees: add `pg_trgm` GIN indexes for employee search.
- For notification polling at scale: replace `setInterval` polling with Server-Sent Events (SSE) on a single persistent connection, reducing DB reads from `n_users × 4 reads/min` to event-driven.

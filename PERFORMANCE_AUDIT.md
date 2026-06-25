# Performance Audit — Monolith Engine

**Scope:** Every module page, server action, provider, and schema model.  
**Goal:** Internet speed is the only bottleneck.  
**Date:** 2026-06-25

---

## Already Fixed (this session)

| What | File | Impact |
|---|---|---|
| Notification polling reset on every navigation — `pathname` in useEffect deps | `src/components/notifications/notification-provider.tsx` | ~1.8s burst eliminated per nav |
| Todo reminder polling reset on every navigation | `src/components/todo/todo-reminder-agent.tsx` | ~2.4s burst eliminated per nav |
| AppHeader re-renders 60×/min due to `setInterval` clock state | `src/components/welcome-bar.tsx` | Header tree isolated; 60 re-renders/min → 0 |
| CHA job page — 4 sequential DB awaits after Promise.all | `src/app/(dashboard)/cha/jobs/[jobId]/page.tsx` | ~400ms saved per load |
| `getJobDetails` — sequential user→job→backfill→can→actors | `src/modules/cha/service.ts` | ~600ms saved; `take: 100` on auditLogs prevents unbounded fetch |
| `getEligibleManagers` — sequential permission + user queries | `src/modules/cha/service.ts` | ~200ms saved |

---

## Priority 1 — Fix First (>500ms savings each)

### 1. CRM Calls page — N+1 salesperson stats

**File:** `src/app/(dashboard)/crm/calls/page.tsx:109–124`

```typescript
// PROBLEM: loads ALL crmCallAttempts (with lead), ALL crmCallReviews, ALL crmCallAuditLogs
// for every active user, into memory, to compute counts in JS
const activeSalespeople = await db.user.findMany({
  where: { orgId, active: true },
  select: {
    crmCallAttempts: { select: { id: true, status: true, lead: { select: { isConverted: true } } } },
    crmCallReviews: { select: { rating: true } },
    crmCallAuditLogs: { select: { id: true } },
  },
});
```

As calls accumulate (hundreds per user), this loads thousands of rows per page visit.

**Fix:** Replace with aggregates:
```typescript
const salespersonStats = await db.user.findMany({
  where: { orgId, active: true },
  select: {
    id: true,
    name: true,
    _count: {
      select: {
        crmCallAttempts: true,
        crmCallReviews: true,
      },
    },
    crmCallAttempts: {
      where: { status: "COMPLETED" },
      select: { id: true },
    },
    crmCallReviews: { select: { rating: true } },
  },
});
// Use _count.crmCallAttempts for total calls, filter completed in one extra count query
```
Or use `$queryRaw` with GROUP BY for a single-pass aggregate.

---

### 2. Accounting Banking page — unbounded GL entries for balance computation

**File:** `src/app/(dashboard)/accounting/banking/page.tsx:15–28`

```typescript
// PROBLEM: loads ALL non-cancelled GL entries for every bank/cash account
// A mature ledger = thousands of rows, all transferred over the wire
include: {
  glEntries: {
    where: { isCancelled: false },
    select: { debit: true, credit: true },
  },
},
```

**Fix:** Use `_sum` aggregate — one DB call instead of N rows in memory:
```typescript
const bankAccounts = await db.account.findMany({
  where: { orgId, isGroup: false, isActive: true, accountType: { in: ["BANK", "CASH"] } },
  select: {
    id: true, accountCode: true, accountName: true, accountType: true,
    openingDebit: true, openingCredit: true,
    _count: false, // not needed
  },
});

// Aggregate balances in one query
const glSums = await db.generalLedgerEntry.groupBy({
  by: ["accountId"],
  where: {
    accountId: { in: bankAccounts.map((a) => a.id) },
    isCancelled: false,
  },
  _sum: { debit: true, credit: true },
});
```

---

### 3. CHA Reports page — 5 sequential awaits, unbounded advances

**File:** `src/app/(dashboard)/cha/reports/page.tsx:24–93`

```typescript
// PROBLEM: all sequential, and advances loads every receipt for every advance
const stageCounts = await db.chaJob.groupBy(...);    // sequential 1
const advances = await db.chaCustomerAdvance.findMany({
  include: { receipts: true },                       // no take — all advances + all receipts
});                                                   // sequential 2
const expenses = await db.chaExpensePayment.findMany(...); // sequential 3
const delayedFilings = await db.chaFiling.findMany(...);   // sequential 4 (has take: 10 ✓)
const auditLogsRaw = await db.chaAuditLog.findMany(...);   // sequential 5 (has take: 15 ✓)
const actors = await db.user.findMany(...);                // sequential 6 (depends on 5)
```

**Fix:**
```typescript
// Replace advances unbounded load with two aggregate queries:
const [stageCounts, advanceSums, expenseSums, delayedFilings, auditLogsRaw] = await Promise.all([
  db.chaJob.groupBy({ by: ["stage"], where: { orgId, deletedAt: null }, _count: { id: true } }),
  db.chaCustomerAdvance.aggregate({
    where: { job: { orgId, deletedAt: null } },
    _sum: { expectedAmount: true },
  }),
  db.chaCustomerAdvanceReceipt.aggregate({
    where: { advance: { job: { orgId, deletedAt: null } } },
    _sum: { amount: true },
  }),
  db.chaExpensePayment.aggregate({
    where: { request: { orgId, job: { deletedAt: null } } },
    _sum: { amountPaid: true },
  }),
  db.chaFiling.findMany({ where: {...}, include: {...}, orderBy: {...}, take: 10 }),
  db.chaAuditLog.findMany({ where: { orgId }, orderBy: { timestamp: "desc" }, include: {...}, take: 15 }),
]);
// actors query still sequential (needs actorIds from auditLogsRaw) — that's correct
```
This removes unbounded rows and parallelizes all independent queries.

---

### 4. Attendance OT page admin view — 5 sequential awaits after initial stats

**File:** `src/app/(dashboard)/attendance/ot/page.tsx:64–195`

```typescript
// PROBLEM: only stats are parallelized; then 5 more sequential awaits:
const [approvedOt, lopRecords, pendingCount] = await Promise.all([...]); // ✓

const otRecords = await db.otRecord.findMany(...);    // sequential
const holidays = await db.holiday.findMany(...);       // sequential
const lopRecordsDb = await db.employeeLop.findMany(...); // sequential
const otSettings = await db.otSettings.findUnique(...);  // sequential
const employees = await db.user.findMany(...);           // sequential
const branches = await db.branch.findMany(...);          // sequential
```

None of 2–6 depend on each other.

**Fix:**
```typescript
const [approvedOt, lopRecords, pendingCount, otRecords, holidays, lopRecordsDb, otSettings, employees, branches] =
  await Promise.all([
    db.otRecord.findMany({ where: { user: { orgId }, date: {...}, approvalStatus: "APPROVED" }, select: {...} }),
    db.employeeLop.findMany({ where: { user: { orgId }, payrollMonth: startOfMonth }, select: {...} }),
    db.otRecord.count({ where: { user: { orgId }, date: {...}, approvalStatus: { in: ["PENDING", "PENDING_MANAGER"] } } }),
    db.otRecord.findMany({ where: { user: { orgId }, date: {...} }, include: { user: {...} }, orderBy: [...] }),
    db.holiday.findMany({ where: { orgId, date: {...} }, include: { branch: {...} }, orderBy: [...] }),
    db.employeeLop.findMany({ where: { user: { orgId }, payrollMonth: startOfMonth }, include: { user: {...} } }),
    db.otSettings.findUnique({ where: { orgId } }),
    db.user.findMany({ where: { orgId, active: true, isPlatformAdmin: false }, select: {...} }),
    db.branch.findMany({ where: { orgId }, select: {...} }),
  ]);
```

---

### 5. CHA Dashboard page — 2 sequential awaits after large Promise.all

**File:** `src/app/(dashboard)/cha/page.tsx:116–130`

```typescript
// PROBLEM: 13-query Promise.all resolves, then two more sequential:
const pendingAdvances = await db.chaCustomerAdvance.findMany({
  where: { job: { orgId }, status: { in: ["FOLLOW_UP", "PARTIALLY_RECEIVED"] } },
  include: { receipts: true }, // no take — all advances + all receipts
});
const validityWarnings = await listDeliveryOrderValidityWarnings(...); // independent
```

**Fix:** Add both to the initial Promise.all, and replace advances with two aggregate calls:
```typescript
const [
  activeJobsCount, pendingChecklistsCount, ..., settings, branchNumberingRules,
  advanceSums, receiptSums, validityWarnings,
] = await Promise.all([
  // ... existing 13 queries ...
  db.chaCustomerAdvance.aggregate({
    where: { job: { orgId }, status: { in: ["FOLLOW_UP", "PARTIALLY_RECEIVED"] } },
    _sum: { expectedAmount: true },
  }),
  db.chaCustomerAdvanceReceipt.aggregate({
    where: { advance: { job: { orgId }, status: { in: ["FOLLOW_UP", "PARTIALLY_RECEIVED"] } } },
    _sum: { amount: true },
  }),
  listDeliveryOrderValidityWarnings(session.user.id, orgId),
]);
const totalOutstandingAdvance = Math.max(
  0,
  Number(advanceSums._sum.expectedAmount ?? 0) - Number(receiptSums._sum.amount ?? 0),
);
```

---

### 6. CHA Jobs list page — sequential jobs + validityWarnings + ensureSettings

**File:** `src/app/(dashboard)/cha/jobs/page.tsx:34–62`

```typescript
// PROBLEM: listJobs, validityWarnings, ensureSettingsAndDefaults all run sequentially
const jobsData = await listJobs(...);
const validityWarnings = await listDeliveryOrderValidityWarnings(...);
await ensureSettingsAndDefaults(orgId);
// ... then another Promise.all for branches/customers/etc
```

`validityWarnings` and `ensureSettingsAndDefaults` don't depend on `listJobs`.

**Fix:** Combine everything into one Promise.all:
```typescript
const [jobsData, validityWarnings, , branches, customers, ...] = await Promise.all([
  listJobs(session.user.id, orgId, { ... }),
  listDeliveryOrderValidityWarnings(session.user.id, orgId),
  ensureSettingsAndDefaults(orgId),
  db.branch.findMany(...),
  db.crmAccount.findMany(...),
  // ... rest of option queries
]);
```

---

## Priority 2 — High Value (100–500ms savings each)

### 7. CRM Enquiries page — 3 sequential count queries

**File:** `src/app/(dashboard)/crm/enquiries/page.tsx:62–73`

```typescript
const allEnquiriesCount = await db.crmLead.count(...);     // sequential 1
const perishableCount = await db.crmLead.count(...);        // sequential 2
const futureFollowCount = await db.crmLead.count(...);      // sequential 3
const enquiries = await listEnquiries(orgId, {...});         // sequential 4
```

**Fix:**
```typescript
const [allEnquiriesCount, perishableCount, futureFollowCount, enquiries] = await Promise.all([
  db.crmLead.count({ where: { orgId, isConverted: false, status: { in: ["INTERESTED", "FOLLOW_UP"] } } }),
  db.crmLead.count({ where: { orgId, isConverted: false, status: { in: ["INTERESTED", "FOLLOW_UP"] }, isPerishable: true } }),
  db.crmLead.count({ where: { orgId, isConverted: false, status: { in: ["INTERESTED", "FOLLOW_UP"] }, isFutureFollowUp: true } }),
  listEnquiries(orgId, { search, type }),
]);
```

---

### 8. AMS Extensions page — `checkIsAdmin` duplicates auth data

**File:** `src/app/(dashboard)/ams/extensions/page.tsx:11–18`

```typescript
async function checkIsAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } }, // full role tree
  });
  const roles = user?.roles.map((r) => r.role.name) ?? [];
  return roles.some((r) => ["Admin", "HR", "Management", "Director"].includes(r));
}
```

Auth middleware already loaded the session; `loadCaps` has RBAC in the per-request cache.

**Fix:**
```typescript
import { loadCaps } from "@/lib/rbac";

// Replace checkIsAdmin with:
const caps = await loadCaps(session.user.id);
const isAdmin = Boolean(
  caps["ams.cycle.manage"] || caps["ams.appraisal.manage"] || caps["hrms.admin"]
);
```
This hits the `unstable_cache` (5 min TTL) rather than doing a fresh DB query.

---

### 9. HRMS Employees page — `listUsers` has no default `take` limit

**File:** `src/modules/core/user/service.ts:53–57`

```typescript
return db.user.findMany({
  where,
  orderBy: { name: "asc" },
  ...(filters?.take !== undefined ? { take: filters.take } : {}), // no default take!
  include: { branch: true, department: true, ... },
});
```

The employees page calls `listUsers` without `take`, loading every employee's full record including branch, department, roles, and employment record. With 50+ employees each with full includes, this grows quadratically.

**Fix:**
1. Add server-side pagination to the employees page (pass `page`/`pageSize` to `listUsers`)
2. Or add a default `take: 100` in `listUsers` as a safety cap

---

### 10. Communication layout — sequential DB queries on every route change

**File:** `src/app/(dashboard)/communication/layout.tsx:24–28, 112–117`

```typescript
// Sequential 1: always runs
const connection = await db.googleWorkspaceConnection.findUnique({ where: { userId: session.user.id } });

// Sequential 2: runs only if connected
const workspaceSettings = session.user.orgId
  ? await db.googleWorkspaceSetting.findUnique({ where: { orgId: session.user.orgId } })
  : null;
```

This runs on every sub-route within `/communication`. Both can be parallelized and wrapped in `unstable_cache`.

**Fix:**
```typescript
const [connection, workspaceSettings] = await Promise.all([
  db.googleWorkspaceConnection.findUnique({ where: { userId: session.user.id } }),
  session.user.orgId
    ? db.googleWorkspaceSetting.findUnique({ where: { orgId: session.user.orgId } })
    : Promise.resolve(null),
]);
```
Additionally, wrap both in `unstable_cache` with `revalidate: 60` since connection status rarely changes.

---

## Priority 3 — Schema Indexes

Missing indexes that will hurt as data grows:

| Model | Missing Index | Why It Matters |
|---|---|---|
| `LeaveRequest` | `@@index([userId, status])` | Leave approval filters by user + status |
| `LeaveRequest` | `@@index([approverId, status])` | Approver dashboards filter pending leaves |
| `OTEntry` | `@@index([userId, date])` | OT history lookups filter by user + date range |
| `OTEntry` | `@@index([userId, status])` | Pending/approved OT lists |
| `AttendanceRegularization` | `@@index([userId, status])` | Has `@@unique([userId, date])` but status filter has no index |
| `AttendanceRegularization` | `@@index([status, createdAt])` | Admin approval queue sorts by time |
| `AppraisalCycle` | `@@index([orgId, status])` | All AMS queries filter ACTIVE cycles; currently only `[orgId, year]` |
| `Appraisal` | `@@index([cycleId, stage])` | Queries for appraisals in a specific stage within a cycle |
| `ChaCustomerAdvance` | `@@index([jobId, status])` | Advances filtered by job + payment status |
| `ChaExpenseRequest` | `@@index([orgId, status])` | Expense dashboard KPI count query |
| `GoogleWorkspaceConnection` | `@@index([userId])` | Communication layout runs this on every route — should be instant |

**To add:** Create a migration with these `@@index` additions in `prisma/schema.prisma` and run `npx prisma migrate dev`.

---

## Priority 4 — Low / Polish

### 11. CHA job workspace — full job object deep-cloned for RSC→Client boundary

**File:** `src/app/(dashboard)/cha/jobs/[jobId]/page.tsx:150`

```typescript
job={JSON.parse(JSON.stringify(data.job))}
```

`data.job` from `getJobDetails` includes all checklist imports, sections, items, documents, expense requests, and audit logs. `JSON.parse(JSON.stringify(...))` is a full deep clone of potentially MBs of data. This also blocks the RSC serialization step.

**Fix:** Create a typed `serializeJob()` helper that strips Date objects into ISO strings in-place without full cloning. Or restructure `getJobDetails` to return serialization-safe types directly.

---

### 12. CRM Calls page — hardcoded dark theme colors

**File:** `src/app/(dashboard)/crm/calls/page.tsx` (throughout)

Uses `bg-[#0f1319]`, `text-slate-300`, `text-slate-500`, `border-[#1c212a]`, `bg-[#0a0d12]`. These hardcoded dark values will be invisible/broken in light mode. Not a performance issue, but a correctness issue.

**Fix:** Replace with design system tokens (`bg-surface`, `text-on-surface`, `text-on-surface-variant`, `border-outline-variant`).

---

### 13. `listUsers` includes full branch/department/role objects by default

**File:** `src/modules/core/user/service.ts:58+`

Full `include: { branch: true, department: true, roles: { include: { role: true } } }` on every `listUsers` call. Most callers only need `id, name, email`. The HRMS dashboard already uses a separate `listUsersForDashboard` with field selection — that pattern should be applied to other callers.

**Fix:** Change `listUsers` to accept a `select` override. Default to minimal fields, let callers opt into full includes.

---

## Summary by Expected Impact

| # | File/Area | Estimated Saving | Type |
|---|---|---|---|
| 1 | CRM Calls — N+1 salesperson stats | 1–5s (at scale) | N+1 → aggregates |
| 2 | Banking — unbounded GL entries | 500ms–3s (at scale) | Unbounded → aggregate |
| 3 | CHA Reports — 5 sequential queries | ~800ms | Sequential → parallel |
| 4 | OT page — 5 sequential admin queries | ~600ms | Sequential → parallel |
| 5 | CHA Dashboard — advances unbounded + sequential | ~500ms | Sequential + unbounded |
| 6 | CHA Jobs list — 3 sequential queries | ~400ms | Sequential → parallel |
| 7 | CRM Enquiries — 3 sequential counts | ~200ms | Sequential → parallel |
| 8 | AMS Extensions — redundant DB query | ~150ms | Cache hit vs DB round-trip |
| 9 | HRMS Employees — no pagination | ~300ms+ (at scale) | Unbounded → paginated |
| 10 | Communication layout — sequential DB | ~150ms | Sequential → parallel |
| 11–13 | Schema indexes | ~50–300ms per query | Index misses → hits |

---

## What Is Already Well-Optimized

- **RBAC / `loadCaps`**: `React.cache()` (per-request dedup) + `unstable_cache` (5 min TTL). Hits cache on repeated calls per request.
- **Module settings / `getEnabledModuleIds`**: `unstable_cache` with 5 min revalidate.
- **Dashboard layout**: `Promise.all([loadCaps, getEnabledModuleIds])` — both cached.
- **ChaJob indexes**: `[orgId, deletedAt]`, `[orgId, stage, status]`, `[orgId, jobNumber]`, `[orgId, branchId, createdAt]`, `[orgId, jobTypeId, createdAt]` — comprehensive.
- **Notification indexes**: `[userId, dismissedAt, priority]`, `[userId, presentedAt]` — well-covered.
- **HRMS dashboard**: `listUsersForDashboard` with `take: 8` and minimal select.
- **Todo indexes**: `[userId, status, dueDate]`, `[userId, reminderEnabled, alertAt]` — good coverage.
- **AttendancePunch**: `@@unique([userId, date])` + `@@index([userId, date])` — correct.
- **CHA job `getJobDetails`**: user + job parallelized; actors + backfill + can() parallelized; `take: 100` on auditLogs (fixed this session).

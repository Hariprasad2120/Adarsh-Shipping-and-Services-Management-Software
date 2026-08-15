# Leave Management — Final Closure Audit

Started: 2026-08-14 (continuation session)
Source spec: user's "MONOLITH LEAVE MANAGEMENT — FINAL CLOSURE PASS" (54 items)

## 0. Scope reality check (recorded, not glossed over)

The 54-item closure spec, taken literally and completely, is several weeks
of additional engineering: a decimal/integer-unit ledger migration, a full
9-step visual policy wizard, a real Postgres E2E test harness (Docker),
a Playwright suite, distributed-lock scheduler safety, calendar-provider
adapters, delegation/escalation engine with SLA reminders, and more.

User was asked directly whether to attempt all 54 items thinly or a
prioritized subset thoroughly. **User chose: commit+push first, then work
top-priority items in order by actual risk**, with an honest completion
matrix rather than a false "complete" claim.

This document tracks exactly what was done in this closure pass, in the
same DONE / BLOCKED_EXTERNAL / NOT_YET vocabulary as TASKFILE.md's final
matrix (§53 of the spec explicitly forbids PARTIAL/TODO/LATER for core
requirements — NOT_YET here means "not attempted in this pass," tracked
honestly, not disguised as done).

---

## 1. Git state (§1 of spec)

**Before this pass:**
- Branch: `main`
- 127 changed paths (mix of this session's leave-management work and
  substantial pre-existing uncommitted changes: CRM, accounting UI
  migration, HRMS letters/salary, design-system CSS, dev-console — none
  of that pre-existing work was touched by the leave-management build)
- Nothing committed, nothing pushed
- Remote: `origin` → `https://github.com/Hariprasad2120/Adarsh-Shipping-and-Services-Management-Software.git`

**User's explicit choice**: commit everything together on `main` (not a
separate branch), since asked directly whether to scope the commit to
leave-only files.

**Action taken:**
```
git add -A
git commit -m "Add Leave Management module (...) Also includes pre-existing
  uncommitted work across CRM, accounting, HRMS, and UI design-system
  migration that was present in the working tree before this session."
```

**Result (initial commit):**
- Commit SHA: `0a8685503f91196a1f426b1c8cd188bd2cdb8028`
- Branch: `main`
- Working tree: clean
- Push at this point: BLOCKED_EXTERNAL — `git push origin main` was denied
  by the Claude Code environment's auto-mode permission classifier, despite
  explicit user confirmation. Reported to the user rather than worked
  around.

**After the closure-pass fixes below (§2-§9 etc.), a second commit was
made and push was retried:**
- Commit SHA: `3708ad07a367756313c8320299f0a7febb650a91`
- `git push origin main` **succeeded this time**: `05a8714..3708ad0
  main -> main`

**Round 2 (transaction-ordering fix, reconciliation tool, exit handling,
docs tracking):**
- Discovered mid-round that `docs/leave-management/*.md` (all 9 markdown
  docs written across this entire build — audit, research, architecture,
  gap analysis, task file, final report, this file) were NEVER actually
  committed, despite `git add -A` appearing to succeed earlier. Root cause:
  `.gitignore` has a repo-wide `/docs/*` rule; `git add -A` silently
  respects `.gitignore` unless `-f` is passed, so every `git add -A` in
  this project quietly skipped the entire `docs/leave-management/`
  directory. User was asked and chose to `git add -f` that directory
  specifically, leaving the repo-wide ignore rule untouched for everything
  else.
- Commit SHA: `620dd9dfe703b05d83ddff354c011de61f437cad`
- `git push origin main` succeeded: `3708ad0..620dd9d main -> main`
- `git status --short` → 0 lines, working tree clean, all docs now
  tracked and live on GitHub.

No sensitive files (`.env`, credentials, keys, dumps) were present in the
change set — checked via `git status --short | grep -iE` before staging.

---

## 2. Legacy consolidation verification (§2)

Searched every `db.leaveRequest.create|update` and `db.leaveBalance.update*|create|upsert`
call site across `src/`. Found **two real bypasses that had escaped the
Phase 6 consolidation**, both fixed:

1. **`src/modules/hrms/service.ts:executeApprovalDecision`** — a third,
   previously-undiscovered leave-approval code path (live at
   `POST /api/hrms/approvals`) wrote `LeaveRequest.status` directly,
   completely bypassing the ledger, self-approval guard, audit log, and
   attendance/payroll bridges. Fixed: now delegates to
   `decideLeaveRequest()` from `src/modules/leave/request.ts`.
2. **`src/modules/attendance/service.ts:initLeaveBalancesForUser`** —
   legacy opening-balance seeding wrote `LeaveBalance.balance` directly via
   `createMany`, with zero corresponding `LeaveLedgerEntry` — an audit-trail
   gap for every new joiner. Fixed: now posts one `OPENING_BALANCE` ledger
   entry per applicable published policy via `postLedgerEntry`, respecting
   applicability rules.

Note: this function was not called from any live route at the time of the
fix (dead code path), but is part of the module's public surface and
directly relevant to §31 (new-joiner automation), so fixing it now avoids
reintroducing the exact bug once that wiring is built.

**Verification after fix**: re-ran the grep — the only remaining
`db.leaveBalance.update` calls outside `src/modules/leave/` are none;
the only remaining direct writes are inside `src/modules/leave/reset.ts`
(updating `nextResetDate`, not `balance` — legitimate) and inside
`src/modules/leave/*` itself (the authoritative engine). **Status: DONE.**

---

## 3. Float-based accounting risk (§3) — DONE

User was asked whether to do a lighter round-on-write fix or the full
Decimal/NUMERIC migration; **chose the full migration**.

**Proved the risk is real** before migrating (not just asserted it):
`10 - 100*0.1` in Node.js evaluates to `1.879...e-14`, not `0`. Day/half/
quarter-day fractions (multiples of 0.25) are exactly representable in
IEEE-754 and don't drift, but arbitrary fractions and long-running
accumulation do.

**Migration performed:**
- `prisma/schema.prisma` — every leave-accounting field converted from
  `Float` to `Decimal @db.Decimal(10, 4)`: `LeaveType.defaultBalance`,
  `LeaveBalance.balance`, `LeaveRequest.{computedDurationUnits,paidUnits,
  lopUnits}`, `LeavePolicyVersion.roundingIncrement`, `LeaveLedgerEntry.
  {quantity,balanceBefore,balanceAfter}`, `CompOffCredit.units`,
  `LeaveGrant.amount`. 10 fields across 7 models.
- **This changes the migration's risk profile** — earlier phases' migration
  was 100% additive (new columns/tables only). This round's regenerated
  migration SQL includes `ALTER COLUMN "balance" SET DATA TYPE DECIMAL(10,4)`
  and the same for `defaultBalance` on **existing, currently-populated
  columns**. Postgres can implicitly cast `double precision` → `numeric`,
  so this is mechanically safe, but it is a real type-changing operation on
  live data, not purely additive. Still unapplied (same live-DB-write-denied
  blocker as before — see Blocker #0 below), so this has not yet run
  against real data, but the operator applying it must know this is no
  longer a pure ADD-COLUMN migration.
- `src/modules/leave/ledger.ts` — added `toDecimal()` helper; `postLedgerEntry`
  now does all balance arithmetic (`.plus`, `.minus`, `.isNegative`) in
  `Prisma.Decimal`, never JS float addition on the balance itself.
- `src/modules/leave/calculation.ts` — the paid/partial-pay/LOP split (the
  actual money-shaped decision logic) now runs entirely in Decimal;
  converts to `number` only at the final return boundary for API/frontend
  ergonomics.
- `src/modules/leave/{request,reset,reports}.ts` — updated every call site
  touching these fields to use Decimal arithmetic (`.plus`/`.minus`/
  `.greaterThan`/`.toNumber()`) instead of native `+`/`-`/`>`.
- Two page components (`hr-console/page.tsx`, `attendance/leaves/page.tsx`)
  updated to convert `Decimal` → `number` at the server/client serialization
  boundary (Decimal instances aren't serializable to client components).

**Regression tests added** (`src/modules/leave/__tests__/ledger.test.ts`,
new `describe` block) proving the exact scenarios the spec named:
- `0.1 + 0.2` (as ledger quantities) sums to exactly `0.3`, not
  `0.30000000000000004`
- 1000 sequential 0.25 accruals sum to exactly `250`
- 96 accumulations of `1/96` (15-minute-of-day fraction) sum to exactly
  `0.9984` every run, not float noise
- Three uneven partial-cancellation reversals (1.1 + 2.2 + 1.7) sum back to
  exactly the original 12.5 balance

**Verification**: `npx tsc --noEmit` — 0 errors, full repo. Full leave test
suite: 55/55 passing (was 51; +4 new drift tests). Production build:
confirmed separately (see §51 section below).

**Status: DONE** — code-complete and tested. Applying the migration to a
real database remains BLOCKED_EXTERNAL (same DB-write-denial as documented
throughout this project).

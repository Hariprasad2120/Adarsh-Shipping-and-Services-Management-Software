# Leave Management — Legacy Data Backfill Strategy

Read this before enabling the ledger-based engine for an organisation that
already has leave history recorded under the pre-ledger model (a
`LeaveBalance` row with a bare `balance` number and no corresponding
`LeaveLedgerEntry` rows explaining how it got there).

## Why this is needed

The ledger (`LeaveLedgerEntry`) is the accounting source of truth as of
this closure pass — `LeaveBalance.balance` is a materialized projection
that must always be derivable by summing the ledger. Any balance that
predates the ledger has no entries backing it. Left alone, this is
harmless (the reconciliation tool in `reconciliation.ts` treats it as
drift and reports it), but it means:

- `getMaterializedBalance()` and every downstream flow (approval,
  cancellation, reports) keep working correctly off the raw balance number
  regardless of backfill — nothing is *broken* by not backfilling.
- What's missing without backfill: an audit trail. `getLedgerReport()`,
  `getAccrualHistoryReport()`, and any "how did this employee get to their
  current balance" investigation will show a gap for the pre-ledger period.

Backfill is therefore a data-completeness/auditability improvement, not a
correctness blocker — do not treat "we haven't backfilled yet" as reason to
delay go-live.

## Procedure

1. **Snapshot first.** Follow `DATABASE-ROLLOUT.md` Step 1 (backup) before
   running anything against a persistent database.

2. **Run the reconciliation report per org/year** to enumerate every
   balance with no ledger backing it:
   ```ts
   import { reconcileOrgBalances } from "@/modules/leave/reconciliation";
   const drift = await reconcileOrgBalances(orgId, year);
   ```
   Every row where `ledgerDerivedBalance === 0` and `materializedBalance !== 0`
   is a legacy balance with zero ledger history — the backfill candidate
   set. (A non-zero `ledgerDerivedBalance` alongside a mismatch is a
   *different* problem — genuine drift from a bug or bypassed write path —
   and must NOT be backfilled the same way; investigate the cause instead
   of masking it with an OPENING_BALANCE entry.)

3. **For each backfill candidate, post one `OPENING_BALANCE` ledger entry**
   dated to the start of that balance's `year`, for exactly the
   pre-existing `balance` amount, with `source: "IMPORT"` (not `"SYSTEM"`,
   so it's distinguishable in reports from a real day-1 policy-driven
   opening balance) and a `reason` that names this backfill:
   ```ts
   await postLedgerEntry({
     orgId, userId, leaveTypeId,
     type: "OPENING_BALANCE",
     quantity: existingBalance, // the pre-ledger balance.balance value, unchanged
     effectiveDate: new Date(year, 0, 1),
     year,
     source: "IMPORT",
     reason: `Legacy balance backfill — pre-ledger balance carried forward as-is, no recalculation`,
     idempotencyKey: `backfill-opening:${userId}:${leaveTypeId}:${year}`,
   });
   ```
   The idempotency key makes this safe to re-run; a second run is a no-op
   for any user/type/year already backfilled.

4. **Do not touch `LeaveBalance.balance` directly.** `postLedgerEntry`
   already updates the materialized balance as part of posting the entry —
   in this case the ledger sum should land back on the exact same number
   the balance already held, since nothing is changing except adding the
   audit trail. If it does NOT land on the same number, stop: that means
   the "legacy balance" case (2) above misclassified genuine drift as a
   clean backfill candidate. Re-run reconciliation and investigate instead
   of proceeding.

5. **Re-run `reconcileOrgBalances`** after backfilling — the org should now
   report zero drift rows (or only genuine-drift rows requiring
   `repairBalanceDrift`, which is deliberately a separate, explicit-reason
   operation from backfill).

## What this deliberately does NOT do

- **No bulk script is committed.** The reconciliation-report → per-row
  `postLedgerEntry` loop above is a 10-line operator script, not packaged
  as a CLI here, because the exact scope (which orgs, which years, whether
  `source: "IMPORT"` needs org-specific provenance detail) depends on real
  legacy data this repo does not have access to. Wrapping it in a
  one-command script before seeing real legacy data risks either being too
  narrow (breaks on the first org with a different shape of drift) or
  silently masking genuine bugs as backfill. The procedure above is
  deliberately step-by-step and requires a human to review each org's
  reconciliation output before running the loop, not run unattended.
- **No automatic backfill on deploy.** Backfill is a one-time, per-org,
  operator-initiated action, never something that runs implicitly when
  the ledger schema is deployed.

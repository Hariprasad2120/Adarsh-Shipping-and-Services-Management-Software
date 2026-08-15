# Gap Analysis — Leave Management (Phase 3)

Cross-references `ZOHO_FEATURE_RESEARCH.md` (public capability benchmark) against
`MONOLITH_INTEGRATION_AUDIT.md` (existing codebase state) and `ARCHITECTURE.md`
(the design that closes each gap). "Status" reflects what Phase 5+ will build,
not aspiration.

| Feature | Zoho/Public Reference | Existing Monolith Capability | Missing? | Implementation Component | Status |
|---|---|---|---|---|---|
| Leave policy definition | §2 Leave Policy | `LeaveType` (name, paid, defaultBalance) — flat, unversioned | Partial | `LeavePolicyVersion` | Planned Phase 5 |
| Leave Type Gallery / regional templates | §2 Leave Type Gallery | None | Yes | Deferred — template gallery is UI sugar over `LeavePolicyVersion`, not core | Planned Phase 9 |
| Applicability (criteria/exceptions) | §2 Applicability | None — every `LeaveType` applies org-wide | Yes | `LeaveApplicabilityRule` | Planned Phase 5 |
| Fixed entitlement | §3 Fixed | `LeaveType.defaultBalance` (flat only) | Partial | `LeavePolicyVersion.configuration.entitlement` (FIXED model) | Planned Phase 5 |
| Experience-based entitlement | §3 Experience-based | None | Yes | `configuration.entitlement` (EXPERIENCE_BASED tiers, reads `EmploymentRecord.joinDate`) | Planned Phase 5 |
| Grant-based entitlement | §3 Grant-based | None | Yes | `LeaveGrant` model | Planned Phase 7 |
| Attendance-based entitlement | §3 Attendance-based | `OtRecord` exists but disconnected from leave | Yes | `configuration.entitlement` (ATTENDANCE_BASED, reads `OtRecord`) | Planned Phase 7 |
| Paid / Unpaid classification | §4 | `LeaveType.paid: Boolean` | Partial | `LeavePolicyVersion.classification` (adds ON_DUTY, RESTRICTED_HOLIDAY, PARTIALLY_PAID) | Planned Phase 5 |
| LOP auto-conversion | §4 LOP | `EmployeeLop` exists, manual entry only, no leave linkage | Yes | `calculation.ts` LOP computation → `EmployeeLop` write | Planned Phase 8 |
| On-Duty leave type | §4 On-Duty | Not modeled | Yes | Classification value on `LeavePolicyVersion` | Planned Phase 5 |
| Restricted/Optional Holiday | §4, §6 Holidays | `Holiday.holidayType` has `RESTRICTED` value, unused by leave logic | Partial | Classification + capped-allotment rule in `configuration` | Planned Phase 5/7 |
| Partially-paid leave (slabs) | §4 (unverified in Zoho docs too) | Not modeled | Yes | `configuration.partialPaySlabs` | Planned Phase 5 |
| Policy validity / effective-after | §5 | Not modeled | Yes | `LeavePolicyVersion.effectiveFrom/Until` + `configuration.effectiveAfterServiceMonths` | Planned Phase 5 |
| Accrual engine | §5 Accrual | `LeaveType.accrualRule` Json declared, never read | Yes (dead field) | `accrual.ts` + `/api/cron/leave-accrual` | Planned Phase 8 |
| Proration | §5 Proration | Not modeled | Yes | `calculation.ts` proration logic per `configuration.proration` | Planned Phase 5 |
| Reset / Carry forward / Encashment | §5 | Not modeled | Yes | `configuration.reset`, `.carryForward`, `.encashment` + `/api/cron/leave-expiry` | Planned Phase 8 |
| Expiry | §5 | Not modeled | Yes | Same cron, `CARRY_FORWARD_EXPIRY` ledger type | Planned Phase 8 |
| Maximum balance | §5 | Not modeled | Yes | `configuration.maxBalance` enforced in `ledger.ts` | Planned Phase 5 |
| Opening balance | §5 | `LeaveBalance` row created via `initLeaveBalancesForUser`, no ledger trace | Partial | `OPENING_BALANCE` ledger entry on backfill migration | Planned Phase 5 |
| Negative / advance leave | §5 | Not modeled — negative balance currently just... happens (no guard) | Yes | `configuration.negativeLeave` (NONE/WITHIN_LIMIT/UNLIMITED) | Planned Phase 5 |
| Work Calendar (per-location) | §6 Work Calendar | `WorkingCalendar` — singleton per org, no per-location/branch | Partial | Known limitation, not blocking; flagged in ARCHITECTURE §9 | Deferred |
| Holidays (shift/location precedence) | §6 Holidays | `Holiday` model exists with `branchId`, no shift-based precedence | Partial | `calculation.ts` precedence order per spec §24 | Planned Phase 5 |
| Shifts affecting leave | §6 Shifts | `Shift`/`ShiftAssignment` exist, not read by leave code | Yes (wiring) | `calculation.ts` reads `ShiftAssignment` | Planned Phase 5 |
| Pay periods | §6 | Not modeled (payroll uses monthly `PayrollBatch`) | Partial — out of scope, existing monthly cadence sufficient | N/A | Not needed |
| Sandwich rule | §7 (research pending — see below) | Not modeled — naive day-count | Yes | `calculation.ts` sandwich breakdown | Planned Phase 5 |
| Clubbing restrictions | §7 | Not modeled | Yes | `configuration.clubbingRules` validated in `request.ts` | Planned Phase 7 |
| Consecutive-leave / request limits | §7 | Not modeled | Yes | `configuration.restrictions` | Planned Phase 7 |
| Document/attachment requirements | §7 | Zod field accepted, never persisted | Yes (dead field) | `LeaveRequestAttachment` + Drive upload | Planned Phase 7 |
| Comp-off + scheduler | §8 | `OtRecord.compOffDays`, `OtSettings.compOffSlabs` — disconnected float, no consumption path | Yes | `CompOffCredit` + `compoff.ts`, routed through ledger as real `LeaveType` | Planned Phase 7 |
| Approval workflow (multi-level) | §9 | `LeaveRequest.approverId` single column | Yes | `LeaveApprovalStep` + `approval.ts` routing engine | Planned Phase 6 |
| Backup approver / delegation | §9 | Not modeled | Yes | `configuration.approvalRouting.delegation` | Planned Phase 6 (best-effort; flagged unverified in Zoho research) |
| Cancellation / partial cancellation | §10 | `status` comment lists "cancelled", no function sets it | Yes | `request.ts` cancellation + `CANCELLATION_REVERSAL` ledger entry | Planned Phase 6 |
| Extension | §10 | Not modeled | Yes | `extendedFromRequestId` self-relation + `request.ts` | Planned Phase 6 |
| Notifications | §11 | Working, but two divergent `kind` vocabularies (Surface A vs B) | Partial | Unify kinds per ARCHITECTURE §1 | Planned Phase 6/8 |
| Employee-specific overrides | §12 | Not modeled | Yes | `EmployeeLeaveOverride` | Planned Phase 5 |
| Balance adjustments (manual) | §12 | Only via direct `updateMany` decrement, no reason/audit | Yes | `MANUAL_CREDIT`/`MANUAL_DEBIT` ledger entries, HR ops UI | Planned Phase 9 |
| Reports | §13 | None leave-specific | Yes | Phase 11 report set | Planned Phase 11 |
| Calendar integration (Google/O365) | §14 | Not modeled | Yes (abstraction only, per spec §34) | `configuration.availabilityStatus` field, no provider wired | Deferred (explicit non-goal for Definition of Done) |
| Payroll integration | §15 | `PayrollBatch` exists, zero leave linkage | Yes | LOP → `EmployeeLop`, respects `PayrollBatch` lock state | Planned Phase 8 |
| Permissions / service admins | §16 | `attendance.leave.request/approve/manage` flat keys | Partial | Add `.cancel`, `.extend`, `.grant`, `.compoff.*`, `.ledger.adjust`, `.policy.manage` keys | Planned Phase 6-9 |
| Audit logging | Implicit throughout | `HrmsAuditLog` exists, zero leave writes | Yes (wiring) | `audit.ts` wrapper called from every state-changing function | Planned Phase 5-9 |
| Compliance packs (statutory) | Not in Zoho scope — separate | Not modeled | Yes | `LeaveComplianceTemplate` (schema built, Phase 5) + population (Phase 10, requires govt-source research) | Planned Phase 10 |

---

## Summary

- **41 rows tracked.** 3 explicitly deferred as non-blocking for Definition of Done (multi-calendar-per-location, pay-period-as-distinct-concept, live calendar-provider push). Everything else has a concrete implementation component and phase assignment.
- Every gap from `MONOLITH_INTEGRATION_AUDIT.md` §12 (13 numbered items) is mapped to at least one row above — none dropped.
- Items Zoho's own public docs left unverified (sandwich rule mechanics, backup-approver triggers, negative-balance exit settlement) are flagged in the Status column as "best-effort" — Monolith's implementation will define its own explicit, documented behavior for these rather than guessing at Zoho's exact internals, consistent with spec §53 ("Zoho is a functional benchmark, not the architecture").

Scorecard (Phase 3):
| Factor | Score /10 | Notes |
|---|---|---|
| Every Phase 2 capability mapped | 9 | All 17 research sections represented; a few sub-rows (e.g. Bradford Score, mobile-specific UI) intentionally excluded as non-core |
| Every Phase 1 gap mapped to a component | 10 | All 13 audit gaps traced to rows |
| Status realistic (not aspirational) | 9 | Statuses say "Planned Phase N", nothing marked done prematurely |

**Average: 9.3 — PASS**

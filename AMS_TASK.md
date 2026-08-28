# AMS Completion — Task Tracker

> Scope: complete the Appraisal Management System in the monolith (`src/modules/ams`,
> `src/app/(dashboard)/ams`, `src/app/api/ams`). Reference: standalone repo
> `github.com/Hariprasad2120/Appraisal-Management-System`. Monolith design system only.
> Plan file: `~/.claude/plans/vectorized-seeking-catmull.md`.
> **Separate from `TASK.md`** (that tracks the concurrent CRM rate-acquisition program).

Last updated: 2026-08-28
Current phase: `Complete — code-complete, runtime pending migration`
Progress: `████████████ Phases 1–11 done (DB apply pending user)`
Whole-repo `npx tsc --noEmit`: 0 errors after Phases 1–11. AMS unit tests: 10 passing.

> ⚠️ **ACTION NEEDED FROM USER — Phase 2 migration not yet applied to the shared Neon DB.**
> `npx prisma migrate status` shows an *earlier* unapplied migration from the concurrent agent
> (`20260827173000_add_mona_persistence`). I did **not** run `migrate deploy` against the shared
> DB. Schema + generated client are updated locally; migration SQL is written at
> `prisma/migrations/20260828120000_ams_arrears_disagreement_datevote_settings/migration.sql`.
> When safe, run: `npx prisma migrate deploy` (applies mona + AMS migrations, additive only).
> Runtime testing of Phases 4–8 is blocked until this is applied; code can still be built.

---

## Phase tracker

| Phase | Title | Status | Notes |
| --- | --- | --- | --- |
| 0 | Audit & health baseline | Done | Gap ledger below. No code changes. |
| 1 | Fix Meeting Minutes (MoM) panel | Done | Role-scoped add form, submitted/pending chips, DONE + window notes, `closeMeeting` management-MoM gate (server + UI + audit). Lint clean. Employee ack deferred to Phase 8 (needs schema). Files: `src/modules/ams/service.ts` (`closeMeeting`), `src/app/(dashboard)/ams/appraisals/[id]/appraisal-detail.tsx` (`MeetingSection`, Close button). |
| 2 | Schema additions (1 migration) | Schema + client done; **DB apply pending user** | Added `ReviewerRatingReview`, `MeetingDateVote`, `AppraisalArrear`; new columns on `Appraisal` (`dateVotingDeadline`, `outcomeAckedAt/ById`), `AppraisalMeeting` (`dateVotingClosedAt`, `dateSource`), `OrgAppraisalSettings` (windows, buffers, toggles, gradeBands/hikeTable/escalationLadder JSON, digestDayOfWeek). New models relate to `AppraisalReviewer` (not `User`) to avoid the hot `User` model. `prisma validate` + `generate` OK. Migration SQL hand-written. |
| 3 | Consolidated Admin Appraisal Settings | Done | `/ams/settings` is now an editable form (timing windows, arrear buffer, reviewer weights, feature toggles, digest day, escalation ladder JSON) + linked-control cards. `settings.ts` rewritten (`getAppraisalSettings` / `upsertAppraisalSettings` + defaults + coercion). Hardcoded self-assessment + reviewer-rating windows in `service.ts` now read from settings. Permission: reused `ams.cycle.manage` (no seed change — avoids concurrent-agent conflict). Grade bands / hike table left as slab-page concern (slabs are already DB rows). Lint clean. Files: `src/modules/ams/settings.ts`, `src/app/(dashboard)/ams/settings/{page,settings-client,actions}.tsx`. |
| 4 | Rating disagreement + revised scores | Done (needs migration to run) | `submitReviewerRatingReview` (settings-gated, stage=MANAGEMENT_REVIEW, requires submitted rating; AGREE / OVERRATED / UNDERRATED + reason + revised per-criterion points; audit). `computeAppraisalScore` blends revised categoryPoints over the original when `useRevisedScores`. `notifyManagementReviewOpen` now also prompts pending reviewers (`RATING_REVIEW_OPEN`). New route `api/ams/appraisals/[id]/rating-review`. `getMyReviewView` exposes `ratingDisagreementEnabled` + `myRatingReview`. New `RatingAccuracyCard` on `/ams/my-reviews/[id]`. Lint clean. Deadline-forced MANAGEMENT_REVIEW path does not send the reviewer prompt (card still shows) — minor, revisit Phase 9. |
| 5 | Meeting date-voting + reschedule wiring | Done (needs migration to run) | `workflow.ts`: `DATE_VOTING` stage + transitions. `submitManagementReview` routes to `DATE_VOTING` (deadline set) when `enableDateVoting` & >1 proposed date, else `MEETING_PENDING` as before. New: `castMeetingDateVote`, `closeDateVoting` (winner = most votes, tie→earliest), `sweepDateVotingDeadlines` (added to daily job), `requestMeetingReschedule`, `decideMeetingReschedule` (updates `AppraisalMeeting.scheduledAt` + audit + notify). `getAppraisal` includes `dateVotes` + `meetingReschedules`; `getMyReviewView` exposes vote data. New routes `date-vote`, `reschedule`. New `DateVotingCard` + `RescheduleCard` on `/ams/appraisals/[id]`. Lint clean. Follow-up: dedicated vote card on `/ams/my-reviews/[id]` (reviewers can vote from the appraisal detail meanwhile); employee voting not supported (schema FKs `AppraisalReviewer`). |
| 6 | Arrears | Done (needs migration to run) | `src/modules/ams/arrears.ts` (ported math, buffer-configurable). `finaliseHike` raises an `AppraisalArrear` PENDING_APPROVAL when `meeting.scheduledAt > selfSubmittedAt + arrearBufferDays` (annualIncrement = hike amount); audit + notify approvers/payroll. `listArrears` + `decideArrear` (APPROVE → payrollMeta.arrears[] + payroll todo; REJECT; MARK_PAID → payrollRef). New `/ams/arrears` page + client + actions (perm: `ams.hike.finalise` / `ams.appraisal.view_all`). Nav + route-label added. Arrear card on `/ams/appraisals/[id]`. Cycle stage still goes CLOSED on hike (no strand); arrear tracked as a parallel child — deviates from reference's `isCycleOperationallyClosed`; acceptable, note. Lint + `tsc` clean. |
| 7 | Partner role view | Done | "Partner" = the existing **`Director`** role, which already holds `ams.appraisal.view_all` + `management_review` + `hike.finalise` + `meeting.minutes` (a management-tier participant, not a pure observer). No new role/perm needed. Fixed two access gaps: `/ams/appraisals` list page hard-gated on `assign_reviewers` → now also allows `view_all`; "Appraisals" nav item permission broadened to `["ams.appraisal.assign_reviewers","ams.appraisal.view_all"]`. Director already had History + Arrears access. Lint + `tsc` clean. |
| 8 | PDF letters + acknowledgement | Done (needs migration to run) | `src/modules/ams/pdf/{appraisal-letter-document,generate-letter}.tsx` — Outcome + Increment letters via `@react-pdf/renderer` (mirrors payroll pdf). Route `GET /api/ams/appraisals/[id]/letter?type=outcome|increment` (subject / HR reviewer / view_all / hike.finalise). `acknowledgeOutcome` service fn + `POST /api/ams/appraisals/[id]/acknowledge` (subject only) → sets `Appraisal.outcomeAckedAt/ById` + audit + notify HR. Detail page: PDF download links + acknowledge button / acked state in the Hike Decision card. Lint + `tsc` clean. |
| 9 | Escalation ladder + digest emails | Done | `escalateOverdueStages` — per overdue stage (availability / self-assessment / reviewer-rating / date-voting), fires each `settings.escalationLadder` step once (deduped via `AppraisalAuditLog` `ESCALATION:<stage>:<afterDays>:<target>` markers); target → REVIEWER (assigned) / TL / HR / ADMIN recipient sets; email for HR + ADMIN steps. `sendAppraisalDigest` — on `settings.digestDayOfWeek`, emails per-org `view_all` holders a stage-count summary. Both wired into `runAppraisalDailyJob`. Lint + `tsc` clean. |
| 10 | Analytics dashboard | Done | `src/modules/ams/analytics.ts` (`getAppraisalAnalytics`) — funnel, per-transition median/p90 turnaround (from `STAGE_TRANSITION` audit rows), grade mix, hike-% buckets, reviewer load + on-time, arrear incidence. `/ams/analytics` page (DS bars, no chart lib) gated `ams.appraisal.view_all`; nav + route-label added. CSV export deferred. Lint + `tsc` clean. |
| 11 | Polish & hardening | Done | `DATE_VOTING` added to every AMS stage colour/label map (appraisals list, appraisal detail, management-review, history, my-appraisal, my-reviews list + detail). Audit-log card now renders humanised `action` for non-transition events (arrear / escalation / ack / vote). New vitest: `src/modules/ams/__tests__/{arrears,workflow}.test.ts` — 10 passing (`npx vitest run --config vitest.unit.config.ts src/modules/ams/__tests__`). All Phase 1–11 files: eslint clean + `tsc` 0 errors. **Pre-existing** eslint errors remain in untouched AMS files (`slabs/actions.ts`, `slab-form.tsx`, `extensions/actions.ts`, `kpi-client.tsx`, `claim-management/route.ts`, `management-review-client.tsx` effect) — not introduced by this work. CSV export on `/ams/analytics` deferred. |

---

## Phase 0 — findings

### Current AMS pipeline (working)

`AppraisalSchedule` sync → due detection (`daily-job.ts` / `dueOnDate`) → `createAppraisalForEmployee`
→ `assignReviewers` → `setReviewerAvailability` → `maybeOpenSelfAssessment` → `submitSelfAssessment`
→ `submitReviewerRating` → (`advancePastDeadlineStages`) → `MANAGEMENT_REVIEW` →
`claimManagementReview` → `submitManagementReview` (with `proposedDates`) → `MEETING_PENDING` →
`confirmMeeting` → `MEETING_LIVE` (`startMeeting`) → `addMeetingMinute` → `closeMeeting` →
`HIKE_FINALISATION` → `finaliseHike` → `CLOSED`.

Also present: criteria editor + `AppraisalSelfTemplate`, increment slabs, extension requests
(`AppraisalExtensionRequest` + `/ams/extensions`), `MeetingReschedule` **model only**, department
KPI, history, fixed assets, `OrgAppraisalSettings` (2 fields), audit log on every mutation,
`getNow()` clock-aware time, notifications + Resend email via `src/lib/notify.ts`.

### Confirmed gaps / bugs

| # | Area | Detail | Phase |
| --- | --- | --- | --- |
| G1 | Arrears | No model / logic / UI. Reference: meeting > `bufferDays` after self-submit → arrear = `(annualIncrement / 365) × days`, approval flow, payroll row. | 6 |
| G2 | Rating disagreement | Reviewer accuracy self-eval + revised per-criterion scores missing. Only `changeReasons`/`previousCategoryPoints` plumbing exists inside `submitManagementReview`. | 4 |
| G3 | Date-voting | No reviewer vote on management-proposed meeting dates. `submitManagementReview` → `MEETING_PENDING` directly; HR picks in `confirmMeeting`. | 5 |
| G4 | MoM panel | `MeetingSection` (`appraisal-detail.tsx`) renders only in `MEETING_LIVE`; `meeting` null-safety gaps; weak per-role completion tracking; not shown read-only after close / in history; `closeMeeting` does not require a MANAGEMENT MoM. | 1 |
| G5 | Reschedule | `MeetingReschedule` model exists but no server action / API / UI wiring. | 5 |
| G6 | Config hardcoded | Self-assessment window `addBusinessDays(getNow(), 3)`, reviewer-rating window, arrear buffer, grade bands (`GRADE_BANDS`), hike table (`HIKE_TABLE`) all hardcoded. `OrgAppraisalSettings` only has `availabilityDeadlineDays` + `reviewerRoleWeights`. | 3 |
| G7 | Close semantics | `finaliseHike` sets `CLOSED` immediately. Reference: close only after MANAGEMENT MoM recorded AND arrear PAID/REJECTED/none. | 1 + 6 |
| G8 | Score blend | `computeAppraisalScore` fixed at `0.2·self + 0.7·reviewer + 0.1·management`; not settings-driven; ignores revised scores (G2). | 4 |
| G9 | PARTNER view | Reference `/partner` read-only surface. Monolith has no PARTNER role. | 7 (blocked) |

### Reusable pieces found

- **Payroll handoff pattern** (`finaliseHike`): writes `employmentRecord.payrollMeta.salaryRevisions[]`
  + `latestSalaryRevision` via `buildSalaryRevisionRow`, updates `ctc`, creates a `todoTask` for
  `hrms.salary.manage` holders. → mirror for arrear payout.
- **PDF**: `@react-pdf/renderer` v4; working patterns in `src/modules/payroll/pdf/*`
  (`generate-payslip.tsx`, `payslip-pdf-document.tsx`) and `src/modules/crm/pdf/*`.
- **Score helpers**: `normalizeScore`, `getGrade`, `GRADE_BANDS`, `HIKE_TABLE`, `getHikePercent`,
  `getSalaryTier` in `src/modules/ams/criteria-config.ts`.
- **Arrear math**: port `isArrearEligible` / `computeArrearPeriod` / `computeArrearAmount` from
  reference `src/lib/arrears.ts` (buffer = 7d, dailyRate = annualIncrement/365).
- **Cron**: `runAppraisalDailyJob` (`daily-job.ts`) + `/api/cron/appraisal-trigger` — extend for
  escalation + digest. `notifyStalePendingReviewers`, `advancePastDeadlineStages`,
  `openPastDeadlineAssessments` already there.
- **Notifications**: `notify` / `notifyMany` (`src/lib/notify.ts`), `getUsersWithPermission`
  (`src/modules/notifications/service.ts`), `email: true` → Resend.
- **Permission keys** (`prisma/seed.ts`): `ams.cycle.manage`, `ams.criteria.manage`,
  `ams.appraisal.{assign_reviewers,force_reviewer,self_assess,review,management_review,view_all}`,
  `ams.meeting.{confirm,minutes}`, `ams.hike.finalise`. New needed: `ams.settings.manage`,
  `ams.arrear.manage`, `ams.analytics.view` (+ maybe `ams.appraisal.view_partner`).
- **Nav**: `src/lib/navigation.ts` AMS group ~L414-513; labels in `src/lib/route-labels.ts` ~L24-33.

### Environment blockers (Phase 2 coordination)

- `git status`: only `src/styles/monolith-system.css` modified (concurrent agent).
- `npx prisma migrate status`: **1 unapplied migration** `20260827173000_add_mona_persistence`
  (concurrent agent). Shared Neon DB. → Do NOT run `prisma migrate dev` until this is resolved /
  the other agent is idle. Phase 2 must coordinate: either apply that migration first or add the
  AMS migration when safe. Confirm with user before touching the shared DB.

---

## Open items / needs decision

1. ~~PARTNER role~~ — **Resolved: "partner" = the `Director` role.** Phase 7 done (see table).
2. **Phase 2 migration timing** — needs a clean `prisma migrate status`. User will run
   `npx prisma migrate deploy` at the end when the concurrent agent is idle.

## To finish (user actions)

1. **Apply the migration** (when the concurrent agent is idle):
   `npx prisma migrate deploy` — applies `20260827173000_add_mona_persistence` (theirs) +
   `20260828120000_ams_arrears_disagreement_datevote_settings` (this work). Both additive.
2. **`npm run build`** — full Next build (this session verified `tsc --noEmit` = 0 and per-file
   eslint clean; pre-existing eslint errors in untouched AMS files may need `next.config`
   `eslint.ignoreDuringBuilds` or a separate cleanup — not caused by this work).
3. **Manual end-to-end walkthrough** with a frozen `SystemClock`
   (`src/lib/clock.ts` / `/ams/settings` has no freeze UI — use the admin simulation page):
   due → assign reviewers → availability → self-assessment → reviewer ratings →
   (toggle `enableRatingDisagreement` in `/ams/settings`, submit a rating review) →
   management review → (toggle `enableDateVoting`, cast votes, close voting) →
   HR confirm meeting → HR + Management MoM (Close blocked until Management MoM) →
   finalise hike → force a late meeting date to raise an arrear → `/ams/arrears` approve →
   mark paid → download outcome/increment letters → employee acknowledges →
   `/ams/analytics` shows the funnel + turnaround.
4. Run the daily job (`/api/cron/appraisal-trigger`) with the clock advanced past a deadline to
   see escalation notifications; set the clock to `digestDayOfWeek` for the digest email.

## Deferred / follow-ups

- Dedicated meeting date-vote card on `/ams/my-reviews/[id]` (reviewers can vote from the
  appraisal detail today).
- Employee voting on meeting dates (schema FKs `AppraisalReviewer`, so reviewers only for now).
- `/ams/analytics` CSV export.
- Cleanup of the pre-existing eslint errors in the older AMS files.
- Escalation prompt on the deadline-forced `MANAGEMENT_REVIEW` path (card still shows).

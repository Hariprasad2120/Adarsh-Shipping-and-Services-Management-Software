# CHA Module — Production Readiness Plan

Scope: the Customs House Agent module (`src/modules/cha/`, `src/app/(dashboard)/cha/*`)
covering jobs, document collection, additional data, checklist preparation, filing
workflows, approvals, customers, expenses, reports, settings, and Google Drive filing.

## 1. Current state (what exists)

- Job lifecycle: Document Collection → Additional Data (Vessel Inward Date, IGM, EGM,
  DO Validity) → Checklist Preparation → filing workflow stages, with DO-validity
  warnings in the persistent header.
- Drive integration with category folders, per-stage upload splitting, and self-heal
  fail-safe (recent commits `2262df2`…`33e3ba2`).
- RBAC permissions (`cha.job.read`, `cha.job.delete`, `cha.job.delete.approve`,
  `cha.checklist.internal_approve`, …) enforced via `requirePermission()`.
- Integration tests in `src/modules/cha/__tests__/cha.test.ts`.
- Approvals queue, customer management, expenses, reports pages.

## 2. Gaps to close for production

### P0 — must fix before go-live

1. **Migration history repair.** `prisma migrate dev` fails on
   `20260625110000_enhance_cha_filing_workflow` (shadow DB error). Production deploys
   need a clean `migrate deploy` path; `db push` is not auditable. Mark the migration
   resolved/rebaseline the history.
2. **Server-side validation on every CHA action.** Audit all server actions in
   `src/modules/cha/actions.ts` for: `requirePermission` on every mutation, org scoping
   (`orgId` from session, never from client), and Zod validation of all inputs
   (dates, IGM/EGM numbers, file metadata).
3. **File upload hardening.** Validate MIME type + extension allowlist and max size
   server-side (not just the raised body limit); reject executables; sanitize filenames
   before Drive upload; verify the Drive folder self-heal cannot write outside the org's
   root folder.
4. **Workflow-stage integrity.** Enforce stage transitions server-side (a job must not
   reach Checklist Preparation without complete Additional Data) — the UI gate alone is
   bypassable via direct action calls.
5. **Concurrency safety.** Two users editing the same job/checklist: add optimistic
   locking (`updatedAt` check) or last-write-wins warnings on job mutations and approval
   decisions; approvals must be idempotent (double-click / double-submit safe).

### P1 — production quality

6. **Audit trail for CHA actions.** Log who changed job stage, who approved/rejected a
   checklist, who uploaded/deleted documents (reuse the `SecurityEvent` pattern or a
   `ChaAuditLog`), and surface it on the job detail page.
7. **Drive failure handling.** Uploads must fail loudly with retry, queue-and-retry for
   Google API 5xx/quota errors, and an admin-visible "unsynced documents" report.
   Never mark a stage complete if the underlying upload failed.
8. **DO validity job.** The expiring-DO check (`/api/cha/do-validity/expiring`) should
   run as a scheduled cron with notification fan-out, not only on page load.
9. **Soft delete + recovery** for jobs and documents (delete-approval flow exists;
   ensure deleted data is recoverable for a retention window).
10. **Pagination & indexes.** Jobs/approvals/reports lists must paginate server-side;
    verify Prisma indexes on `(orgId, status)`, `(orgId, customerId)`, DO validity date.

### P2 — polish

11. Empty/loading/error states on all CHA pages; retry affordances.
12. Report exports (CSV/PDF) with org branding.
13. Customer portal visibility (read-only job status for customers) — future feature.
14. Bulk operations (bulk document download, bulk stage advance) with confirmation.

## 3. Security improvements (module + platform)

Done in this rebuild (platform-wide, benefits CHA):

- Isolated Monolith session cookies (`__Host-monolith.session-token` in prod), unique
  `AUTH_SECRET`, DB-backed session validation on every request, idle + absolute
  timeouts, login rate limiting, full audit logging, admin force-logout, revocation on
  password change / user disable / role change. See `docs/session-security.md`.

Remaining, CHA-specific:

- **IDOR sweep**: every `jobId`/`customerId`/`documentId` param must be checked against
  the caller's org (and branch where applicable) inside the service layer, not the page.
- **Drive OAuth scope minimization**: current Google scopes are broad (gmail.modify,
  full drive, chat). Filing only needs `drive.file`. Split the CHA service connection
  from the personal workspace connection where possible.
- **Encrypt stored Google tokens** (refresh tokens already encrypted via
  `workspace-oauth`; verify access tokens at rest and key rotation plan).
- **Least-privilege roles**: define CHA role bundles (Executive, Checklist Approver,
  Manager) in the seed so production users are never granted `admin.org.manage` for
  convenience.
- **Input size limits** on remarks/checklist free-text fields; strip HTML.
- **Rate-limit** document upload and report endpoints per user.

## 4. Test plan

### 4.1 Session/auth regression (automated — `src/lib/__tests__/session-security.test.ts`, 17 passing)

- No session → dashboard redirects to login (proxy + layout).
- Expired / idle-expired / revoked session → invalidated, redirect to login.
- Foreign/AMS cookie or unknown nonce → never authenticates.
- Disabled user's live session → blocked + `DISABLED_USER_ACCESS` audit event.
- Password change / role change / disable → all sessions revoked.
- Logout revokes DB session, purges Monolith + legacy cookies.
- Rate limiter locks after N failures per email+IP, resets on success/window expiry.
- Admin idle timeout shorter than user idle timeout.

### 4.2 Session/auth manual checks

- Login on two browsers → both visible at `/account/security`; revoke one → that
  browser bounced to login within one request.
- "Logout from all other devices" keeps current session only.
- Admin `/admin/sessions` Force logout → target bounced; event visible in log.
- Browser Back after logout shows no protected content (no-store headers).
- Run AMS + Monolith on localhost simultaneously → no cross-login either direction.
- Remember-me login survives browser restart but dies at the 7-day cap.

### 4.3 CHA functional test plan

**Job lifecycle**
- Create import + export jobs; verify stage = Document Collection.
- Attempt checklist import before Additional Data complete → blocked server-side.
- Complete Vessel Inward Date, IGM, EGM, DO Validity → Checklist Preparation unlocked.
- DO validity set to (a) past date, (b) +3 days, (c) +10 days → header warning shown
  for (a) and (b) only.

**Documents & Drive**
- Upload per category; verify correct Drive folder; delete folder in Drive manually →
  self-heal recreates on next upload.
- Oversized file, wrong MIME, empty file → rejected with clear error, stage not
  advanced.
- Drive API failure (revoke token in test env) → upload fails visibly, job not
  corrupted, retry succeeds after reconnect.

**Approvals & permissions**
- User without `cha.job.delete` cannot request deletion (UI hidden AND action rejected).
- Delete request → approver with `cha.job.delete.approve` sees it; double-approve is
  idempotent.
- Internal checklist approval respects `cha.checklist.internal_approve`.
- Cross-org probe: user from org B requests org A's jobId → 404/403, never data.

**Concurrency**
- Two sessions edit the same job simultaneously → no silent overwrite (conflict
  surfaced or last-write warning).
- Double-click approve/submit → single side-effect.

**Reports/expenses**
- Expense totals reconcile with entered line items across month boundaries (IST).
- Reports paginate; 1,000-job org loads under 3s.

### 4.4 Non-functional

- Load: 50 concurrent users listing jobs + uploading docs.
- Backup/restore drill on Neon branch; verify CHA data integrity after restore.
- Mobile layout pass on jobs list, job detail, approvals (per design.md Section 15).
- Light/dark theme audit on all CHA pages.

## 5. Suggested platform additions (observed from codebase)

- **Notifications digest**: unified daily digest (DO expiries, pending approvals,
  todo reminders) via the existing Google Chat/webhook plumbing.
- **MFA/passkeys**: finish `/admin/passkeys` into org-enforceable MFA using the
  `verifySecondFactor` hook now present in auth.
- **Session device map**: the security page already captures device + masked IP; add
  approximate geo (city-level) via a local GeoIP DB.
- **Org-level security settings page**: expose the session timeout envs as admin
  settings (SystemSetting table already used by `/admin/sessions`).
- **Background job runner**: several needs (DO expiry cron, Drive retry queue,
  digest emails) point to one shared queue/scheduler abstraction.
- **Customer-facing CHA status portal** (read-only job tracker per customer login).

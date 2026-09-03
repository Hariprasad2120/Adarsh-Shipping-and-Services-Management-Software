# PRODUCTION READINESS — Monolith (MNC scorecard)

> Objective assessment after Stage 2 platform work. Scores 0–5 with evidence.
> **Not inflated** — a capability scores high only where it is implemented,
> tested, and wired.

Scoring: 0 absent · 1 prototype · 2 partial · 3 works, gaps · 4 solid, minor gaps · 5 production-proven

| Area | Score | Evidence / gap |
|---|---|---|
| Security (baseline) | **4** | Stage 1 hardening intact + Stage 2 security clusters 6–13; `SECURITY_AUDIT_AFTER_STAGE1.md`. Gap: no independent pentest. |
| Authentication | **4** | Local + Google + MFA + passkeys + reset; server sessions. Gap: enterprise SSO (by design). |
| Authorization | **4** | Single centralised `Caps`/`rbac`; permission-keyed approval + custom-field gates. Gap: membership not yet the authz source. |
| Tenant isolation | **4** | `orgId` denormalised + `tenantWhere`/`assertSameOrg`; Stage 1 tests; Stage 2 services all tenant-scoped. Gap: no fresh cross-tenant pentest. |
| Organisation provisioning | **3** | `provisionOrganisation` + templates, idempotent, E2E-verified. Gap: no Setup Wizard UI; seed still company-specific. |
| Enterprise IAM | **3** | Membership model + lifecycle state machine; RBAC centralised. Gap: session/RBAC still on `User.orgId`; SSO/SCIM documented-only. |
| Auditability | **3** | Append-only `ConfigAuditEntry` + redaction + diff; `SecurityEvent`; 9 module audit logs. Gap: one Stage-2 service wired; `REVOKE UPDATE/DELETE` is a deploy step. |
| Data governance | **2** | Classification + retention docs; custom-field permissions; redaction. Gap: no retention-policy engine, no retention holds, no erasure flow. |
| Backup / DR | **1** | Mechanism + restore procedure + drill defined (`BACKUP_AND_DISASTER_RECOVERY.md`). Gap: **no drill has ever been run — recovery unverified.** |
| Observability | **3** | Correlation ids, structured JSON logger, metrics, `/health` + `/ready`; job runner instrumented. Gap: ~249 `console.*` unmigrated; call sites not instrumented; no collector wired. |
| Operations | **3** | `OPERATIONS_RUNBOOK.md`, `INCIDENT_RESPONSE.md`. Gap: on-call / escalation / notification timelines are deployment decisions; no job reaper. |
| Performance | **2** | Numbering proven under 100-way concurrency; `request-performance` instrumentation exists. Gap: no representative-volume load test (small/medium/large orgs) in Stage 2. |
| Scalability | **3** | Stateless web layer, DB sessions, `FOR UPDATE SKIP LOCKED` job claiming, org-scoped caches. Gap: multi-instance cache correctness relies on `revalidateTag`; not load-verified. |
| Reliability | **3** | Jobs: retry / backoff / dead-letter; idempotency primitive; additive migrations. Gap: primitives not yet wired into the risky module flows; no chaos/failure test suite. |
| Accessibility | **1** | Design system in migration (concurrent work). Gap: **no WCAG 2.2 AA audit performed.** |
| Localization | **3** | `OrganisationSettings` (currency/tz/locale/fiscal), neutral defaults, `formatMoney`/`formatDate`, i18n scaffold, shared-code locale lint. Gap: ~550 currency + ~578 `toLocale*` sites unmigrated; English-only catalogue. |
| API / integration architecture | **2** | Google Workspace + email + accounting inbox/outbox with idempotency. Gap: no integration registry, webhook platform, service accounts, or scoped API keys. |
| Code quality | **4** | `tsc` clean, `eslint` 0 errors every commit; `architecture:check` / `design-system:verify` tooling; core platform in `src/modules/core` with one-directional dependency rule. Gap: ~1145 `no-explicit-any` + hook-rule warnings backlog. |
| Testing | **3** | ~112 Stage-2 unit tests + 11 scripted E2E flows, all green. Gap: no per-module QC matrix, no browser matrix, no load test, partial failure testing. |
| Documentation | **4** | Stage 2 doc set (this file + 15 others) synchronised with code; `TASK.md` continuous. Gap: some docs are honest stubs pending implementation. |
| Deployment discipline | **3** | Additive expand/contract migrations with rollback SQL; documented release steps; small reviewable commits. Gap: no CI running the full gate; contract migrations un-exercised at volume. |

**Unweighted average ≈ 2.9 / 5.**

---

## Production blockers (must clear before "enterprise production")

1. **Backup restore never verified** — run the drill in `BACKUP_AND_DISASTER_RECOVERY.md`.
2. **No independent penetration test** — execute `PENTEST_SCOPE.md`.
3. **Per-module QC audit not performed** (spec §35).
4. **Accessibility not audited** against WCAG 2.2 AA (spec §27).
5. **No representative-volume performance test** (spec §20).
6. **Membership / RBAC still on `User.orgId`** — multi-org isolation not yet
   enforced through the new model.
7. **Config-audit table not yet write-protected** at the DB role level.
8. **CI does not run the full release gate** (spec §34) — lint/type/test/build
   are green locally but not enforced on every change.

## Not blockers (documented backlog, explicitly out of Stage 2 scope)

- Enterprise SSO (OIDC / Entra ID / SAML), SCIM 2.0 — architecture paths in
  `IDENTITY_ARCHITECTURE.md`.
- Service accounts, scoped API keys, outbound webhook platform —
  `INTEGRATION_ARCHITECTURE.md` / `API_SECURITY.md`.
- Full currency / locale call-site migration — mechanism is in place.
- Organisation Setup Wizard UI — provisioning service is the engine.

## Recommendation

See `MONOLITH_ENTERPRISE_READINESS_REPORT.md` §24.

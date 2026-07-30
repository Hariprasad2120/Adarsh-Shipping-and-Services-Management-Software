# Accounting Phase 7 requirements traceability

Phase 7 is rollout preparation only. “Implemented” means a guarded contract,
evidence evaluator, synthetic rehearsal, test, or disabled runbook exists; it
does not mean production authorization.

| Requirement | Implementation | Verification |
|---|---|---|
| Independent Phase 6 verification | `phase-7-rollout-readiness.md` and unchanged Phase 6 boundaries | Phase 6 focused tests plus Phase 7 architecture tests/static verifier |
| Policy-decision register | `policy-register.ts` and `accounting-phase7-policy-register.v1.json` | Missing/duplicate/unapproved decision tests |
| Production configuration contract | `production-configuration.ts` | Secret-free, port, fallback, provider, maker-checker, and execution-block tests |
| Guarded rehearsal | `rehearsal.ts` and `accounting-phase7-rehearsal.ts` | Dry-run, in-memory execution, interruption/resume/replay/mismatch tests |
| Rehearsal scenarios | 21-entry code catalogue and operational runbook | Six database-free command scenarios plus 15 named executable automated scenario tests |
| Volume profiles | Three bounded code profiles and readiness document | Record/concurrency limit tests and benchmark |
| Manifest integrity | `migration-manifest.ts` and synthetic manifest | Parser and mismatch tests |
| Backup/recovery | `backup-readiness.ts` and runbook checklist | Fail-closed missing-mechanism test |
| Deployment sequence | `operational-controls.ts` and runbook | Authorization-label catalogue validation |
| Cutover state machine | `cutover-state-machine.ts` | Transition evidence and Phase 7 forbidden-state tests |
| Go/no-go engine | `go-no-go.ts` and readiness script | Required-gate and critical no-go tests |
| Monitoring | 14-entry redacted monitor catalogue | Catalogue validation and static review |
| Alerts | 12 disconnected alert definitions | Catalogue validation and static review |
| Operational acceptance | Nine role checklists | Catalogue validation and runbook review |
| Security/adversarial verification | Configuration, manifest, rehearsal, Phase 6 security, and architecture controls | Phase 6 and Phase 7 focused/static tests |
| Performance certification | Medium bounded in-memory benchmark | `accounting:phase7:benchmark` |
| Rollback/forward fix | Eight-stage matrix | Catalogue validation and runbook review |
| Hypercare | Prepared runbook plan | Documentation review; not activated |
| Production smoke tests | Non-destructive future specification | Documentation review; not executed |
| Documentation | Readiness, operational runbook, contracts, traceability | Static required-artifact verifier |
| No live operation | Database/provider-free rollout modules and in-memory commands | Static import/SQL/network scan and command evidence |

## Security traceability

| Adversarial case | Evidence |
|---|---|
| Unauthorized rehearsal | Explicit synthetic execution proof and separate operator/checker guard |
| Production execution | Phase 6 `PRODUCTION_BLOCKED` plus Phase 7 unconditional execution-disabled result |
| Port 5432 | Declared and URL port rejection |
| Provider enablement | Disabled provider/outbound configuration contract and unchanged disabled adapter |
| Forged authorization | Stable references, complete chain, distinct identities, and Phase 7 unconditional block |
| Cross-tenant/entity | Source, mapping, repository, database constraint, and canonical target scope tests |
| Source overwrite across scope | Scope-bearing deterministic keys and database uniqueness/immutable evidence |
| Spreadsheet injection | `safeSpreadsheetCell` tests |
| Attachment traversal | Relative-path, MIME, size, hash, and scan-required tests |
| Arbitrary SQL | No SQL execution in rollout modules; static scan |
| Malicious serialization | Strict object/array/string/integer/hash parsing; no executable deserialization |
| Secret disclosure | Sensitive-key rejection, redaction, endpoint removal, and value-free config report |
| Client invokes internals | Static client import isolation for canonical, repository, rehearsal, config, and cutover |
| Posted facts edited | Immutable successful migration evidence and canonical reversal-only matrix |
| Maker self-approval | Separate operator/checker guard and existing canonical maker-checker tests |

## Evidence commands

All Node commands must run with
`NODE_OPTIONS=--max-old-space-size=8192`.

```text
npm run accounting:phase6:verify
npm run accounting:phase7:verify
npm run accounting:phase7:readiness
npm run accounting:phase7:rehearsal
npm run accounting:phase7:benchmark
npm run accounting:phase7:safety-scan
npx vitest run <focused Phase 2-7 files>
npx tsc --noEmit
npx eslint <affected files>
npx prisma format --check
npx prisma validate
npm run build
git diff --check
```

Database commands are not part of Phase 7 validation because this task does
not authorize database access or modification. Production smoke tests,
provider activation, backup creation/restoration, real-source extraction, and
production cutover are explicitly not executed.

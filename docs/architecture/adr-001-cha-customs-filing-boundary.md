# ADR 001: CHA customs filing boundary

## Status

Accepted for Phase 1.

## Context

The screenshots supplied for customs masters and import/export filing describe
field coverage and workflow intent, but they come from a different visual system.
The current application already owns CHA work through `ChaJob`, existing
document/checklist/filing workflow models, RBAC, audit records, and the
Monolith workspace shell.

Phase 1 must create a safe implementation boundary without adding production
forms, Prisma domain tables, public routes, or ICEGATE network calls.

## Decision

`ChaJob` remains the aggregate root. Import and export filing data will extend an
existing CHA job because filing is operationally scoped to the job number,
customer, assignment, documents, checklist, expenses, audit trail, and branch
numbering already present in the aggregate.

Import and export data are job extensions, not standalone job replacements.
Current `ChaFiling` summary fields remain the compatibility layer for BE/SB
references, while later filing tables can add draft rows, snapshots, generated
artifacts, and submission attempts under the same job.

Customs masters are shared, versioned reference data. Future master records must
preserve source/import metadata and effective versions so a filing can snapshot
the exact code, rate, formula, and description used at save/generate time.

ICEGATE is behind an adapter and separate live-submission flag. Integration
availability and live submission are distinct risks: test/manual artifact
generation can exist without production submission, while live submission must
wait for verified contracts, credentials, signing flow, and subscription scope.

Screenshots are functional references only. Production UI must use the Monolith
design system and canonical components rather than copying the ZEALIT visual
style.

## Consequences

Customs code lives under `src/modules/cha/customs`, while `src/app` remains
route composition only. Navigation and routes stay hidden while Phase 1 flags are
disabled. The permission catalogue can expose future capabilities to role admin
screens, but the new permissions are not granted to system roles until explicitly
assigned.


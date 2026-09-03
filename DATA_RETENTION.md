# DATA RETENTION & DELETION — Monolith

> Configurable mechanisms and their current state. This document makes **no**
> legal claim about how long any jurisdiction requires data to be kept — those
> are organisation legal / compliance decisions.

## Lifecycle states

| State | Meaning | Mechanism today |
|---|---|---|
| **Active** | In normal use | default |
| **Deactivated** | Access removed, data intact | `OrganisationMembership.status = DEACTIVATED`; `User.active = false` |
| **Archived** | Retained for reference, not operational | `OrganisationMembership.status = ARCHIVED` (terminal) |
| **Soft-deleted** | Hidden, recoverable | per-model `active` / status flags (not uniform across the schema) |
| **Hard-deleted** | Removed permanently | Prisma `delete` + FK cascade; used only where safe (e.g. numbering test rows, custom-field defs with no values) |
| **Legal / retention hold** | Deletion blocked regardless of policy | **NOT IMPLEMENTED** — needs a `RetentionHold` marker checked before any delete |

## What is configurable now

- `Organisation.crmCallRetentionDays` (default 90) — CRM call recording retention.
- `IdempotencyKey.expiresAt` + `purgeExpiredIdempotencyKeys()`.
- `NumberingSequence` / audit tables have no automatic pruning.

## What needs configuration mechanisms (spec §13 / §33) — PENDING

- Per-org policy for: document retention, audit retention, terminated-user data,
  export, deletion, archival.
- A `RetentionPolicy(orgId, targetType, action, afterDays)` model + a scheduled
  `BackgroundJob` that applies it (archive / soft-delete / hard-delete).
- Retention-hold enforcement in every hard-delete path.

## Terminated-user data

- Deactivating a member stops access but **preserves** their historical business
  and audit records (approvals raised, journal entries, documents authored).
  Business records are never deleted because an employee leaves.
- A "delete my personal data" flow (right-to-erasure) is **not implemented**;
  it would need to distinguish erasable PII from records under legal / financial
  retention.

## Audit-trail retention

- `ConfigAuditEntry`, `SecurityEvent`, and module audit logs are append-only and
  currently retained indefinitely.
- **Deployment decision:** archival to cold storage / SIEM and a retention window
  are infrastructure choices (`BACKUP_AND_DISASTER_RECOVERY.md`).

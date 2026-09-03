# SECURITY INCIDENT RESPONSE — Monolith

> Process, not certification. This document does not by itself provide ISO / SOC
> attestation.

## Phases

**Detect → Contain → Eradicate → Recover → Review** for every incident.

## Signals

- `SecurityEvent` stream (auth failures, MFA events, session anomalies, OAuth).
- `ConfigAuditEntry` (unexpected config / policy / role changes).
- `/api/ready` failures, error-rate / latency metrics (`snapshot()`).
- Structured logs filtered by `correlationId`.

## Playbooks

### Suspected account compromise / stolen session
1. Contain: `revokeAllSessionsForUser` (or `revokeSessionById`); set the
   membership `SUSPENDED`.
2. Eradicate: force password reset, re-enrol MFA, review `SecurityEvent` for the
   account and its `correlationId`s.
3. Recover: restore access after verification; require MFA.
4. Review: check `ConfigAuditEntry` for changes the account made while compromised.

### Exposed API secret / integration credential
1. Contain: revoke / rotate the secret at the provider immediately.
2. Eradicate: rotate the stored value; it is write-only in the UI, so confirm no
   copy leaked via logs (redaction should have prevented this).
3. Recover: re-establish the integration with the new secret.
4. Review: add the key pattern to the redaction list if it slipped through.

### Leaked database credentials
1. Contain: rotate the DB password / connection string; redeploy.
2. Eradicate: review DB audit / provider access logs for the exposure window.
3. Recover: confirm `/api/ready` green post-rotation.
4. Review: move the credential into the sealed secrets manager if it was not.

### Cross-tenant data exposure
1. Contain: identify the code path (a query missing `tenantWhere` /
   `assertSameOrg`); hotfix or disable the route.
2. Eradicate: add the tenant guard; add a regression test.
3. Recover: assess which orgs were affected; notify per the org's obligations.
4. Review: sweep sibling routes for the same pattern.

### Malicious administrator
- Ordinary admins cannot rewrite `ConfigAuditEntry` (append-only; deployment
  should `REVOKE UPDATE/DELETE` on the table from the app role).
- Review the actor's `ConfigAuditEntry` + `SecurityEvent` history; suspend the
  membership; rotate any secrets they could have read.

### Ransomware / storage incident
- Follow `BACKUP_AND_DISASTER_RECOVERY.md` restore procedure.
- Do not pay; restore from the last verified backup; rotate all secrets.

### Dependency vulnerability
- See `DEPENDENCY_REMEDIATION.md` and the CI dependency / SCA gate
  (`PRODUCTION_READINESS.md` §CI).

## Roles & escalation

- **Deployment decision:** on-call rotation, escalation contacts, communication
  templates, regulator / customer notification timelines. Record them here per
  deployment.

## Evidence preservation

- Do not delete `SecurityEvent` / `ConfigAuditEntry` / logs during an incident.
- Snapshot the database (provider) before any remediation that mutates data.

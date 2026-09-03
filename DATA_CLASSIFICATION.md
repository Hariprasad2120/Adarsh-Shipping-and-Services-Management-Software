# DATA CLASSIFICATION — Monolith

> Handling expectations by sensitivity. Not every column is classified — this
> identifies the categories that need controlled handling.

| Class | Meaning | Examples in Monolith | Handling |
|---|---|---|---|
| **Restricted** | Compromise causes direct harm; secrets | password hashes, MFA/TOTP secrets, passkey material, password-reset tokens, OAuth tokens, integration secrets, session tokens, `SETUP_SECRET` / `CRON_SECRET` | Never logged, never returned to a UI after creation. Hashed / encrypted at rest where possible. Redacted by `logger` and `config-audit`. Access is code-path-limited. |
| **Confidential** | Business-sensitive PII / financial | payroll & salary data, bank account / IFSC / PAN / Aadhaar / UAN, employee documents, financial ledgers, customer contracts, pricing | Permission-gated (`hrms.salary.*`, `accounting.*`). Tenant-isolated. Custom fields holding these should set `readPermission` / `writePermission`. Export requires permission + audit event. |
| **Internal** | Not public, low individual harm | employee directory, org structure, job / task data, most CRM records, module configuration | Authenticated + tenant-scoped access. Config changes recorded in `ConfigAuditEntry`. |
| **Public** | Safe to disclose | `/api/health` output, org display name / logo on shared documents | No special handling; still no infra detail in health/ready. |

## Sensitive categories — where they live

- **Authentication secrets:** `User.passwordHash`, `mfa*` tables, `passkey*`,
  `password-reset-token`, `UserSession.token` (hashed refs in logs).
- **PII:** `User` personal fields (dob, aadhaar, pan, personalPhone, bank*),
  `EmployeeHrmsProfile.data`, customer / contact records.
- **Payroll / financial:** `PayrollBatch`, `Payroll*`, `Accounting*`,
  `CrmInvoice`.
- **Credentials / API secrets:** integration config, `GoogleWorkspaceConnection`,
  future `ServiceAccount` / API keys.
- **Confidential documents:** uploaded files (employee docs, job documents,
  accounting attachments).

## Controls

- Redaction: `logger` (`src/modules/core/observability/logger.ts`) and
  `config-audit` (`src/modules/core/config-audit/redact.ts`) scrub sensitive
  key names at any depth.
- Custom fields: `visibility` (`VISIBLE|HIDDEN|READONLY`) +
  `readPermission` / `writePermission`; values are validated, never executed.
- Tenant isolation applies to every class above Public.
- **Deployment decision:** encryption-at-rest for the database and object store,
  and field-level encryption for the Restricted set beyond what the app already
  hashes, are infrastructure choices — see `DEPLOYMENT.md`.
